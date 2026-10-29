# Rapport d'Analyse — Tableau de Bord Décisionnel du CIAT
## Centre d'Innovation, d'Application et de Transfert
### ISEP Amadou Trawaré de Diamniadio

**Projet 3** — Évaluation pratique du cours d'Intelligence Artificielle Générative  
**Profil** : Data Analyst  
**Date** : 26 octobre 2026  
**Version** : 1.0

---

## Table des matières

1. [Introduction et contexte](#1-introduction-et-contexte)
2. [Méthodologie d'analyse](#2-méthodologie-danalyse)
3. [Définition des indicateurs clés (KPIs)](#3-définition-des-indicateurs-clés-kpis)
4. [Analyse descriptive des données](#4-analyse-descriptive-des-données)
5. [Visualisations et interprétations](#5-visualisations-et-interprétations)
6. [Recommandations](#6-recommandations)
7. [Limites et perspectives](#7-limites-et-perspectives)

---

## 1. Introduction et contexte

Le Centre d'Innovation, d'Application et de Transfert (CIAT) de l'ISEP Amadou Trawaré de Diamniadio est un acteur clé de l'écosystème d'innovation sénégalais. Depuis sa création, il a accompagné plusieurs cohortes de porteurs de projets dans des domaines stratégiques : TIC, agriculture, énergie, santé, mécanique, éducation et services.

Le **Projet 3 — Tableau de bord décisionnel** a pour objectif de fournir aux décideurs du CIAT un outil d'analyse interactif permettant de :
- Suivre l'évolution des activités et des résultats
- Identifier les tendances et les alertes
- Soutenir la prise de décision stratégique
- Rendre compte aux partenaires et bailleurs de fonds

Ce rapport présente l'analyse complète des données, la définition des indicateurs, les résultats obtenus et les recommandations formulées.

---

## 2. Méthodologie d'analyse

### 2.1 Sources de données

Les données analysées proviennent d'un **jeu de données simulé** (`donnees_ciat.json`) construit à des fins pédagogiques. Le jeu de données couvre :

| Entité | Nb d'enregistrements | Période |
|--------|---------------------|---------|
| Cohortes | 4 | 2023–2026 |
| Projets détaillés | 20 | 2023–2026 (sous-ensemble) |
| Porteurs de projets | 25 | — |
| Domaines d'activité | 2 | TIC et Automobile |
| Sous-domaines | 10 | TIC (6), Automobile (4) |
| Financements | 4 (annuels) | 2023–2026 |
| Partenariats | 18 | 2023–2026 |
| Événements | 12 | 2023–2026 |

Les 77 sélections (12, 18, 22 et 25 par cohorte) sont des agrégats; elles ne correspondent pas aux 20 projets détaillés, qui constituent un sous-ensemble. Le taux de sélection est calculé avec les agrégats de cohorte, tandis que les analyses de statut, de domaine, de budget par projet et de porteurs portent sur les 20 enregistrements détaillés. Les candidatures ne sont pas ventilées par domaine ou statut.

### 2.2 Outils utilisés

- **Visualisation** : Chart.js 4.4.0 (bibliothèque JavaScript de graphiques)
- **Traitement** : JavaScript vanilla (calculs d'indicateurs côté client)
- **Export** : CSV (pour Excel), JSON (pour réutilisation), PDF (impression)
- **Assistance IA** : IA générative utilisée pour accélérer la structuration des données et la rédaction (avec vérification humaine systématique)

### 2.3 Contrôle de qualité

Les contrôles de qualité reproductibles sont exécutés avec `node data/validate_data.js` (détails dans le dictionnaire des données) :
- Complétude des champs obligatoires (100%)
- Cohérence des clés étrangères
- Cohérence budgétaire
- Validité des plages de valeurs
- Unicité des identifiants
- Absence de doublons

---

## 3. Définition des indicateurs clés (KPIs)

Les cibles indiquées ci-dessous sont des seuils pédagogiques proposés pour l'exercice; elles ne sont pas des objectifs officiels validés par le CIAT.

### 3.1 Indicateurs de volume et d'activité

| KPI | Formule | Cible | Valeur actuelle |
|-----|---------|-------|-----------------|
| Projets détaillés | Comptage distinct des enregistrements | — | **20** (sur 77 sélections agrégées) |
| Candidatures par cohorte | Moyenne des candidatures des 4 cohortes | ≥ 50 | **72,5** |
| Taux de sélection agrégé | Sélections agrégées / candidatures agrégées × 100 | — | **26,6%** (77/290) |

### 3.2 Indicateurs de performance

| KPI | Formule | Cible | Valeur actuelle |
|-----|---------|-------|-----------------|
| Taux de déploiement | Projets déployés / Total × 100 | ≥ 15% | **10%** |
| Progression moyenne | Moyenne(progression) sur les 20 projets détaillés | — | **63,6%** |
| Note moyenne d'évaluation | Moyenne des 16 notes renseignées | — | **15,0/20** |
| Taux d'abandon | Projets abandonnés / Total × 100 | ≤ 10% | **5%** |

### 3.3 Indicateurs financiers

| KPI | Formule | Cible | Valeur actuelle |
|-----|---------|-------|-----------------|
| Budget annuel total alloué (4 ans) | Somme des enveloppes annuelles | — | **88,6M FCFA** |
| Taux d'exécution budgétaire | Dépensé / Alloué × 100 | ≥ 80% | **62,8%** |
| Budget accordé moyen par projet détaillé | Somme des budgets accordés / 20 | — | **4,24M FCFA** |

### 3.4 Indicateurs d'impact et d'inclusion

| KPI | Formule | Cible | Valeur actuelle |
|-----|---------|-------|-----------------|
| Part des femmes parmi les 17 porteurs associés aux projets détaillés | Porteuses F / Total porteurs distincts × 100 | ≥ 40% | **53%** (9/17) |
| Nb de partenaires actifs | Comptage(actif = true) | ≥ 15 | **18** |
| Participants aux événements | Somme(participants) | — | **1 335** |
| Retard moyen (projets en retard) | Moyenne(retard_jours > 0), sur 13 projets | ≤ 10 jours | **14,1 jours** |

---

## 4. Analyse descriptive des données

### 4.1 Évolution des candidatures

L'analyse révèle une **croissance constante et significative** des candidatures :

| Cohorte | Candidatures | Sélectionnés | Taux de sélection |
|---------|-------------|-------------|-------------------|
| 2023 | 45 | 12 | 26.7% |
| 2024 | 68 | 18 | 26.5% |
| 2025 | 82 | 22 | 26.8% |
| 2026 | 95 | 25 | 26.3% |

**Interprétation** : Dans ce jeu simulé, les candidatures agrégées augmentent de 111% entre 2023 et 2026. Le taux de sélection calculé sur les agrégats reste proche de 26,6% sur les quatre cohortes. Ces données ne suffisent pas à conclure sur l'attractivité ou la qualité du processus.

### 4.2 Répartition par domaine et sous-domaine

Les anciens domaines ont été remplacés par les deux domaines demandés. Les affectations TIC ci-dessous sont des propositions faites à partir des courtes descriptions des projets simulés; elles doivent être confirmées par les porteurs et les mentors.

| Domaine | Sous-domaine | Nb projets détaillés |
|---------|--------------|---------------------:|
| TIC | Analyse des performances digitales | 3 |
| TIC | Administration de bases de données | 2 |
| TIC | Administration systèmes, sécurité et cloud | 1 |
| TIC | Réseaux, sécurité et IoT | 5 |
| TIC | Développement backend | 3 |
| TIC | Développement frontend | 4 |
| Automobile | Électromécanique automobile | 0 |
| Automobile | Carrosserie et peinture | 0 |
| Automobile | Froid et climatisation automobile | 0 |
| Automobile | Électromécanique et électronique automobile | 0 |
| Non classé | À confirmer (robotique industrielle) | 2 |

**Interprétation** : Les 18 projets affectés sont des propositions de classement TIC. Aucun projet fourni ne décrit clairement une activité Automobile; ses sous-domaines apparaissent donc à zéro, et deux projets de robotique industrielle restent non classés plutôt que de leur attribuer une catégorie automobile inexacte. Ces données restent simulées.

### 4.3 Analyse par statut

| Statut | Nb | Part (%) |
|--------|-----|----------|
| En cours | 9 | 45% |
| Prototype validé | 6 | 30% |
| Déployé | 2 | 10% |
| Idée | 2 | 10% |
| Abandonné | 1 | 5% |

**Interprétation** : Neuf des 20 projets détaillés sont en cours (45%), six ont un prototype validé (30%), deux sont déployés (10%), deux sont au stade idée (10%) et un est abandonné (5%). Les statuts ne permettent pas, à eux seuls, de juger la performance du dispositif.

### 4.4 Analyse genre

Dans le registre des 25 porteurs, 13 sont des hommes (52%) et 12 des femmes (48%). Parmi les 17 porteurs distincts liés aux 20 projets détaillés, 8 sont des hommes (47%) et 9 des femmes (53%).

**Interprétation** : Le résultat dépend du dénominateur : 48% pour le registre complet et 53% pour les porteurs des projets détaillés. Aucune comparaison externe n'est faite, faute de source de référence dans le jeu de données.

### 4.5 Analyse des retards

| Catégorie de retard | Nb projets | Part (%) |
|---------------------|-----------|----------|
| Aucun retard (0 jours) | 7 | 35% |
| Retard léger (1–10 jours) | 7 | 35% |
| Retard modéré (11–20 jours) | 4 | 20% |
| Retard important (> 20 jours) | 2 | 10% |

Treize projets sur 20 (65%) ont un retard supérieur à zéro; la moyenne parmi ces 13 projets est de **14,1 jours**. Les retards les plus élevés sont ceux de **MécaBot** (45 jours), **RoboAssist** (25 jours) et **DataViz Sénégal** (20 jours). Les deux projets de Mécanique sont en retard, pour une moyenne de 35 jours; l'effectif est trop faible pour généraliser cette observation au domaine.

### 4.6 Analyse financière

| Année | Budget alloué | Budget dépensé | Taux d'exécution |
|-------|--------------|----------------|-----------------|
| 2023 | 16,5M | 14,05M | 85,2% |
| 2024 | 28,4M | 22,7M | 79,9% |
| 2025 | 24,0M | 13,9M | 57,9% |
| 2026 | 19,7M | 5,0M | 25,4% |

**Interprétation** : Les taux sont de 85,2% (2023), 79,9% (2024), 57,9% (2025) et 25,4% (2026, cohorte indiquée « En cours »). L'enveloppe 2024 (28,4 M FCFA) dépasse de 3,8 M FCFA le total des budgets accordés aux projets détaillés de cette cohorte (24,6 M FCFA); la différence de périmètre n'est pas expliquée dans les données. Le total des budgets accordés aux 20 projets détaillés est de 84,8 M FCFA (4,24 M FCFA en moyenne), contre 88,6 M FCFA pour les enveloppes annuelles. Ces deux indicateurs ne sont donc pas interchangeables.

---

## 5. Visualisations et interprétations

Le tableau de bord interactif (`dashboard/index.html`) propose **12 graphiques** répartis dans les sections Vue d'ensemble, Projets, Financements et Partenaires, ainsi qu'une section d'analyse et une synthèse des KPI :

### Section "Vue d'ensemble"
1. **6 KPI Cards** — Synthèse visuelle des indicateurs majeurs avec tendances
2. **Graphique barres** — Candidatures vs sélections par cohorte
3. **Graphique donut** — Répartition des projets par sous-domaine (les dix sous-domaines)
4. **Graphique donut** — Répartition par genre des porteurs
5. **Graphique barres horizontales** — Progression des projets actifs

### Section "Projets"
6. **Graphique barres empilées** — Statut des projets par cohorte (comparaison)
7. **Graphique barres** — Retards par projet (en jours)
8. **Graphique radar** — Notes d'évaluation (sur 20)
9. **Tableau de données** — Liste détaillée avec barres de progression

### Section "Financements"
10. **Graphique barres** — Budget alloué vs dépensé par année
11. **Graphique donut** — Sources de financement (2026)
12. **Graphique barres horizontales** — Budget par projet (accordé vs dépensé)

### Section "Partenaires"
13. **Graphique barres** — Partenariats par type
14. **Graphique polar** — Événements par type

### Section "Analyses"
15. **4 cartes d'analyse** — Points forts, attention, recommandations, limites
16. **Tableau KPI** — Référentiel complet avec formules et interprétations

Les graphiques de projets répondent aux filtres de cohorte, de domaine, de sous-domaine et de statut. Le graphique et le KPI de candidatures/sélections répondent au filtre de cohorte uniquement : les données agrégées ne sont pas ventilées par domaine ou statut. Les cartes d'analyse présentent une synthèse globale et ne sont pas recalculées par filtre.

---

## 6. Recommandations

### Recommandation 1 : Renforcer l'accompagnement des projets matériels
**Constat** : Les deux projets de Mécanique sont en retard (35 jours en moyenne), mais l'effectif est trop faible pour établir une tendance sectorielle ou une cause.  
**Action** : Examiner leurs jalons, dépendances et délais d'approvisionnement avec les mentors, puis suivre ces éléments sur les prochaines cohortes avant de définir un dispositif dédié.

### Recommandation 2 : Système d'alerte précoce
**Constat** : 65% des projets détaillés présentent un retard supérieur à zéro (13 sur 20).  
**Action** : Enregistrer les dates prévues et réelles des jalons, puis déclencher une alerte lorsqu'un retard dépasse un seuil validé par le CIAT. Le retard cumulé du projet ne permet pas à lui seul de reconstruire la date de chaque alerte.

### Recommandation 3 : Maintenir et renforcer la parité
**Constat** : Les femmes représentent 48% du registre des porteurs et 53% des porteurs associés aux projets détaillés.  
**Action** : Suivre ces deux indicateurs avec des dénominateurs constants, puis consulter les utilisateurs pour identifier d'éventuels obstacles avant de définir des actions ciblées.

### Recommandation 4 : Diversifier les financements internationaux
**Constat** : La source « International » représente 1,5 M FCFA (7,6% de l'enveloppe 2026 simulée).  
**Action** : Vérifier d'abord la classification des sources et les besoins non couverts, puis identifier les appels à financement adaptés au portefeuille du CIAT.

### Recommandation 5 : Suivi post-incubation structuré
**Constat** : Le jeu de données ne contient pas d'indicateurs de suivi après déploiement.  
**Action** : Collecter à 6, 12 et 24 mois des données vérifiables sur les utilisateurs, revenus, emplois créés et continuité d'activité.

### Recommandation 6 : Fonds d'amorçage pour les meilleurs projets
**Constat** : Les notes d'évaluation seules ne renseignent pas les besoins de financement ni la viabilité commerciale des projets.  
**Action** : Définir des critères de sélection comprenant les jalons réalisés, le besoin financier documenté et le potentiel de mise en œuvre avant de proposer un fonds d'amorçage.

---

## 7. Limites et perspectives

### 7.1 Limites

1. **Données simulées** : ce rapport s'appuie sur un jeu de données fictif. Les analyses sont méthodologiquement valides mais les conclusions ne sont pas directement transposables au CIAT réel.

2. **Absence de données temporelles fines** : les données ne contiennent pas de séries temporelles (consommation quotidienne des budgets, progression hebdomadaire), limitant l'analyse de tendances.

3. **Pas de données d'impact** : les indicateurs d'impact (emplois créés, chiffre d'affaires, bénéficiaires) ne sont pas disponibles, empêchant une évaluation complète de la valeur créée.

4. **Périmètre partiel** : les cohortes recensent 77 sélections agrégées, tandis que 20 projets seulement sont détaillés. Les candidatures rejetées et les caractéristiques des candidats ne sont pas disponibles.

5. **Rapprochement financier incomplet** : l'enveloppe annuelle 2024 dépasse de 3,8 M FCFA les budgets accordés aux projets détaillés de la cohorte. Les causes de cet écart et le traitement des frais de fonctionnement ne sont pas précisés.

### 7.2 Perspectives

- **Intégration d'un assistant IA** : permettre d'interroger les données en langage naturel (« Quel est le projet le plus avancé du domaine Énergie ? »)
- **Prédiction des retards** : utiliser un modèle de machine learning pour prédire les projets à risque de retard
- **Connexion en temps réel** : relier le tableau de bord à une base de données en production
- **Benchmarking** : comparer les performances du CIAT avec d'autres incubateurs de la sous-région

---

*Rapport rédigé dans le cadre de l'évaluation pratique du cours d'Intelligence Artificielle Générative  
ISEP Amadou Trawaré de Diamniadio — Octobre 2026*
