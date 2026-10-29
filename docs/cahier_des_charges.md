# Cahier des charges initial — Tableau de bord décisionnel du CIAT (Projet 3)

> Document **initial**, rédigé à partir du sujet « Évaluation pratique en IA générative — CIAT et Incubateur ». Les éléments marqués **[Hypothèse]** sont provisoires et **ne sont pas des exigences officielles du CIAT** : ils doivent être validés avec au moins deux utilisateurs potentiels (livrable exigé par le sujet, étape 2 du « travail demandé »). Ce document doit être complété par l'équipe (entretiens utilisateurs, besoins précis).

## 1. Contexte
Le CIAT (Centre d'Innovation, d'Application et de Transfert de l'ISEP Amadou Trawaré) accompagne des porteurs de projets via son incubateur. Les responsables ont besoin de **suivre l'activité** (idées reçues, projets sélectionnés, prototypes), **les retards**, **les partenariats** et **les financements**, de comparer des **cohortes** et d'exporter des analyses.

## 2. Utilisateurs et rôles
| Rôle | Description | Droits (appliqués par le serveur) |
|---|---|---|
| Administrateur | Gère les comptes et la plateforme | Tout, dont gestion des utilisateurs et journal d'audit |
| Coordonnateur du CIAT | Pilote l'incubateur | Créer/modifier/supprimer projets, partenariats, financements ; consulter ; exporter ; assistant IA |
| Analyste | Analyse les données | Consulter (dont données personnelles), exporter, assistant IA ; aucune écriture |
| Lecteur | Membre autorisé à consulter les indicateurs | Consulter indicateurs et projets ; **porteurs anonymisés**, pas de genre, pas d'export, pas d'assistant |

**[Hypothèse]** : ces quatre profils et leurs droits sont proposés par l'équipe, à confirmer avec le CIAT.

## 3. Exigences fonctionnelles
Légende : **O** = obligatoire (explicite dans le sujet, projet 3 / profil développeur) ; **F** = facultatif / amélioration.

| # | Exigence | Prio |
|---|---|---|
| F1 | Filtres : période, cohorte, domaine, statut, porteur (combinables) | O |
| F2 | Indicateurs : idées reçues, projets sélectionnés, prototypes | O |
| F3 | Suivi de la progression, des retards, des partenariats, des financements | O |
| F4 | Comparaison entre cohortes ; répartition par domaine et par genre | O |
| F5 | Graphiques interactifs et fiches de synthèse | O |
| F6 | Assistant interrogeant les données en langage naturel (IA générative) | O |
| F7 | Exports PDF, Excel, image | O |
| F8 | Authentification, rôles, autorisations | O |
| F9 | Base de données persistante, formulaires validés, gestion des erreurs | O |
| F10 | Espace d'administration / gestion (projets, utilisateurs) | O |
| F11 | Application responsive (ordinateur, tablette, téléphone) | O |
| F12 | Documentation d'installation et d'exploitation ; préparation du déploiement | O |
| F13 | Mode clair / sombre, design visionOS-inspiré | Exigence de l'équipe (spec. §22) |
| F14 | Journal d'audit des actions sensibles | F |
| F15 | Gestion des partenaires/financeurs depuis l'interface | F |
| F16 | Import de données réelles du CIAT (CSV) | F — **non implémenté** |
| F17 | Interface d'audit (consultation du journal dans l'UI) | F — **non implémenté** (API disponible) |

## 4. Exigences non fonctionnelles
Sécurité (OWASP, voir `securite.md`), accessibilité (clavier, contrastes, `prefers-reduced-motion`), performance (pagination, index), maintenabilité (tests, lint), déploiement (Docker, gunicorn, HTTPS en production).

## 5. Données
Modèle : cohortes, domaines (7 domaines du sujet), porteurs, projets, partenaires, partenariats, financements (voir `database/`). **Aucune donnée officielle du CIAT n'est incluse.** Les données de démonstration sont fictives, étiquetées `is_demo` et signalées dans l'interface.

## 6. Hypothèses provisoires à valider
1. Un projet est « sélectionné » dès les statuts *Sélectionné, En incubation, En prototypage, Terminé* ; *Abandonné* est exclu (on ignore à quelle étape l'abandon a eu lieu).
2. Un « prototype » = stade *Prototype fonctionnel* ou *MVP* (une maquette n'est pas un prototype).
3. Un projet est « en retard » s'il est en cours (*Sélectionné, En incubation, En prototypage*), a une date limite dépassée et une progression < 100 %. Sans date limite : jamais compté en retard (signalé comme limite).
4. Toute idée enregistrée compte comme « idée reçue ».
5. La période filtre la **date de réception** de l'idée.
6. Montants en francs CFA (XOF) ; « obtenu » et « promis » sont distingués.
7. Le genre est celui du **porteur**, comptabilisé par projet.

## 7. Limites assumées
Pas de multi-porteurs par projet, pas de pièces jointes, pas de suivi à 3/6 mois (projet 2), pas d'envoi d'alertes e-mail.

## 8. À compléter par l'équipe
Entretiens utilisateurs (≥ 2), validation des hypothèses ci-dessus, maquettes (infographe), dictionnaire d'indicateurs validé par le data analyst.
