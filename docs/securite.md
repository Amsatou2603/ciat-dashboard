# Sécurité — mesures, vérifications et limites

> **Aucune application n'est « totalement sécurisée ».** Ce document décrit ce qui est en place, comment c'est vérifié, et ce qui reste à la charge de l'équipe avant une mise en production réelle.

## Mesures en place
| Domaine | Mesure | Vérifié par |
|---|---|---|
| Secrets | Aucun secret dans le dépôt ; `.env` ignoré ; `.env.example` fictif ; `scripts/check_secrets.sh` | relecture, script |
| Démarrage prod | `settings/prod.py` **refuse de démarrer** : clé < 50 car. ou factice, `ALLOWED_HOSTS` vide ou `*`, pas de `DATABASE_URL`, CORS en `http`/`*` | `test_prod_settings.py` |
| Séparation des configs | `dev` / `test` / `prod` distincts ; `DEBUG=False` en prod ; test utilise des hashers rapides **uniquement** en test | revue |
| HTTPS | `SECURE_SSL_REDIRECT`, HSTS (1 an), cookies `Secure`, `SECURE_PROXY_SSL_HEADER` | `check --deploy` (1 seul avertissement : HSTS *preload*, volontairement non activé) |
| En-têtes | CSP stricte (nginx pour le SPA, middleware pour l'API), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` sur l'API | `test_security_headers_present` ; CSP testée en navigateur derrière nginx : **0 violation** |
| Mots de passe | Hachage Django (PBKDF2), validateurs (10 car. min., courants, numériques) | `test_admin_creates_user_with_hashed_password_and_no_leak` |
| Sessions | Accès 10 min en mémoire ; refresh HttpOnly/Strict avec rotation + liste noire ; en-tête anti-CSRF | `test_auth.py` |
| Force brute | Limite IP (10/min) + verrou par identifiant (5 échecs → 15 min) ; message identique compte inconnu / mauvais mot de passe | `test_account_locks_*`, `test_login_wrong_password_is_generic_*` |
| Autorisations | Contrôle serveur sur chaque endpoint ; matrice testée par rôle ; accès horizontal : historique IA filtré par utilisateur | `test_permissions.py`, `test_history_is_private_*` |
| Affectation de masse | Serializers à champs explicites ; `role`/`is_staff` jamais modifiables hors API admin ; `is_demo`, `id` en lecture seule | `test_mass_assignment_*`, `test_read_only_fields_*` |
| Données personnelles | Porteurs : nom + genre seulement ; rôle Lecteur : noms remplacés par « Porteur n°X », genre masqué, filtre porteur interdit | `test_reader_gets_masked_personal_data` |
| Injection | ORM Django (requêtes paramétrées) ; filtres validés ; aucune génération SQL par l'IA | `test_sql_injection_attempt_in_search_is_inert` |
| Exports | Mêmes droits et filtres que la consultation ; volume borné ; limite 20/h ; neutralisation des formules Excel (`=`, `+`, `-`, `@`) ; journalisés | `test_exports.py` |
| IA | Pas de SQL libre ; fonctions prédéfinies ; entrées bornées ; clé serveur ; garde-fou anti-chiffres inventés ; données minimales transmises ; pas de texte de question dans l'audit ni dans les logs | `test_assistant.py` |
| Journal d'audit | connexions (réussies/échouées/verrouillées), écritures, exports, gestion des comptes, questions IA (intention seulement) ; **sans mot de passe ni jeton** | `test_audit_*` |
| Erreurs | Format unique ; 500 génériques ; journal Django sans corps de requête | revue |
| Dépendances | Versions épinglées ; `pip-audit` : 0 vulnérabilité connue ; `npm audit` : 0 | exécutés à la génération (voir `tests.md`) |
| Santé | `/api/health/` : `ok`/`degraded` sans détail | `test_health_reveals_nothing` |
| Conteneurs | Images non-root ; nginx *unprivileged* ; pas de secret dans les images | revue (non exécutées) |

## Limites et risques résiduels (à lire avant déploiement)
1. **Compteurs de limitation et de verrouillage en mémoire locale** (cache Django par défaut) : avec plusieurs workers gunicorn, chaque worker a son compteur (verrou effectif jusqu'à ~3× plus laxiste) et un redémarrage les remet à zéro. *Recommandation* : cache partagé (Redis ou `DatabaseCache`) en production.
2. **Un jeton d'accès déjà émis reste valide jusqu'à 10 min** après désactivation d'un compte (JWT sans état) ; le renouvellement, lui, est refusé.
3. **Pas d'authentification à deux facteurs**, pas de politique d'expiration des mots de passe, pas de réinitialisation par e-mail.
4. **Interprétation des questions IA par règles** : une question hors périmètre est refusée plutôt que « devinée ». Si une clé est configurée, le texte de la question et un résumé de résultats **quittent le serveur vers le fournisseur** : à valider (RGPD / politique de l'ISEP) avant usage avec des données réelles.
5. **La CSP du SPA autorise `style-src 'unsafe-inline'`** (styles inline produits par Recharts/React) ; `script-src` reste `'self'`.
6. **Journal d'audit non immuable** (table SQL modifiable par un administrateur de base).
7. **Pas d'analyse dynamique (DAST) ni de test d'intrusion** réalisés. `pip-audit`/`npm audit` ne couvrent que les vulnérabilités connues.
8. **Docker, HTTPS réel et déploiement non testés** (voir `deploiement.md`).
9. **L'accessibilité n'a pas été auditée avec un outil automatisé** (axe/Lighthouse) ni avec un lecteur d'écran ; seuls : navigation clavier, libellés, contrastes calculés à la conception, `prefers-reduced-motion`.
10. **Pas de chiffrement des sauvegardes** : à ajouter selon la politique de l'ISEP.

## Avant publication (liste de contrôle)
- [ ] `DJANGO_SECRET_KEY` aléatoire (≥ 64 car.), `DJANGO_ALLOWED_HOSTS` exact, `CORS_ALLOWED_ORIGINS` en `https`
- [ ] `ALLOW_DEMO_SEED` absent ou `false` ; aucun compte `*_demo`
- [ ] `ENABLE_API_DOCS=false`, `DJANGO_ADMIN_URL` non devinable
- [ ] `python manage.py check --deploy` sans erreur ; `pip-audit` / `npm audit` propres
- [ ] Cache partagé pour throttling/verrouillage ; sauvegardes testées (restauration)
- [ ] Revue du traitement des données (porteurs) avec le CIAT ; décision sur l'activation de l'IA externe
