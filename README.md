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
