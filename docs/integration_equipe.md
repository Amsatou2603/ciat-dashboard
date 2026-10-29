# Guide d'intégration du travail des coéquipiers

Le data analyst et l'infographe travaillent séparément. Ce guide définit **où leur travail s'branche** sans réécrire l'application.

## A. Data analyst
**Rôle** : valider le modèle, les indicateurs et les données ; ne pas dupliquer la logique de calcul.

| Besoin | Où intervenir | Contrat |
|---|---|---|
| Valider/modifier une règle d'indicateur | `backend/apps/projects/rules.py` (statuts « sélectionné », « actif », stades de prototype, règle de retard) et `analytics/services.py` | Un changement de règle met à jour les tests `test_analytics.py` (valeurs calculées à la main) **et** `docs/architecture.md` |
| Nouvel indicateur / graphique | Ajouter une fonction dans `services.py` + une vue dans `analytics/views.py` + route dans `analytics/urls.py` + hook dans `frontend/src/services/analytics.ts` | Prend un queryset **déjà filtré** ; retourne du JSON ; `null` (jamais 0) si donnée indisponible |
| Remplacer les données de démo par des données réelles | Charger via le shell/admin Django ou un script d'import (`F16`, non fourni) dans les tables du `database/data_dictionary.md` | Colonnes obligatoires respectées ; `is_demo=false` ; **supprimer** les données fictives : `seed_demo --reset` ne supprime que `is_demo=true` |
| Dictionnaire / qualité des données | `database/data_dictionary.md` + section « limites » de la fiche de synthèse (`services.summary`) | Toute anomalie connue y est signalée |
| Maquette analytique (Power BI, notebook…) | Hors application : s'appuyer sur les endpoints `/api/analytics/*` ou une exportation Excel (`/api/analytics/export/xlsx/`) | Mêmes filtres, mêmes droits |

## B. Infographe
**Rôle** : identité visuelle, logo, illustrations, maquettes. Le front est conçu pour recevoir une charte **sans toucher aux composants**.

| Élément | Où l'intégrer |
|---|---|
| Palette (couleurs de marque, états, graphiques) | `frontend/src/styles/tokens.css` — variables `--accent`, `--indigo`, `--violet`, `--chart-1…6`, clair **et** sombre. Vérifier les contrastes (≥ 4,5:1 pour le texte) |
| Typographie | `--font-sans` / `--font-display` dans `tokens.css` ; police auto-hébergée via `@fontsource-*` (pas de CDN : la CSP l'interdit) |
| Logo | Remplacer `frontend/src/components/Logo.tsx` (SVG) et `frontend/public/favicon.svg`. Le logo actuel est **provisoire** |
| Rayons, ombres, verre | `--r-*`, `--shadow-*`, `--glass-*` dans `tokens.css` |
| Illustrations / médias | Fichiers optimisés dans `frontend/public/` ou importés depuis `src/` ; poids < 200 Ko ; texte alternatif obligatoire |
| Maquettes (livrable) | À produire par l'infographe (ordinateur + téléphone) ; l'application actuelle peut servir de base de comparaison |

Charte ISEP (marron/beige du logo fourni dans le sujet) : **non appliquée** — le sujet demande une cohérence avec la charte de l'ISEP, alors que cette version suit la direction artistique visionOS demandée par la développeuse. Décision à prendre en équipe : adapter les tokens (`--accent`…) pour intégrer les couleurs ISEP.

## C. Fusion technique
1. Chacun travaille sur sa branche (`docs/git_workflow.md`). 2. Les fichiers `tokens.css`, `Logo.tsx`, `data_dictionary.md`, `rules.py` sont les points de contact : les modifier par petites PR. 3. Avant fusion : `make lint`, tests backend et frontend verts. 4. Revue croisée (le data analyst relit `rules.py`/`services.py` ; l'infographe relit l'interface).
