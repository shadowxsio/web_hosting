# web_hosting — instructions pour les agents

Site GitHub Pages personnel (CV, pages statiques) + l'app **TrailStrong** (`trailstrong-src/`).

- Pour toute modification de TrailStrong : lire **`trailstrong-src/CLAUDE.md`** (commandes, tests e2e,
  pipeline de PR avec aperçu automatique, checklist d'ajout de fonctionnalité).
- Déploiement : `.github/workflows/deploy.yml` sur push `main` (publie tout le dépôt + le build de TrailStrong).
- Messages de commit en `type(scope): description`, en français. Jamais de secret dans le dépôt.
