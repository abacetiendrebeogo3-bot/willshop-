# WillShop

App de pilotage de WillShop (Ouagadougou) : une seule app, trois espaces selon la personne connectée.

- **Direction** : revue du matin étape par étape, encaissé du jour, tunnel, trésorerie (Espèces, Orange Money, Moov Money), équipe.
- **Commercial** : « Ma journée » en 7 étapes (livraisons du jour, confirmations, relances J+1/J+3/J+7/J+14, veille de livraison, prospects, problèmes, attribution), rappel des oubliés toutes les 2 heures. Les messages WhatsApp partent du téléphone de la personne connectée.
- **Livreur** : ses livraisons du jour, Je pars, Livré (mode de paiement), Échec (motif), Reprogrammer.

## Fonctionnement

- Site statique (HTML/JS, sans build), installable comme application (PWA) avec le logo WillShop.
- Les données restent dans le Google Sheet « WillShop - Commandes Tunnels » (onglets Commandes, Visites, Équipe).
- `apps-script/Code.gs` est le pont sécurisé entre l'app et le Sheet (Google Apps Script, déployé en application Web). Chaque appel vérifie le nom et le PIN de l'onglet Équipe ; chaque rôle ne peut modifier que ses colonnes.

## Ajouter quelqu'un

Dans l'app (Direction → Équipe) ou directement dans l'onglet « Équipe » du Sheet : Nom, Rôle (Direction, Commercial ou Livreur), Téléphone, Actif (Oui/Non), PIN.

## Déploiement

Vercel, projet relié à ce dépôt : chaque modification poussée sur `main` est mise en ligne automatiquement.
