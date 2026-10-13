# TrailStrong — étapes à faire sur le PC

Liste à suivre une par une avec Claude (« on reprend le guide PC »).
Cocher `[x]` au fur et à mesure. Aucune de ces valeurs n'est secrète, sauf mention contraire.

## A. Comptes multi-utilisateurs (Firebase)

- [ ] **1. Créer le projet Firebase** — https://console.firebase.google.com → « Créer un projet ».
  Choisir de préférence le **projet Google Cloud existant** (celui des bots / RunAgent) dans la liste
  sous le champ du nom : l'identifiant Google de connexion y est déjà, rien à copier. Désactiver Analytics.
- [ ] **2. Activer la connexion Google** — Authentication → Commencer → Mode de connexion → Google → activer.
  - Si le projet est différent de celui du client OAuth : « ID client de projets externes » → coller `GOOGLE_CLIENT_ID`
    (Google Cloud → API et services → Identifiants → ID clients OAuth 2.0).
  - Authentication → Paramètres → Domaines autorisés → ajouter `shadowxsio.github.io`.
- [ ] **3. Créer la base Firestore** — Firestore Database → Créer → `northamerica-northeast1` (Montréal) → mode production.
- [ ] **4. Règles de sécurité** — Firestore → Règles → remplacer par le contenu de
  [`trailstrong-src/firestore.rules`](../trailstrong-src/firestore.rules) → Publier.
- [ ] **5. Configuration web** — ⚙️ Paramètres du projet → Vos applications → `</>` → nom « TrailStrong » (sans Hosting).
  Copier le bloc `firebaseConfig` et **l'envoyer à Claude** (il l'intègre et redéploie),
  ou créer les variables GitHub `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`.

## B. Anti-bots et protection de Firebase

- [ ] **6. App Check (reCAPTCHA Enterprise)** — Firebase → App Check → Applications → l'app web → reCAPTCHA Enterprise
  → créer une clé (domaine `shadowxsio.github.io`). Envoyer la **clé de site** à Claude
  (ou variable GitHub `RECAPTCHA_SITE_KEY`). Laisser en mode « surveillance » quelques jours.
- [ ] **7. Restreindre la clé API** — Google Cloud → API et services → Identifiants → « Browser key (auto created by Firebase) » :
  - Restrictions d'application : sites web → `https://shadowxsio.github.io/*` ;
  - Restrictions d'API : Identity Toolkit API, Token Service API, Cloud Firestore API, Firebase App Check API.
- [ ] **8. Rester sur l'offre gratuite Spark** (aucune carte bancaire) : en cas d'abus, pause du service, jamais de facture.
- [ ] **9. Appliquer App Check** (après 2-3 jours de surveillance sans requêtes « non vérifiées » légitimes) :
  App Check → API → Cloud Firestore et Authentication → « Appliquer ».

## C. GitHub

- [ ] **10. Secret scanning + Push protection** — dépôt → Settings → Advanced Security (ou Code security)
  → activer « Secret scanning » et « Push protection ».
- [ ] **11. Protéger la branche `main`** — Settings → Rules → Rulesets → New branch ruleset → cible `main` :
  exiger une pull request, exiger les contrôles `audit` et `CodeQL`, bloquer les force-push et la suppression.

## D. Mise en service

- [ ] **12. Sauvegarde de sécurité** — dans l'app sur le téléphone : Menu → PIN admin → Exporter JSON.
- [ ] **13. Première connexion sur le téléphone qui a les données** (Arc) → « Importer mes données ».
  ⚠️ Ne pas se connecter d'abord sur un autre appareil : le compte serait créé vide et l'import ne serait plus proposé.
- [ ] **14. Vérifier** : historique présent, 2e appareil synchronisé, Menu → Profil de test OK.
- [ ] **15. Envoyer le lien aux amis** : https://shadowxsio.github.io/web_hosting/trailstrong/
