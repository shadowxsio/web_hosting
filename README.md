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

Application privée (connexion Google + PIN admin) pour les séances à l'ÉconoFitness Beaubien : Activation, Séance A, Séance B, Tapis D+ et Stats.
Code source dans `trailstrong-src/` (Vite + React + TypeScript + Tailwind + Lucide), publiée sous **`/trailstrong/`**.

- **Déploiement** : le workflow `Deploy to GitHub Pages` installe Node, build l'app dans `trailstrong/` puis publie tout le site (aucun build à committer).
- **Accès** : connexion **Google** via le backend `run-agent` (Cloud Run, dépôt `ai-agent`) — `GET /api/auth/config` puis `POST /api/verify-pin` avec le jeton Google ; seul l'email de `ALLOWED_GOOGLE_EMAIL` est accepté. L'appareil reste autorisé 30 jours (utilisable hors-ligne). URL du backend surchargeable au build avec `VITE_AUTH_API_URL`.
- **PIN = mode admin** : déverrouille les Réglages (sauvegardes, Gist, PIN) pendant 10 min et sert d'accès de secours si Google est indisponible. Blocage après 5 PIN faux (30 s → 2 min → 10 min). Définir le secret de dépôt `APP_PASSWORD_HASH` = SHA-256 hex du PIN :
  ```bash
  printf '123456' | sha256sum | cut -d' ' -f1
  ```
  Sans secret, le PIN par défaut est `2026`.
  ⚠️ Le site est statique : le contrôle d'accès protège l'interface, pas le code (public sur GitHub Pages). Les données restent sur l'appareil.
- **Sécurité** : Content-Security-Policy stricte injectée au build, Dependabot (npm + actions), audit `npm audit` hebdomadaire (`security.yml`).
- **Données** : 100 % `localStorage` sur l'appareil. Export/Import JSON, et backup optionnel chiffré (AES-256, clé de récupération propre à l'appareil, à noter) vers un Gist secret — token GitHub avec le seul scope `gist`.
- **Hors-ligne** : service worker généré au build (précache de tous les fichiers) + manifest → « Ajouter à l'écran d'accueil ».
- **Dev local** :
  ```bash
  cd trailstrong-src && npm install && npm run dev   # http://localhost:5173 (la connexion Google ne marche que sur shadowxsio.github.io : utilise « Accès admin (PIN) » en local)
  ```
- **Photos de démo** : `trailstrong-src/public/demos/` — paires départ/fin issues de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense), converties en WebP 480 px.
