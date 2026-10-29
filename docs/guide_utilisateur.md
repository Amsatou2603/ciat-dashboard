# Guide utilisateur (version initiale)

## Se connecter
Ouvrir l'application, saisir identifiant et mot de passe fournis par l'administrateur. Après 5 échecs, le compte est bloqué 15 minutes. **Se déconnecter** : menu du compte (en haut à droite). La session se renouvelle automatiquement ; au-delà de 7 jours d'inactivité, reconnectez-vous.

## Le tableau de bord
- **Filtres** (barre sous l'en-tête) : période (date de réception), cohorte, domaine, statut, porteur (selon votre rôle). Ils s'appliquent à **tous** les indicateurs et graphiques et sont conservés dans l'adresse de la page (partageable). « Réinitialiser » les efface. Sur téléphone : bouton **Filtres**.
- **Idées reçues** + courbe mensuelle ; **À surveiller** : projets en retard (cliquez pour ouvrir le projet).
- **Bandeau d'indicateurs** : sélectionnés, prototypes, progression moyenne, partenariats, financements obtenus (et promis), porteurs distincts. « n/d » = donnée non calculable (jamais un faux zéro).
- **Répartitions** par statut et domaine : **cliquer une ligne** applique le filtre. Comparaison des cohortes, progression, genre, financements.
- Un bandeau signale les **données fictives de démonstration**.

## Gérer les projets (Coordonnateur, Administrateur)
*Projets* → **Nouveau projet** : titre, cohorte, domaine, porteur (ou « + Nouveau porteur »), dates, statut, progression, prototype. Des règles protègent la cohérence (ex. : un projet *Terminé* est à 100 %). **Modifier** (crayon), **Supprimer** (corbeille, confirmation obligatoire). La fiche d'un projet permet d'ajouter des **partenariats** et des **financements**.

## Synthèse, exports
- *Synthèse* : fiche de la période (indicateurs, observations, cohortes, retards, **limites des données**).
- *Exports* (Analyste et plus) : PDF, Excel (2 feuilles), image ; ils reflètent les **filtres actifs**. Limite : 20 exports par heure.

## Assistant IA (Analyste et plus)
Posez une question en français (≤ 500 caractères) ou cliquez une suggestion. Les chiffres viennent **toujours** du calcul serveur. L'étiquette indique :
- **« Calculé par le serveur (sans IA) »** : le service IA n'est pas configuré ou indisponible ;
- **« Explication générée par IA »** : un modèle a reformulé le résultat — vérifiez les chiffres dans le tableau de bord.
Votre historique (20 derniers échanges) n'est visible que par vous et peut être effacé.

## Administrer les utilisateurs (Administrateur)
*Utilisateurs* : créer un compte, choisir le rôle, désactiver (réversible) ou supprimer. Vous ne pouvez ni vous rétrograder, ni vous supprimer, ni supprimer le dernier administrateur.

## Rôles
| | Admin | Coordo. | Analyste | Lecteur |
|---|:-:|:-:|:-:|:-:|
| Consulter indicateurs / projets | ✔ | ✔ | ✔ | ✔ |
| Voir identité et genre des porteurs | ✔ | ✔ | ✔ | ✘ |
| Créer / modifier / supprimer | ✔ | ✔ | ✘ | ✘ |
| Exporter, assistant IA | ✔ | ✔ | ✔ | ✘ |
| Gérer les utilisateurs | ✔ | ✘ | ✘ | ✘ |

## Accessibilité et affichage
Thème clair / sombre / système (en haut à droite). Navigation au clavier : lien « Aller au contenu » avec Tab ; fenêtres fermables avec Échap. Les animations sont réduites si votre système le demande.
