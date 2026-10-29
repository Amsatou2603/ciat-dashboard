# API REST

Base : `/api/`. JSON uniquement. Documentation interactive : `/api/docs/` (Swagger) et `/api/schema/` (OpenAPI), **activées seulement si `ENABLE_API_DOCS=true`** (désactivées par défaut en production).

## Format d'erreur unique
```json
{ "code": "validation_error", "message": "Certaines données sont invalides.", "details": { "deadline": ["…"] } }
```
Codes : `validation_error` (400), `not_authenticated`/`invalid_credentials` (401), `permission_denied` (403), `not_found` (404), `throttled` (429), `account_locked` (429), `error`. Les erreurs 500 ne divulguent aucun détail interne.

## Authentification
| Méthode | Route | Notes |
|---|---|---|
| POST | `/auth/login/` | `{username,password}` → `{access,user}` + cookie `ciat_refresh`. 10/min/IP ; verrou 15 min après 5 échecs |
| POST | `/auth/refresh/` | Cookie + en-tête `X-CIAT-Client: web`. Rotation du jeton. 60/min |
| POST | `/auth/logout/` | Même en-tête. Révoque le jeton |
| GET | `/auth/me/` | Profil + capacités |
| POST | `/auth/password/` | `{old_password,new_password}` |
| CRUD | `/auth/users/` | Admin uniquement |

En-tête des autres appels : `Authorization: Bearer <access>`.

## Ressources
| Route | Méthodes | Droit |
|---|---|---|
| `/projects/` | GET, POST, PATCH, PUT, DELETE | lecture `view_projects` ; écriture `write_projects` ; suppression `delete_projects` |
| `/cohorts/` | GET, POST, PUT, PATCH | lecture tout connecté ; écriture `write_projects` |
| `/domains/` | GET | référentiel fixe (migration) |
| `/porteurs/` | GET, POST, PATCH | `view_personal` / `write_projects` |
| `/partners/`, `/partnerships/`, `/fundings/` | CRUD (partners sans DELETE) | comme projets |
| `/audit/` | GET | `view_audit` |
| `/health/` | GET | public, sans détail |

**Paramètres de liste** : `page`, `page_size` (≤ 100), `search`, `ordering`, filtres ci-dessous.

## Filtres communs (projets, analytics, exports, assistant)
`period_start`, `period_end` (dates ISO, sur la date de réception), `cohort`, `domain`, `subdomain`, `porteur` (entiers), `status` (répétable). Valeurs vides ignorées ; valeur invalide ou période inversée → 400 ; `porteur` interdit au rôle sans `view_personal` (403).

## Analytics (`view_dashboard`)
`GET /analytics/` + `filter-options/`, `annual-budgets/` (sans filtres), `indicators/`, `timeseries/`, `breakdown/?dimension=status|domain|subdomain|gender|prototype`, `cohorts/`, `progress/`, `late/`, `partnerships/`, `funding/`, `summary/`.

## Exports (`view_dashboard` + `export`, 20/h)
`GET /analytics/export/{pdf|xlsx|png}/` + mêmes filtres → fichier (`Content-Disposition: attachment; filename="ciat-synthese-AAAAMMJJ.ext"`). Volume borné (`EXPORT_MAX_ROWS`, 5000). Journalisé.

## Assistant (`use_ai`)
| Méthode | Route | |
|---|---|---|
| POST | `/assistant/ask/` | `{question, filters}` → `{answer, intent, ai_generated, ai_configured, data, warning, disclaimer}` |
| GET | `/assistant/status/` | `{configured, disclaimer, max_question_chars}` |
| GET/DELETE | `/assistant/history/` | Historique **de l'utilisateur courant** |

## Exemples
```bash
curl -c cj -X POST http://localhost:8080/api/auth/login/ -H "Content-Type: application/json" -d '{"username":"analyste_demo","password":"…"}'
curl http://localhost:8080/api/analytics/indicators/?cohort=1 -H "Authorization: Bearer <access>"
```
