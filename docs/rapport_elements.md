# Éléments pour le rapport (5–10 pages) et la vidéo — à finaliser par l'équipe

Le rapport et la vidéo sont des **livrables collectifs**. Voici la matière technique fiable, et ce qu'il reste à faire.

## Plan de rapport suggéré
1. Contexte et besoin (CIAT) — *à rédiger : entretiens ≥ 2 utilisateurs, à mener par l'équipe*.
2. Cahier des charges et hypothèses (`cahier_des_charges.md`).
3. Choix techniques et justification (`architecture.md`, `VERSIONS.md`).
4. Données et qualité (`database/`, rôle du data analyst).
5. Indicateurs et règles de calcul (`architecture.md` §Indicateurs).
6. Sécurité : mesures, vérifications, **limites** (`securite.md`).
7. Intégration de l'IA : architecture, garde-fous, **mode non configuré** (`architecture.md` §Assistant).
8. Interface et identité visuelle (captures `docs/captures/`, travail de l'infographe).
9. Tests réalisés et non réalisés (`tests.md`).
10. Limites, perspectives, usage de l'IA dans le projet (`journal_prompts.md`).

## Chiffres vérifiables (à citer tels quels)
120 tests backend (SQLite et PostgreSQL), 49 tests frontend, 0 vulnérabilité connue des dépendances au moment de la génération, 1 avertissement `check --deploy` (HSTS preload, volontaire), 0 violation CSP et 0 débordement horizontal observés en navigateur.

## Ce qui reste à faire (honnêtement)
| Livrable | État |
|---|---|
| Entretiens utilisateurs, validation des hypothèses | À faire |
| Maquettes ordinateur/téléphone, logo, identité ISEP, affiche, kit réseaux | À faire (infographe) |
| Données **réelles** / jeu de données documenté du CIAT | À faire (data analyst) ; données actuelles = fictives |
| Rapport 5–10 pages | À rédiger |
| Vidéo de démonstration | À tourner (scénario ci-dessous) |
| **Lien de déploiement** pour le jury | À réaliser après autorisation (`deploiement.md`) |
| Clé API IA + test réel de l'assistant | Facultatif, à décider |

## Scénario de démonstration (≈ 4 min)
1. Connexion en **Coordonnateur** → tableau de bord : idées, retards, indicateurs. 2. Filtre cohorte + domaine : tout se met à jour ; clic sur une ligne de statut. 3. Création d'un projet (montrer une erreur de validation puis l'enregistrement) ; ajout d'un financement ; retour au tableau de bord (indicateurs recalculés). 4. Synthèse + **limites des données**. 5. Export PDF / Excel / image. 6. Assistant : « Combien de projets sont en retard ? » → étiquette « calculé par le serveur » ; expliquer le garde-fou. 7. Passage en **Lecteur** : menu restreint, porteurs anonymisés. 8. Mode sombre et affichage téléphone.
