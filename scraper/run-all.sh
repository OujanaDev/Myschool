#!/usr/bin/env bash
# Reformule tous les cours prêts par lots de 10 (les documents identiques à un cours déjà reformulé le réutilisent)
# et publie chaque lot complet : les labos interactifs des cours scientifiques sont ajoutés avant la mise en ligne,
# les titres numérotés et les QCM des nouveaux chapitres juste après. Les labos des cours publiés avant d'en avoir
# (et des copies d'un cours dans les autres filières) sont rattrapés régulièrement. Continue jusqu'à épuisement des
# sources ; tant que le téléchargement AlloSchool tourne, attend ses nouveaux documents au lieu de s'arrêter.
# Relancer le script reprend là où il s'est arrêté (il publie d'abord ce qu'un passage interrompu a laissé prêt).
#
#   bash run-all.sh [options de reformulate, ex. --level 2bac-pc --subject physique-chimie]
#
# Variables : MYSCHOOL_ADMIN_PASSWORD (obligatoire), BATCH (10), MODEL (sonnet), CONCURRENCY (2),
#             WAIT (1800 s entre deux vérifications quand il n'y a plus rien à faire), POLISH_EVERY (rattrapage des
#             labos tous les 2 lots), LABS_MAX (30 cours rattrapés par passage)
set -u
cd "$(dirname "$0")"
: "${MYSCHOOL_ADMIN_PASSWORD:?définissez MYSCHOOL_ADMIN_PASSWORD}"
BATCH="${BATCH:-10}"
MODEL="${MODEL:-sonnet}"
CONCURRENCY="${CONCURRENCY:-2}"
WAIT="${WAIT:-1800}"
POLISH_EVERY="${POLISH_EVERY:-2}"

publish() { node src/import.mjs --site final --publish --password "$MYSCHOOL_ADMIN_PASSWORD" 2>&1 | grep -E "✓|✗|Terminé"; }
# A batch goes online complete: labs for its science courses first, then the lessons, their numbered titles
# ("<chapitre> cours n") and a QCM for each chapter that has none.
finish_batch() {
  node src/labs.mjs --unpublished --model "$MODEL" 2>&1 | grep -E "✓|✗|Terminé"
  publish
  node src/number-titles.mjs --password "$MYSCHOOL_ADMIN_PASSWORD" 2>&1 | grep -E "✗|Terminé"
  # Chapters written differently by a new import are merged, and the seed placeholders they replace unpublished.
  node src/clean-chapters.mjs --apply --password "$MYSCHOOL_ADMIN_PASSWORD" 2>&1 | grep -E "^.{8} [=≈!]|Terminé"
  node src/qcm.mjs --model "$MODEL" --password "$MYSCHOOL_ADMIN_PASSWORD" 2>&1 | grep -E "✓|✗|!|Terminé"
}
# Catch-up: labs for the science courses published without them, republished with the copies that got them too.
# Skipped while another catch-up pass runs (labs.mjs is single-instance).
polish() {
  node src/labs.mjs --model "$MODEL" --max "${LABS_MAX:-30}" 2>&1 | grep -E "✗|Terminé|déjà en cours"
  node src/import.mjs --site final --publish --changed --password "$MYSCHOOL_ADMIN_PASSWORD" 2>&1 | grep -E "✗|Terminé"
}
downloading() {
  powershell -NoProfile -Command "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object CommandLine -match 'alloschool.mjs download').Count" 2>/dev/null | grep -q '^[1-9]'
}

finish_batch
batches=0
empty=0
while true; do
  out="$(node src/reformulate.mjs --max "$BATCH" --model "$MODEL" --concurrency "$CONCURRENCY" "$@" 2>&1)"
  echo "$out"
  if echo "$out" | grep -qE 'reformulate déjà en cours'; then sleep 300; continue; fi
  # Claude Code login expired: nothing is lost, wait for it to come back (`claude` then /login) instead of stopping.
  # What is ready goes online now; its labs come with the catch-up.
  if echo "$out" | grep -qE 'arrêt : claude : .*(authenticat|log ?in|OAuth)'; then
    publish
    echo "== Claude CLI non connecté (lancez \`claude\` puis /login) : nouvel essai dans $((WAIT / 60)) min."
    sleep "$WAIT"
    continue
  fi
  finish_batch
  batches=$((batches + 1))
  # nothing left to do: wait for the download to bring new documents, or stop
  if echo "$out" | grep -qE ' 0 document\(s\) à reformuler'; then
    polish
    if downloading; then
      echo "== Plus rien à reformuler pour l'instant, le téléchargement continue : nouvel essai dans $((WAIT / 60)) min."
      sleep "$WAIT"
      continue
    fi
    echo "== Toutes les sources sont traitées."
    break
  fi
  # nothing produced three batches in a row: persistent failures (the usage limit is waited for by reformulate.mjs;
  # unreadable PDFs are rejected without a model call and do not count)
  if echo "$out" | grep -qE 'Terminé : [1-9][0-9]* cours produit'; then
    empty=0
  elif echo "$out" | grep -E '✗' | grep -qv 'texte source illisible'; then
    empty=$((empty + 1))
  fi
  if [ "$empty" -ge 3 ]; then echo "== Aucun cours produit dans les 3 derniers lots : arrêt. Relancez plus tard."; polish; break; fi
  if [ $((batches % POLISH_EVERY)) -eq 0 ]; then polish; fi
done
