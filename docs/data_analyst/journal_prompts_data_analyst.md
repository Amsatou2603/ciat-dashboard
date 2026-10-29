# Journal des Prompts — Data Analyst
## Projet 3 : Tableau de Bord Décisionnel du CIAT
### ISEP Amadou Trawaré de Diamniadio

**Date** : 26 octobre 2026  
**Profil** : Data Analyst  
**Outil IA utilisé** : Antigravity (Claude)

---

## Objectif du journal

Ce journal documente l'ensemble des interactions significatives avec l'IA générative lors du développement de la partie Data Analyst du projet. Conformément aux exigences de l'évaluation (Livrable n°8), chaque entrée précise le prompt utilisé, le résultat obtenu, les corrections apportées et la valeur ajoutée.

---

## Prompt 1 : Conception du jeu de données

**Contexte** : Besoin de créer un jeu de données réaliste et documenté pour alimenter le tableau de bord.

**Prompt initial** :  
> « Crée un jeu de données JSON simulé pour le CIAT (Centre d'Innovation, d'Application et de Transfert) de l'ISEP Amadou Trawaré de Diamniadio. Il doit contenir : 4 cohortes (2023-2026), des domaines d'activité alignés sur les priorités, 25 porteurs de projets avec parité genre, 20 projets incubés avec budgets en FCFA, statuts, progression, jalons, partenaires. Ajoute aussi des données de financements annuels et d'événements. »

**Résultat initial obtenu** : Fichier JSON structuré avec des domaines généralistes. La classification a ensuite été remplacée par les domaines et sous-domaines confirmés par l'équipe.

**Corrections apportées** :
- ✅ Vérifié la cohérence budget_depense ≤ budget_accorde ≤ budget_demande pour chaque projet
- ✅ Vérifié que les noms et prénoms sont courants au Sénégal
- ✅ Ajusté les montants en FCFA pour être réalistes (3M–10M par projet)
- ✅ Remplacé la taxonomie initiale par TIC et Automobile ainsi que les dix sous-domaines fournis

**Valeur ajoutée de l'IA** : Gain de temps considérable (~2h) pour la génération de données cohérentes. Sans IA, la création manuelle de 20 projets avec jalons, budgets et relations aurait pris 4–6h.

**Limite de la classification** : Le jeu de démonstration ne contient pas de projet automobile confirmé. Les deux projets de robotique industrielle restent sans domaine/sous-domaine, et les affectations TIC proposées doivent être validées par l'équipe.

---

## Prompt 2 : Dictionnaire des données

**Contexte** : Exigence du livrable n°5 (schéma et dictionnaire des données).

**Prompt** :  
> « Génère un dictionnaire des données complet en Markdown pour le jeu de données CIAT. Pour chaque table, liste les champs avec : type, description, exemple, contraintes. Ajoute les règles de qualité et les contrôles appliqués. Inclus une section sur la protection des données conforme à la loi sénégalaise. »

**Résultat obtenu** : Document Markdown structuré avec les entités documentées, diagramme ER en Mermaid, règles de qualité et section sur la protection des données.

**Corrections apportées** :
- ✅ Ajouté la référence à la Loi sénégalaise n°2008-12 (la protection des données personnelles)
- ✅ Précisé que les données sont fictives dans un avertissement encadré
- ✅ Ajouté un script Node.js reproductible pour contrôler les données (`node data\validate_data.js`)
- ✅ Documenté séparément le périmètre des 20 projets détaillés et des 77 sélections agrégées

**Valeur ajoutée de l'IA** : Structuration automatique et exhaustive. L'IA a permis de ne pas oublier de champs et de proposer des contraintes de validation pertinentes.

---

## Prompt 3 : Définition des KPIs

**Contexte** : Exigence de la section 9.2 (« Définition précise des indicateurs »).

**Prompt** :  
> « Définis les indicateurs clés de performance (KPIs) pour un tableau de bord décisionnel d'un incubateur universitaire au Sénégal. Catégorise-les en : volume, performance, financier, impact/inclusion. Pour chaque KPI, donne la formule de calcul, une cible réaliste et l'interprétation. »

**Résultat obtenu** : 10 KPIs structurés en 4 catégories avec formules, cibles et interprétations.

**Corrections apportées** :
- ✅ Ajusté le taux de sélection cible (de 15-20% à 20-30%) pour refléter un incubateur universitaire
- ✅ Ajouté le KPI « Taux d'abandon » non proposé initialement
- ✅ Recalculé manuellement chaque valeur pour vérifier l'exactitude

**Valeur ajoutée de l'IA** : Proposition de KPIs standards et suggestion de cibles basées sur les benchmarks des incubateurs africains.

---

## Prompt 4 : Tableau de bord interactif

**Contexte** : Développement du tableau de bord avec graphiques et filtres.

**Prompt** :  
> « Crée un tableau de bord web interactif en HTML/CSS/JavaScript avec Chart.js pour visualiser les données du CIAT. Il doit avoir : une sidebar de navigation, des filtres (cohorte, domaine, statut), des KPI cards animées, des graphiques (barres, donut, radar, polaire), des tables de données, une section d'analyse avec recommandations, et un export CSV/JSON/PDF. Design dark mode premium. »

**Résultat obtenu** : Application web complète (3 fichiers : HTML, CSS, JS) avec 12+ graphiques, filtres dynamiques, 5 sections, export multi-format.

**Corrections apportées** :
- ✅ Ajouté le responsive design pour mobile (non inclus dans la première version)
- ✅ Corrigé le chargement des données (fallback si fetch échoue en local)
- ✅ Ajouté les styles d'impression (@media print) pour l'export PDF
- ✅ Vérifié l'accessibilité (labels, aria, contrastes)
- ✅ Ajouté la destruction des charts avant recréation (memory leak)

**Valeur ajoutée de l'IA** : Génération rapide d'un prototype fonctionnel. L'IA a proposé une architecture modulaire (séparation HTML/CSS/JS) et des bonnes pratiques (destroy charts, fallback loading).

---

## Prompt 5 : Analyses et recommandations

**Contexte** : Section 9.2 — « Interprétation des résultats et recommandations ».

**Prompt** :  
> « Analyse les données du CIAT et produis : 5 points forts, 5 points d'attention, 6 recommandations actionnables, et 5 limites des données. Contextualise au Sénégal et aux incubateurs universitaires. »

**Résultat obtenu** : Analyses structurées avec données chiffrées à l'appui et recommandations prioritisées.

**Corrections apportées** :
- ✅ Recalculé les effectifs, les retards, les notes, les budgets et les répartitions à partir du JSON
- ✅ Remplacé les sept anciens domaines par TIC et Automobile et leurs dix sous-domaines validés
- ✅ Classé provisoirement les projets numériques pertinents en TIC; laissé non classés les deux projets de robotique industrielle sans correspondance exacte
- ✅ Signalé qu'aucun projet automobile n'est présent dans le jeu simulé au lieu d'inventer des données automobiles
- ✅ Clarifié les deux dénominateurs de genre : 48% dans le registre complet et 53% parmi les porteurs liés aux projets détaillés
- ✅ Corrigé le nombre de projets par statut et domaine, le total des participants aux événements et le taux de retard
- ✅ Retiré les comparaisons externes non appuyées par une source présente dans le dossier
- ✅ Signalé l'écart de périmètre entre les 77 sélections agrégées et les 20 projets détaillés, ainsi que l'écart budgétaire 2024

**Valeur ajoutée de l'IA** : Capacité à structurer les indicateurs et les recommandations. La vérification humaine et le contrôle programmatique ont permis de repérer plusieurs incohérences entre le JSON, le rapport et le tableau de bord.

---

## Prompt 6 : Rapport d'analyse

**Contexte** : Livrable n°6 — rapport de 5 à 10 pages.

**Prompt** :  
> « Rédige un rapport d'analyse complet pour le tableau de bord décisionnel du CIAT. Structure : intro, méthodologie, KPIs, analyses descriptives, visualisations, recommandations, limites. 8-10 pages. Format académique avec tableaux. »

**Résultat obtenu** : Rapport structuré en 7 sections avec tableaux synthétiques, analyses par dimension et perspectives.

**Corrections apportées** :
- ✅ Ajouté les tableaux de données détaillés (candidatures par cohorte, projets par domaine, etc.)
- ✅ Reformulé la section « Perspectives » pour inclure l'assistant IA en langage naturel
- ✅ Rapproché les chiffres du rapport et du tableau de bord avec les agrégats et les 20 projets détaillés
- ✅ Documenté les limites d'interprétation et retiré les conclusions non justifiées par les données

**Valeur ajoutée de l'IA** : Structuration académique rapide. L'IA a proposé un plan complet et rempli les sections avec des données cohérentes. Le temps de rédaction est passé de ~6h estimées à ~2h (incluant la vérification).

---

## Synthèse de l'utilisation de l'IA

| Métrique | Valeur |
|----------|--------|
| Nombre de prompts significatifs | 6 |
| Temps estimé sans IA | ~20 heures |
| Temps réel avec IA | ~6 heures |
| Gain de productivité | ~70% |
| Corrections humaines apportées | 15+ |
| Incohérences de chiffres et de périmètre corrigées | Plusieurs |
| Améliorations ajoutées manuellement | 8 |

### Leçons apprises

1. **L'IA ne remplace pas la vérification** : 2 erreurs de calcul ont été détectées lors de la relecture humaine. La validation manuelle est indispensable.

2. **Le prompt engineering compte** : des prompts détaillés avec contexte (Sénégal, ISEP, FCFA) produisent des résultats nettement plus pertinents.

3. **L'IA excelle dans la structuration** : la génération de dictionnaires de données, de structures JSON et de rapports structurés est le point fort observé.

4. **Le jugement humain reste essentiel** : le choix des KPIs pertinents, l'ajustement des cibles et la contextualisation des recommandations nécessitent une expertise métier humaine.

---

*Journal rédigé dans le cadre de l'évaluation pratique du cours d'Intelligence Artificielle Générative  
ISEP Amadou Trawaré de Diamniadio — Octobre 2026*
