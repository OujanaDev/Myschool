import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

// Facts only the publisher can give: fill them in before going live (the bracketed values show as is on the page).
const PUBLISHER = {
  company: "[Raison sociale de l'éditeur]",
  legalForm: "[forme juridique, ex. SARL de droit marocain]",
  address: "[adresse du siège social]",
  registry: "[ville et numéro du Registre du Commerce]",
  cndp: "[numéro du récépissé de déclaration ou de l'autorisation CNDP]",
  email: "[adresse e-mail de contact, ex. confidentialite@votre-domaine.ma]",
  host: "[nom de l'hébergeur et pays du centre de données]",
};
const UPDATED = "27 octobre 2026";

const SECTIONS = [
  ["donnees", "Données personnelles"],
  ["personnes", "Personnes concernées"],
  ["collecte", "Données collectées et finalités"],
  ["bases", "Bases légales"],
  ["mineurs", "Élèves mineurs"],
  ["destinataires", "Destinataires des données"],
  ["conservation", "Durées de conservation"],
  ["droits", "Vos droits"],
  ["securite", "Sécurité"],
  ["contact", "Contact"],
  ["modifications", "Modifications"],
] as const;

export default function PrivacyPage() {
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-3xl">
        <span className="badge bg-brand-50 text-brand-800">
          <ShieldCheck className="h-3.5 w-3.5" /> Vos données
        </span>
        <div className="prose-lesson">
          <h1>Politique de confidentialité</h1>
          <p className="text-sm text-muted">Dernière mise à jour : {UPDATED}</p>

          <nav aria-label="Sommaire" className="card my-8 p-5 text-sm">
            <p className="mb-2 font-semibold text-ink">Sommaire</p>
            <ol className="my-0!">
              {SECTIONS.map(([id, title]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-brand-700 hover:underline">
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <h2>Préambule</h2>
          <p>
            Myschool est une plateforme éducative (site web et applications Android et iOS) éditée par {PUBLISHER.company},{" "}
            {PUBLISHER.legalForm}, dont le siège social est situé {PUBLISHER.address}, immatriculée au Registre du
            Commerce de {PUBLISHER.registry} (ci-après « Myschool » ou « nous »), responsable du traitement de vos
            données personnelles.
          </p>
          <p>Cette politique :</p>
          <ul>
            <li>couvre les données personnelles que nous collectons par notre site et nos applications mobiles ;</li>
            <li>explique comment nous les utilisons et les protégeons ;</li>
            <li>vous indique comment exercer vos droits d'accès, de rectification, d'opposition et de suppression.</li>
          </ul>
          <p>
            Elle s'applique dans le respect de la loi n° 09-08 relative à la protection des personnes physiques à l'égard
            du traitement des données à caractère personnel. Ce traitement a été déclaré à la Commission nationale de
            contrôle de la protection des données à caractère personnel (CNDP) sous le numéro {PUBLISHER.cndp}.
          </p>

          <h2 id="donnees">1. Données personnelles</h2>
          <p>
            Est une donnée personnelle toute information qui permet de vous identifier, directement ou indirectement. Nous
            ne collectons que les données utiles au fonctionnement de Myschool et nous ne les vendons jamais.
          </p>

          <h2 id="personnes">2. Personnes concernées</h2>
          <ul>
            <li>les visiteurs du site et des applications, avec ou sans compte ;</li>
            <li>les élèves et étudiants qui créent un compte, y compris les élèves mineurs (voir la section 5) ;</li>
            <li>les parents ou représentants légaux qui nous contactent pour un élève.</li>
          </ul>

          <h2 id="collecte">3. Données collectées et finalités</h2>
          <h3>3.1. Données que vous nous fournissez</h3>
          <ul>
            <li>votre nom et votre adresse e-mail ;</li>
            <li>votre mot de passe, que nous ne conservons que sous forme chiffrée irréversible (haché) ;</li>
            <li>votre niveau scolaire (par exemple 2ème Bac Sciences Physiques) ;</li>
            <li>
              si vous créez un plan de révision : votre objectif, la date de votre examen, vos heures disponibles et les
              matières choisies.
            </li>
          </ul>
          <p>
            <strong>Finalités :</strong> créer et gérer votre compte, vous proposer les contenus de votre niveau, générer
            votre plan de révision et répondre à vos demandes.
          </p>

          <h3>3.2. Données liées à votre utilisation</h3>
          <ul>
            <li>les cours que vous marquez comme terminés et ceux que vous ajoutez à vos favoris ;</li>
            <li>vos réponses et vos scores aux QCM, avec leur date ;</li>
            <li>votre formule (gratuite ou Premium) et sa date d'échéance.</li>
          </ul>
          <p>
            <strong>Finalités :</strong> afficher votre progression et votre tableau de bord, vous recommander les
            matières à renforcer, donner accès aux contenus Premium et améliorer nos cours et nos QCM à partir de
            statistiques globales.
          </p>

          <h3>3.3. Données techniques</h3>
          <p>
            Pour vous garder connecté, un jeton de connexion est enregistré sur votre appareil : dans le stockage local du
            navigateur sur le site, et dans le stockage sécurisé du téléphone dans l'application. Il est supprimé quand
            vous vous déconnectez.
          </p>
          <p>
            Comme tout service en ligne, notre hébergeur et notre prestataire de réseau et de sécurité traitent votre
            adresse IP et des informations techniques (type de navigateur ou d'appareil) pour acheminer les pages et
            protéger le service contre les attaques.
          </p>
          <p>
            <strong>Finalités :</strong> faire fonctionner le service, le sécuriser et bloquer les usages abusifs.
          </p>

          <h3>3.4. Cookies</h3>
          <p>
            Myschool n'utilise ni cookie publicitaire, ni outil de mesure d'audience, ni traceur de réseau social. Seuls des
            cookies techniques de sécurité peuvent être déposés par notre prestataire de réseau pour distinguer les
            visiteurs des robots malveillants. Ils sont indispensables et ne servent à aucun suivi.
          </p>

          <h3>3.5. Paiement</h3>
          <p>
            Les paiements de l'abonnement Premium sont traités par un prestataire de paiement agréé. Myschool ne reçoit ni
            ne conserve vos données de carte bancaire : nous ne recevons que la confirmation du paiement et la formule
            choisie.
          </p>

          <h3>3.6. Ce que nous ne collectons pas</h3>
          <p>
            Nous ne collectons ni votre localisation, ni vos contacts, ni vos photos, et nous ne faisons pas de profilage
            publicitaire.
          </p>

          <h2 id="bases">4. Bases légales</h2>
          <ul>
            <li>
              <strong>votre consentement</strong>, donné lors de la création de votre compte ou, pour un élève mineur, par
              son représentant légal ;
            </li>
            <li>
              <strong>l'exécution du service</strong> que vous utilisez (accès aux cours, QCM, suivi, abonnement) ;
            </li>
            <li>
              <strong>notre intérêt légitime</strong> à sécuriser et à améliorer la plateforme ;
            </li>
            <li>
              <strong>nos obligations légales</strong>, notamment comptables pour les abonnements payants.
            </li>
          </ul>

          <h2 id="mineurs">5. Élèves mineurs</h2>
          <p>
            Myschool s'adresse aussi aux élèves du primaire, du collège et du lycée. Un élève mineur doit obtenir l'accord
            de ses parents ou de son représentant légal avant de créer un compte. Nous ne demandons aux élèves que les
            données strictement nécessaires, nous ne leur montrons aucune publicité et nous n'utilisons pas leurs données à
            des fins commerciales.
          </p>
          <p>
            Un parent ou représentant légal peut exercer à tout moment les droits de l'élève (accès, rectification,
            suppression du compte) en nous écrivant à l'adresse indiquée dans la section « Contact ».
          </p>

          <h2 id="destinataires">6. Destinataires des données</h2>
          <p>Vos données ne sont accessibles qu'aux personnes qui en ont besoin :</p>
          <ul>
            <li>l'équipe Myschool habilitée (support, administration de la plateforme) ;</li>
            <li>notre hébergeur : {PUBLISHER.host} ;</li>
            <li>notre prestataire de réseau et de sécurité, qui protège le site et accélère son affichage ;</li>
            <li>notre prestataire de paiement, pour les abonnements Premium ;</li>
            <li>les autorités administratives ou judiciaires, uniquement lorsque la loi nous y oblige.</li>
          </ul>
          <p>
            Nos prestataires n'agissent que sur nos instructions et doivent protéger vos données. Lorsque certaines données
            sont hébergées hors du Maroc, ce transfert se fait vers des pays assurant un niveau de protection suffisant
            ou avec les autorisations prévues par la loi n° 09-08.
          </p>

          <h2 id="conservation">7. Durées de conservation</h2>
          <ul>
            <li>
              les données de votre compte et votre progression sont conservées tant que votre compte est actif ;
            </li>
            <li>
              lorsque vous demandez la suppression de votre compte, vos données sont effacées sous 30 jours, sauf celles
              que la loi nous oblige à garder (par exemple les factures des abonnements payants) ;
            </li>
            <li>
              les journaux techniques de sécurité ne sont gardés que le temps nécessaire à la protection du service.
            </li>
          </ul>

          <h2 id="droits">8. Vos droits</h2>
          <p>Conformément à la loi n° 09-08, vous disposez :</p>
          <ul>
            <li>du droit d'accès aux données que nous détenons sur vous ;</li>
            <li>du droit de rectification : vous pouvez aussi modifier votre nom et votre niveau depuis votre profil ;</li>
            <li>du droit d'opposition au traitement de vos données pour des motifs légitimes ;</li>
            <li>du droit de demander la suppression de votre compte et de vos données ;</li>
            <li>du droit de retirer votre consentement à tout moment.</li>
          </ul>
          <p>
            Pour exercer ces droits, écrivez-nous à {PUBLISHER.email} depuis l'adresse e-mail de votre compte. Si vous
            estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNDP (www.cndp.ma).
          </p>

          <h2 id="securite">9. Sécurité</h2>
          <p>
            Les échanges avec Myschool sont chiffrés (HTTPS), les mots de passe sont hachés, l'accès à l'administration est
            réservé aux personnes habilitées et la base de données est sauvegardée régulièrement. Vous êtes responsable de
            la confidentialité de votre mot de passe : ne le communiquez à personne.
          </p>

          <h2 id="contact">10. Contact</h2>
          <p>
            Pour toute question sur cette politique ou sur vos données : {PUBLISHER.email}, ou par courrier à{" "}
            {PUBLISHER.company}, {PUBLISHER.address}.
          </p>

          <h2 id="modifications">11. Modifications</h2>
          <p>
            Nous pouvons modifier cette politique, par exemple quand nous ajoutons un service. La date de dernière mise à
            jour figure en haut de la page ; en cas de changement important, nous vous en informerons sur la plateforme ou
            par e-mail.
          </p>

          <p className="mt-10 text-sm">
            <Link to="/" className="font-semibold text-brand-700 hover:underline">
              ← Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
