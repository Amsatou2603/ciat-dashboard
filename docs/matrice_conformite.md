# Matrice de conformité

Obligatoire (O) / facultatif (F). « Vérification » = comment c'est contrôlé. Statut : ✅ implémenté et vérifié par test/inspection · ⚠️ partiel · ❌ non fait.

| Exigence (source) | Prio | Composant | Emplacement | Vérification | Statut |
|---|---|---|---|---|---|
| Filtres période/cohorte/domaine/statut/porteur (sujet P3) | O | Backend+Front | `projects/filters.py`, `features/filters/` | `test_analytics.py::test_filters_*`, `filters.test.tsx` | ✅ |
| Indicateurs idées/sélectionnés/prototypes | O | Backend | `analytics/services.py::compute_indicators` | `test_indicators_match_hand_computed_values` | ✅ |
| Progression, retards, partenariats, financements | O | Backend+Front | `services.py`, pages Dashboard/Partenariats | tests analytics + inspection navigateur | ✅ |
| Comparaison cohortes, domaine, genre | O | Backend+Front | `cohort_comparison`, `breakdown` | `test_breakdown_*`, `test_late_projects_list_and_cohort_comparison` | ✅ |
| Graphiques interactifs, fiches de synthèse | O | Front | `components/charts`, `SummaryPage` | inspection navigateur (captures) | ✅ |
| Assistant en langage naturel | O | Backend+Front | `ai_assistant/`, `AssistantPage` | `test_assistant.py` (fournisseur simulé), `assistant.test.tsx` | ✅ sans clé = « non configuré » ; ⚠️ **appel réel au fournisseur non testé** |
| Exports PDF/Excel/image | O | Backend | `analytics/exports.py` | `test_exports.py`, téléchargement réel en navigateur | ✅ |
| Authentification, rôles, autorisations | O | Backend+Front | `accounts/` | `test_auth.py`, `test_permissions.py` | ✅ |
| Base persistante, formulaires validés | O | Backend+Front | modèles, serializers, `schemas/` | `test_projects.py`, `projectForm.test.tsx` | ✅ |
| Espace de gestion (projets, utilisateurs) | O | Front | `ProjectsPage`, `UsersPage` | e2e navigateur (création/suppression), tests | ✅ |
| Navigation responsive | O | Front | `AppShell`, CSS | captures 390/820/1440 px, 0 débordement | ✅ |
| Gestion des erreurs | O | Back+Front | `core/exceptions.py`, `QueryState` | tests 400/401/403/404/429/500 | ✅ |
| Sécurité élémentaire | O | Back | `settings/`, `securite.md` | tests, `check --deploy`, `pip-audit`, `npm audit` | ✅ (voir limites) |
| Documentation d'installation/exploitation | O | Docs | `docs/` | relecture | ✅ |
| Déploiement accessible au jury (lien) | O | Équipe | `deploiement.md` | — | ❌ **non réalisé** (aucun déploiement sans autorisation) |
| Cahier des charges, maquettes, rapport, vidéo | O | Équipe | `cahier_des_charges.md` ; reste collectif | — | ⚠️ cahier initial fourni ; maquettes/rapport/vidéo à faire |
| Journal des prompts | O | Docs | `journal_prompts.md` | — | ⚠️ à compléter par l'équipe |
| Dictionnaire des données, schéma | O | Docs | `database/` | relecture vs modèles | ✅ |
| Design visionOS, clair/sombre, a11y | O (spec §22) | Front | `styles/`, composants | inspection navigateur clair/sombre | ✅ (audit a11y automatisé non exécuté) |
| Docker Compose | O (spec §14) | Infra | `docker-compose.yml` | — | ⚠️ **non exécuté** (pas de Docker) |
| Import de données réelles CSV | F | — | — | — | ❌ |
| UI d'audit | F | — | API `/api/audit/` seulement | `test_audit_log_visible_to_admin_only` | ⚠️ |
