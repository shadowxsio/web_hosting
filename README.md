# Mes Courses - Link-in-bio

Une page web élégante (Glassmorphism, Mode Sombre) pour afficher votre historique de course à pied, synchronisé avec Sportstats.

## 🏃 Comment ajouter une course manuellement ?

Si une course n'est pas disponible sur Sportstats, vous pouvez l'ajouter manuellement au fichier `data/manual_runs.json`.

Éditez le fichier `data/manual_runs.json` et ajoutez un bloc JSON pour votre course. Voici un exemple avec le dénivelé pour un trail :

```json
[
  {
    "date": "2023-08-12",
    "event_name": "Trail Exemple (Gaspésie)",
    "distance": "25.0 km",
    "time": "3:15:00",
    "elevation": "850m",
    "source": "Strava",
    "url": "https://www.strava.com/athletes/46325892"
  }
]
```

**Champs supportés :**
- `date` : Date au format YYYY-MM-DD
- `event_name` : Le nom de la course
- `distance` : La distance, idéalement formatée comme `XX.X km` (ex: `21.1 km`, `42.2 km`)
- `time` : Le temps au format `H:MM:SS` ou `MM:SS`
- `elevation` (Optionnel) : Le dénivelé positif pour les trails (ex: `850m`)
- `source` (Optionnel) : Origine de la donnée (ex: `Manuel`, `Strava`)
- `url` (Optionnel) : Lien vers l'activité

Une fois modifié, *commit* et *push* le fichier. L'Action GitHub se chargera de mettre à jour la page !

## ⚙️ Automatisation

Un workflow GitHub Actions tourne tous les jours à 8h00 UTC pour aller chercher de nouvelles courses sur Sportstats et met à jour le site web automatiquement s'il y a des nouveautés.

## 🏔️ TrailStrong 2026 (PWA de renforcement trail)

Application privée (connexion Google sans serveur + PIN admin) pour les séances à l'ÉconoFitness Beaubien : Activation, Séance A, Séance B, Tapis D+ et Stats.
Code source dans `trailstrong-src/` (Vite + React + TypeScript + Tailwind + Lucide), publiée sous **`/trailstrong/`**.

- **Déploiement** : le workflow `Deploy to GitHub Pages` installe Node, build l'app dans `trailstrong/` puis publie tout le site (aucun build à committer).
- **Accès** : connexion **Google sans serveur** — le jeton Google est vérifié dans l'app (signature via les clés publiques Google, audience, expiration, email vérifié) et l'email doit figurer dans la liste autorisée, publiée uniquement sous forme d'empreinte SHA-256. L'appareil reste autorisé 30 jours (utilisable hors-ligne). À configurer dans *Settings → Secrets and variables → Actions* :
  - `GOOGLE_CLIENT_ID` (variable ou secret) : client OAuth « Application Web » avec l'origine JavaScript autorisée `https://shadowxsio.github.io` ;
  - secret `ALLOWED_GOOGLE_EMAIL` : ton email Gmail (plusieurs possibles, séparés par des virgules).
  Sans ces deux valeurs, l'app fonctionne en accès PIN uniquement.
- **PIN = mode admin** : déverrouille les Réglages (sauvegardes, Gist, PIN) pendant 10 min et sert d'accès de secours si Google est indisponible. Blocage après 5 PIN faux (30 s → 2 min → 10 min). Définir le secret de dépôt `APP_PASSWORD_HASH` = SHA-256 hex du PIN :
  ```bash
  printf '123456' | sha256sum | cut -d' ' -f1
  ```
  Sans secret, le PIN par défaut est `2026`.
  ⚠️ Le site est statique : le contrôle d'accès protège l'interface, pas le code (public sur GitHub Pages). Les données restent sur l'appareil.
- **Sécurité** : Content-Security-Policy stricte injectée au build, anti-clickjacking (`theme.js`), `noindex` pour les moteurs de recherche, Dependabot (npm + actions), audit `npm audit` hebdomadaire (`security.yml`), analyse CodeQL (`codeql.yml`). En mode comptes : App Check (reCAPTCHA Enterprise, variable `RECAPTCHA_SITE_KEY`) et règles Firestore strictes (`firestore.rules` : propriétaire uniquement, formes de documents et tailles contrôlées, tout le reste refusé).
- **Données** : 100 % `localStorage` sur l'appareil. Export/Import JSON, et backup optionnel chiffré (AES-256, clé de récupération propre à l'appareil, à noter) vers un Gist secret — token GitHub avec le seul scope `gist`.
- **Hors-ligne** : service worker généré au build (précache de tous les fichiers) + manifest → « Ajouter à l'écran d'accueil ».
- **Dev local** :
  ```bash
  cd trailstrong-src && npm install && npm run dev   # http://localhost:5173 (la connexion Google ne marche que sur shadowxsio.github.io : utilise le PIN en local ; /#schemas : planche des 35 schémas)
  ```
- **Photos de démo** : `trailstrong-src/public/demos/` — paires départ/fin issues de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense), converties en WebP 480 px.
- **Ajout d'exercices** (bouton « Ajouter un exercice à cette séance ») :
  - *Catalogue* : `public/catalog.json` (~800 exercices free-exercise-db, régénérable avec `node scripts/build-catalog.mjs`), recherche en français ou anglais ; les 2 photos sont copiées dans l'exercice (JPEG réduit) pour le hors-ligne ;
  - *IA* : Gemini appelé directement depuis le navigateur avec la clé API de l'utilisateur, saisie en mode admin et stockée uniquement sur l'appareil (jamais exportée) ; l'IA choisit l'exo du catalogue, traduit, fixe séries / tempo du coach / consignes et le schéma ;
  - *Manuel* : saisie libre ; dans tous les cas, schéma choisi automatiquement parmi 35 modèles (modifiable).
- **Fin de séance** : bilan automatique quand la séance est à 100 % (ou bouton « Bilan & récup ») — volume, records, écart G/D, difficulté ressentie, douleur après, repères de récupération dosés selon le poids du Profil (Menu → Profil). « Retour au calme » : étirements et mobilité propres à chaque séance (`src/data/cooldown.ts`), enchaînés par le coach avec schéma.
- **Comptes multi-utilisateurs (Firebase)** : activés dès que les variables `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` existent (sinon : mode local historique, inchangé).
  - Connexion Google (bouton GIS → `signInWithCredential`), inscription ouverte ; données par compte dans Firestore (`users/{uid}`, `days/{date}`, `custom/{id}`), cache hors-ligne, synchro entre appareils.
  - Règles : `trailstrong-src/firestore.rules` (chaque compte n'accède qu'à ses données) — à coller dans la console Firestore.
  - Firebase Auth → Google activé ; si le client OAuth (`GOOGLE_CLIENT_ID`) vient d'un autre projet, l'ajouter aux « ID client de projets externes ». Domaine autorisé : `shadowxsio.github.io`.
  - Premier lancement : migration des données locales de l'appareil, ou questionnaire (sport, objectifs, zones sensibles, matériel, niveau, rythme) → programme généré (`src/data/generator.ts`) à partir du programme de base et de la bibliothèque (`src/data/extras.ts`).
- **Profil de test** (Menu → mode admin en local, ou compte propriétaire en mode comptes) : profil temporaire local pour essayer le questionnaire et la génération de programme ; rien n'est synchronisé et tout est effacé à la sortie (`src/lib/sandbox.ts`).
