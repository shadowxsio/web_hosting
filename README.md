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

Application privée (PIN) pour les séances à l'ÉconoFitness Beaubien : Activation, Séance A, Séance B, Tapis D+ et Stats.
Code source dans `trailstrong-src/` (Vite + React + TypeScript + Tailwind + Lucide), publiée sous **`/trailstrong/`**.

- **Déploiement** : le workflow `Deploy to GitHub Pages` installe Node, build l'app dans `trailstrong/` puis publie tout le site (aucun build à committer).
- **PIN** : créer le secret de dépôt `APP_PASSWORD_HASH` = SHA-256 hex du PIN (4 ou 6 chiffres) :
  ```bash
  printf '123456' | sha256sum | cut -d' ' -f1
  ```
  Sans secret, le PIN par défaut est `2026`. Un PIN local peut aussi être défini dans *Réglages*.
  ⚠️ C'est un verrou anti-curieux : le bundle JS reste public sur GitHub Pages.
- **Données** : 100 % `localStorage` sur l'appareil. Export/Import JSON, et backup optionnel chiffré (AES-256, clé dérivée du PIN) vers un Gist secret — token GitHub avec le seul scope `gist`.
- **Hors-ligne** : service worker généré au build (précache de tous les fichiers) + manifest → « Ajouter à l'écran d'accueil ».
- **Dev local** :
  ```bash
  cd trailstrong-src && npm install && npm run dev   # http://localhost:5173 (/#figures : planche des illustrations)
  ```
- **Photos de démo** : `trailstrong-src/public/demos/` — paires départ/fin issues de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public, Unlicense), converties en WebP 480 px.
