# Dictionnaire des données

Obligatoire (O) / facultatif (F). Toutes les dates sont des dates calendaires ; `created_at`/`updated_at` sont des horodatages (fuseau Africa/Dakar).

## `projects_domain` — Domaines d'application (référentiel, 7 lignes)
| Champ | Type | O/F | Description |
|---|---|---|---|
| id | bigint | O | Identifiant |
| code | slug(30) | O | Code stable (ex. `agriculture`) |
| label | texte(150) | O | Libellé (domaines prioritaires du sujet) |

## `projects_cohort` — Cohortes
| Champ | Type | O/F | Description |
|---|---|---|---|
| name | texte(80) unique | O | Ex. « Cohorte 2025-2026 » |
| year | entier | O | Année de début |
| start_date / end_date | date | O | Période de la cohorte (fin ≥ début) |

## `projects_porteur` — Porteurs de projet (données personnelles minimales)
| Champ | Type | O/F | Description |
|---|---|---|---|
| full_name | texte(120) | O | Nom affiché (aucune autre donnée de contact stockée) |
| gender | `F`/`M`/`NS` | O (défaut `NS`) | Genre déclaré ; `NS` = non renseigné |
| is_demo | booléen | O | Donnée fictive de démonstration |

## `projects_project` — Projets
| Champ | Type | O/F | Description |
|---|---|---|---|
| title | texte(200) | O | Titre |
| description | texte | F | Description |
| cohort / domain / porteur | FK | O | Rattachements |
| received_date | date | O | Date de réception de l'idée (sert au filtre « période ») |
| status | choix | O | `RECU`, `PRESELECTIONNE`, `SELECTIONNE`, `EN_INCUBATION`, `PROTOTYPAGE`, `TERMINE`, `ABANDONNE`, `REJETE` |
| start_date / deadline | date | F | Début / date limite |
| progress | entier 0–100 | O (défaut 0) | Pourcentage d'avancement |
| prototype_stage | choix | O (défaut `AUCUN`) | `AUCUN`, `MAQUETTE`, `PROTOTYPE`, `MVP` |
| prototype_notes | texte | F | Informations sur le prototype |
| is_demo | booléen | O | Fictif (non modifiable via l'API) |
| created_by | FK utilisateur | F | Auteur de la création |
| created_at / updated_at | horodatage | O | Traçabilité |

## `partnerships_partner`, `partnerships_partnership`, `partnerships_funding`
| Table.champ | Type | O/F | Description |
|---|---|---|---|
| partner.name | texte(150) unique | O | Nom du partenaire |
| partner.kind | choix | O | `ACADEMIQUE`, `ENTREPRISE`, `INSTITUTION`, `FINANCEUR`, `ONG` |
| partnership.nature | choix | O | `TECHNIQUE`, `MENTORAT`, `COMMERCIAL`, `HEBERGEMENT`, `FINANCIER` |
| partnership.status | choix | O | `ACTIF`, `DISCUSSION`, `TERMINE` |
| partnership.start_date | date | F | Début du partenariat |
| funding.amount_xof | entier > 0 | O | Montant en francs CFA |
| funding.status | `PROMIS`/`OBTENU` | O | Promis ou effectivement obtenu |
| funding.date | date | O | Date de l'engagement / versement |

## `accounts_user` — Utilisateurs
username (O, unique), first_name/last_name (F), email (F, unique), **role** (O : `admin`, `coordinator`, `analyst`, `reader`), is_active (O), mot de passe haché (O), last_login, date_joined. `is_staff`/`is_superuser` ne servent qu'à l'admin Django.

## `ai_assistant_assistantexchange` — Historique IA (≤ 20 par utilisateur)
user (FK), question (≤ 500), answer, intent, ai_generated (booléen), created_at.

## `audit_auditlog` — Journal d'audit
user (FK nullable), username, action, object_type, object_id, extra (JSON, jamais de secret ni de texte de question), ip_address, created_at.

## Qualité des données — contrôles et limites
Contrôlés : bornes de progression, cohérence des dates, montants positifs, unicité des partenariats. **Non contrôlables automatiquement** : exactitude de la date de réception, du genre déclaré, des montants saisis. Les anomalies connues sont remontées dans la « fiche de synthèse » (projets en cours sans date limite, genre non renseigné, données fictives).
