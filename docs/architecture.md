# Architecture

## Vue d'ensemble
```
Navigateur ──HTTPS──▶ nginx (SPA React, CSP stricte) ──/api──▶ gunicorn + Django REST ──▶ PostgreSQL
                                                                   │
                                                                   └──▶ Fournisseur IA (optionnel, clé côté serveur)
```
- **Frontend** (`frontend/`) : React 18, TypeScript strict, Vite, Tailwind (tokens CSS), React Router, TanStack Query, React Hook Form + Zod, Recharts. Les appels HTTP passent par un client unique (`src/lib/api.ts`).
- **Backend** (`backend/`) : Django 5.2 + DRF. Applications : `accounts` (utilisateurs, rôles, JWT), `projects` (cohortes, domaines, porteurs, projets, règles métier), `partnerships` (partenaires, partenariats, financements), `analytics` (indicateurs, graphiques, exports), `ai_assistant`, `audit`, `core` (santé, erreurs, en-têtes).
- **Même origine** : nginx relaie `/api` vers Django → pas de CORS en production, cookie de rafraîchissement `SameSite=Strict`.

## Authentification (justification du stockage des jetons)
| Jeton | Durée | Stockage | Pourquoi |
|---|---|---|---|
| Accès (JWT) | 10 min | **Mémoire JavaScript uniquement** | Un vol par XSS donne une fenêtre de 10 min ; rien n'est lisible après fermeture de l'onglet |
| Rafraîchissement | 7 j, **rotation + liste noire** | Cookie **HttpOnly**, `Secure` (prod), `SameSite=Strict`, `Path=/api/auth/` | Inaccessible au JS ; envoyé seulement aux routes d'auth |

- **XSS** : aucun jeton en `localStorage` ; CSP `script-src 'self'` ; React échappe les données.
- **CSRF** : les routes protégées utilisent l'en-tête `Authorization` (non envoyé automatiquement par le navigateur). Les routes basées sur cookie (`refresh`, `logout`) exigent un en-tête personnalisé `X-CIAT-Client: web` (impossible à forger cross-site sans pré-vol CORS refusé) + `SameSite=Strict`.
- Rotation : un jeton rejoué est refusé (testé). Un compte désactivé ne peut plus renouveler (testé). Déconnexion = mise en liste noire côté serveur.
- Au rechargement de page, le frontend rappelle `refresh` pour retrouver sa session.

## Rôles et capacités (source unique : `backend/apps/accounts/roles.py`)
| Capacité | Admin | Coordonnateur | Analyste | Lecteur |
|---|:-:|:-:|:-:|:-:|
| `view_dashboard` (indicateurs, graphiques) | ✔ | ✔ | ✔ | ✔ |
| `view_projects` | ✔ | ✔ | ✔ | ✔ |
| `view_personal` (noms/genre des porteurs) | ✔ | ✔ | ✔ | ✘ (masqué) |
| `write_projects` (projets, partenariats, financements) | ✔ | ✔ | ✘ | ✘ |
| `delete_projects` | ✔ | ✔ | ✘ | ✘ |
| `export` | ✔ | ✔ | ✔ | ✘ |
| `use_ai` | ✔ | ✔ | ✔ | ✘ |
| `manage_users` / `view_audit` | ✔ | ✘ | ✘ | ✘ |

Le frontend lit ces capacités via `/api/auth/me/` **uniquement pour masquer des boutons** ; chaque endpoint revérifie le droit (`require(Cap...)`, `ReadOrWrite`). Les champs `role`, `is_staff`, `is_superuser` ne sont modifiables que par l'API d'administration des comptes.

## Règles de calcul des indicateurs (`projects/rules.py`, `analytics/services.py`)
| Indicateur | Règle |
|---|---|
| Idées reçues | Nombre de projets correspondant aux filtres (chaque idée enregistrée = 1 projet) |
| Projets sélectionnés | Statut ∈ {Sélectionné, En incubation, En prototypage, Terminé} ; *Abandonné* exclu **[hypothèse]** |
| Taux de sélection | sélectionnés / idées ; `null` (« n/d ») si 0 idée |
| Prototypes | `prototype_stage` ∈ {Prototype fonctionnel, MVP} ; une maquette n'est pas comptée |
| Porteurs distincts | `COUNT(DISTINCT porteur)` — **différent** du nombre de projets |
| Projets en cours | Statut ∈ {Sélectionné, En incubation, En prototypage} |
| Progression moyenne | Moyenne de `progress` sur les projets en cours ; `null` s'il n'y en a pas |
| Projets en retard | En cours **et** `progress < 100` **et** (`deadline < aujourd'hui` **ou** `delay_days > 0`) ; sans échéance ni retard cumulé : non compté (signalé) |
| Candidatures / sélections (agrégats) | Somme des champs de cohorte ; **non applicable** si un filtre autre que la cohorte est actif |
| Partenariats | Lignes `Partnership` des projets filtrés ; partenaires distincts séparés |
| Financements | Somme `OBTENU` et somme `PROMIS` séparées (jamais additionnées) ; 0 ligne → « Aucun » |
| Idées par mois | Groupées par mois de **réception**, mois vides remplis à zéro |
| Genre | Genre du porteur, compté en **porteurs distincts** ; non renseigné séparé |

Aucun double comptage : partenariats et financements sont agrégés par sous-requêtes sur les projets filtrés, jamais par jointure multiple (test `test_no_double_counting_with_multiple_joins`).

## Assistant IA
1. `POST /api/assistant/ask/` : question (≤ 500 car.) + filtres validés par le même `FilterSet` que le reste de l'API.
2. Le **backend** détecte l'intention par règles (`intents.py`) et appelle une **fonction analytique prédéfinie** ; aucun SQL généré, le modèle ne décide d'aucune autorisation (rôle `use_ai` ; question « genre » exige `view_personal`).
3. Sans clé API : réponse **calculée par le serveur**, étiquetée « sans IA » + message « service IA non configuré ». Rien n'est simulé comme une réponse d'IA.
4. Avec clé : le modèle reçoit la question + un petit JSON de résultats et **reformule**. Garde-fou : tout nombre cité absent du JSON → réponse rejetée et remplacée par le calcul serveur. Timeout 20 s ; erreur fournisseur → repli sur le calcul serveur.
5. Limites : 20 requêtes/min/utilisateur, 500 car., 500 tokens de sortie. Historique : 20 derniers échanges **par utilisateur**, effaçable. Le journal d'audit ne stocke jamais le texte de la question.

## Contrats d'intégration
Voir `integration_equipe.md`.
