#!/usr/bin/env bash
# Lance run-all.sh détaché de la session VS Code, limité aux filières en cours de publication.
#   powershell -NoProfile -Command "Start-Process 'C:\Program Files\Git\bin\bash.exe' -ArgumentList 'C:\Myschool\scraper\start-run-all.sh' -WindowStyle Hidden"
cd "$(dirname "$0")"
export MYSCHOOL_ADMIN_PASSWORD="${MYSCHOOL_ADMIN_PASSWORD:-Admin1234!}"
COURSE='^Lycée / (Tronc Commun / Sciences|1ère Bac / Sciences Expérimentales) /'
exec bash run-all.sh --course "$COURSE" >> repository/run-all.log 2>&1
