# Journal des prompts d'IA

> Honnêteté : ce journal distingue ce qui a été **demandé**, **produit**, **corrigé** et **vérifié**. Il décrit le développement réalisé avec un assistant IA (Claude). À compléter par l'équipe pour ses propres usages d'IA (rapport, maquettes, données).

## Prompt 1 — Mission de développement (proposé par la développeuse)
- **Objet** : développer l'application complète du Projet 3 (stack React/Django/PostgreSQL, sécurité, IA, tests, Docker, documentation, ZIP).
- **Résultat généré** : backend (5 apps + audit), frontend, tests, infrastructure, documents.
- **Corrections effectuées pendant le développement** (défauts réellement rencontrés) :
  1. *Création des dossiers* : l'expansion d'accolades du shell a créé des dossiers littéraux → recréés.
  2. *Dépendances npm* : `npm audit` signalait des failles (react-router, zod, outils de test) → montées de version ; 0 vulnérabilité ensuite.
  3. *Codes HTTP* : un identifiant faux renvoyait 403 au lieu de 401 → exception dédiée (détecté par les tests).
  4. *Filtres vides* (`?status=`) rejetés en 400 → normalisation côté serveur (détecté par les tests).
  5. *Limitation* : le rafraîchissement de session partageait le plafond de connexion (10/min) et bloquait des rechargements → plafond séparé (détecté lors du parcours navigateur).
  6. *Superutilisateur* : `createsuperuser` créait un « Lecteur » → gestionnaire dédié + test + migration.
  7. *Débordement mobile* (505 px pour 390) : enfants de grille sans `min-width: 0` → règle globale (détecté en inspection navigateur).
  8. *Logo invisible sur mobile* : dégradé SVG dans un élément masqué → identifiant unique par instance.
  9. *Barres de graphiques non visibles en capture* (animation) → durée raccourcie ; *légendes de donuts* tronquées → mise en page verticale.
  10. *Données de démo* : retards irréalistes (850 j) → cohortes recentrées sur l'année en cours.
  11. *CSP* : script inline de thème incompatible avec `script-src 'self'` → fichier externe ; *nginx* : un `add_header` local annulait les en-têtes de sécurité → fichier inclus dans chaque `location` (détecté par test réel).
  12. *Avertissements OpenAPI* → annotations de types.
- **Vérifications réalisées** : voir `tests.md` (tests exécutés, navigateur réel, nginx réel, audits de dépendances).
- **Vérifications NON réalisées** : Docker, appel réel à l'IA, déploiement, accessibilité outillée (voir `tests.md`).

## Prompt 2 — Exigence design visionOS / Liquid Glass (proposé par la développeuse)
- **Objet** : interface premium, verre maîtrisé, clair/sombre, mouvement sobre, responsive, vérification visuelle.
- **Skills** : `apple-inspired-design` **lu en entier et appliqué** (principes, composants, accessibilité, responsive, anti-patterns, liste de contrôle). `apple-style-motion` **lu, mais non utilisé comme moteur** : c'est un outil de rendu **vidéo** (Remotion) sans objet pour une interface web ; ses principes de mouvement (courbes d'accélération, apparition floutée, décalage progressif) ont été repris en CSS, sans prétendre avoir utilisé le skill.
- **Résultat** : système de tokens, verre limité à la navigation / barres / menus / fenêtres / infobulles, contenu analytique opaque.
- **Corrections** : voir points 7 à 10 ci-dessus.
- **Vérification visuelle** : Chromium réel, clair et sombre, 3 largeurs, parcours interactifs, captures dans `docs/captures/`.

## Prompt 3 — « Continuer » (relances)
Reprise du travail après interruptions ; aucun changement de périmètre.

## À faire par l'équipe
Ajouter les prompts utilisés pour le rapport, la vidéo, les maquettes, les données ; noter pour chacun le résultat obtenu, les corrections humaines et les vérifications effectuées.
