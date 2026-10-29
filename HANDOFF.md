# WillShop — guide de reprise (pour Antigravity, Cursor ou tout autre assistant de code)

> Donne ce fichier en premier à l'outil : « Lis HANDOFF.md, puis fais [ta demande] ».
> Langue de travail : français. Le patron s'appelle Wilfried. La boutique est à Ouagadougou (Burkina Faso).

## 1. Vue d'ensemble

| Élément | Où | Rôle |
|---|---|---|
| **App WillShop** (PWA) | `index.html` (tout en un seul fichier), `sw.js`, `manifest.webmanifest`, `icons/` | App de l'équipe : Direction, Commerciale, Livreur |
| Hébergement de l'app | Vercel, projet `willshop-app`, **https://willshop-app.vercel.app** | Se redéploie tout seul à chaque `git push` sur `main` |
| **Pont Google Sheet** | `apps-script/Code.gs` → projet Apps Script « WillShop Équipe » | API de l'app (connexion par PIN, lecture et écriture des commandes) |
| **Enregistreur du tunnel** | `apps-script/tunnel-logger.gs` → autre projet Apps Script | Reçoit les visites, les prospects et les commandes des tunnels |
| **Google Sheet** | ID `1pTd-mhmjUVUYX1tDb37XChKd23ATgKYhuW9rpLq2Flo` | Base de données |
| **Tunnel Kit Minceur** | `tunnels/kit-minceur-awa.html` → collé dans Systeme.io | Page de vente en ligne : https://abacetiendrebeogo3.systeme.io/kit-minceur |
| Tunnel Green Mask | `tunnels/green-mask-actuel.html` (format chat « Dr Bébé », avec les retouches du Kit du 19/10) | https://abacetiendrebeogo3.systeme.io/green-mask |
| Médias | `media/` (servis par Vercel sous `/media/...`) | Vidéo d'Awa, images, avis clientes |
| Assistant IA | `api/chat.js` (fonction Vercel) | Inactif tant que `ANTHROPIC_API_KEY` n'est pas dans Vercel |

## 2. Règles de sécurité (à respecter)
- **Ne jamais mettre de clé API, de PIN ou de mot de passe dans le code ou le chat.** Les clés vont dans les variables d'environnement Vercel, ajoutées par Wilfried lui-même.
- Ne jamais lancer une pub ni dépenser d'argent.
- Ne jamais afficher publiquement le numéro de téléphone d'un client (avis, captures).
- Toujours prévenir Wilfried avant un gros chantier, et lui montrer un prototype quand c'est visuel.

## 3. Google Sheet : les onglets

| Onglet | Colonnes |
|---|---|
| **Commandes** | A Date · B Produit · C Qté · D Prix · E Zone · F Lieu · G Tél · H Jour · I Statut · J Note · K Relances · L Dernière relance · M Session · N Étape · O Livreur · P Paiement · Q Livrée le · R Modifié par · S Payé le · T Encaissé par · U Remis à la caisse le |
| **Visites** | Arrivée · Produit · Session · Dernière étape · Veut · Zone · Jour · Qté |
| **Équipe** | Nom · Rôle (Direction / Commercial / Livreur) · Téléphone · Actif · PIN (au format texte) |
| **Stock** | Produit · Stock actuel · Seuil · Prix d'achat · Prix de vente · Mise à jour |
| **Mouvements** | Date · Produit · Type · Quantité · Stock après · Par · Note |
| **Caisse** | Déclaré le · Livreur · Montant · Commandes (lignes) · Statut · Validé par · Validé le · Note |
| **Journal** | Date · Qui · Action · Ligne · Client · Détail |

- **Statuts** : Prospect, Nouvelle, Confirmée, En livraison, Reprogrammée, Injoignable, Échec, Livrée, Annulée.
- **Colonne K (Relances)** : jetons séparés par des virgules (`J+1`, `J+3`, `Veille`, `Jour dd/mm`, `Rdd/mm`…).

## 4. Pont Apps Script (`apps-script/Code.gs`)
- URL d'exécution, utilisée dans `index.html` (constante `API`) et dans `api/chat.js` : `https://script.google.com/macros/s/AKfycbxudwbiZxBeTqbPU5XxCkAx1KsCuzcA8Y3qEbTEERqQ8IB6XX4hDwH7Cs3o8l9Sv8G0/exec`
- `doPost` reçoit `{action, cred:{nom,pin}, p}` en `Content-Type: text/plain` (pour éviter les soucis CORS) et répond `{ok, data|error}`.
- Actions : `names`, `login`, `data`, `update`, `addMember`, `setMember`, `remise`, `remiseOk`, `stockMove`, `stockProduct`.
- **Pour mettre à jour le script** : copier `Code.gs` dans l'éditeur Apps Script, puis Déployer → Gérer les déploiements → crayon → Version : **Nouvelle version** → Déployer. L'URL reste la même.

## 5. Tunnel Kit Minceur (`tunnels/kit-minceur-awa.html`)
- Format « appel vidéo » avec Awa, la conseillère : vidéo en haut, bulles vertes pour les questions, boutons jaunes pour les réponses, bouton rouge seulement pour « Commander ».
- **Parcours** : Oui → Ouaga / autre ville → quartier → jour → numéro → récap → Commander (ouvre WhatsApp).
- **Prix** : 6 500 F + 1 000 F de livraison = **7 500 F** ; 2 kits = 11 000 F. Usage : thé le matin, gélule matin et soir.
- **Envoi des données** : `send()` et `logSheet()` vers l'enregistreur (constante `SHEET`).
- **Pixel Meta** `1530587975198974` : événements ViewContent, TunnelDemarre, VilleChoisie, OffreVue, Lead, InitiateCheckout, Contact.
- **Mise en ligne** : Systeme.io → page Kit Minceur → modifier → élément « Code HTML » → Modifier le code → coller le fichier entier → Économiser → **Sauvegarder** (en haut à droite).
- Systeme.io refuse un code trop long (environ 100 000 caractères) : garder les images sur Vercel, pas en base64.
- **Avant chaque mise en ligne**, tester aux tailles 320×568, 360×640, 375×667 et 412×860. Les boutons doivent rester visibles sans défiler.

### Kit Minceur v2 (29/10) — EN LIGNE sur Systeme.io depuis le 29/10 à 13 h 35
- **Fichier en ligne** : `tunnels/kit-minceur-v2.html` (≈ 66 000 caractères). Page Systeme.io : tunnel « TUNNEL SERVICE OFFERT » (celui créé le 17/01/2022, n° 789751), étape « Kit Minceur Dr Bebe », éditeur https://systeme.io/dashboard/page/8445438/edit.
- Vérifié le 29/10 : vidéo `etape1.mp4` au démarrage, Pixel `1530587975198974` (PageView, ViewContent, EtapeVente), visites reçues dans l'onglet Visites.
- **Validateur Systeme.io** : le bouton « Enregistrer » reste grisé (« Le code est invalide ») si une balise `<img>` a `src=""`. Ne jamais laisser de `src` vide.
- **Retour en arrière** : recoller `kit-minceur-awa.html` (c'était exactement le code en ligne avant la v2).
- **Parcours** : 6 étapes vidéo (1 miroir, 2 tout essayé, 3 déclic, 4 solution → « Voir les avis » = 5 preuve ou « Je le veux » = 6 offre) puis Awa en vidéo pour ville (p1), quartier/ville (p2), jour (p3 « aujourd'hui même », bouton « Oui, aujourd'hui 🚀 » + lien discret « Un autre jour » ; après 20 h « demain » sans vidéo), numéro (p4), récap + Commander (p5) → WhatsApp.
- Sous les boutons des étapes 1–5 : lien « ⚡ Commander directement · 6 500 F » (saute à la ville) et « 💬 J'ai une question » (WhatsApp).
- **Vidéo** : Awa en haut (moitié de l'écran), paroles écrites mot à mot sous la vidéo (`CAPS` = `media/kit-v2/captions.json` recopié dans le tunnel), boutons après 1,5 s, bouton « 🔊 Touche pour le son » sur la 1re vidéo (le son s'active ensuite au premier clic). Écran « Décrocher » et plein écran : essayés puis refusés par Wilfried.
- **Prix / paiement** : 6 500 F + 1 000 F de livraison (Ouaga) ou d'expédition (STAF, TSR, Rahimo ou compagnie au choix) = 7 500 F ; 2 kits 11 000 F. Ouaga : paiement à la livraison. Autres villes : Mobile Money avant l'envoi. Promo affichée « jusqu'à dimanche ». Pas de réduction « aujourd'hui » (idée −500 F abandonnée).
- **Médias** : `media/kit-v2/etape1…6.mp4`, `p1…p5.mp4` (+ .jpg d'attente), `awa-kit.jpg` (image fixe), 360×640, ≈ 3,9 Mo au total. Préchargement de la vidéo suivante seulement quand la vidéo en cours joue (3G).
- **Remonter les vidéos** : clips bruts Flow renommés A1…A6, A6b, 1a…6a, P1…P5 dans un dossier, puis `python3 tunnels/kit-minceur-media/build_kit_v2.py <dossier>` (ou `… <dossier> etape3` pour une seule). Les illustrations sont incrustées en haut à droite pendant qu'Awa parle. Après un nouveau montage : recopier `captions.json` dans `CAPS` du tunnel et augmenter `MVV` (vidéos en cache 1 an).
- **Suivi** : Sheet (onglet Visites) : Arrivée, Étape 1…6, Raccourci commande, Question, Veut le produit, Ville, Quartier, Jour, Numéro donné (lead), Offre vue, commande. Pixel (seulement si le Pixel `1530587975198974` est installé sur la page Systeme.io) : ViewContent, EtapeVente, RaccourciCommande, TunnelDemarre, VilleChoisie, Lead, OffreVue, InitiateCheckout, Contact.
- **Prompts Flow** : toujours écrire les nombres en lettres, éviter les marques (« WhatsApp » refusé) et les phrases d'urgence (« stock limité » refusé), écrire « Wagadougou » pour la prononciation. Transcrire les clips reçus pour vérifier ce qu'Awa dit vraiment (Whisper via sherpa-onnx, modèle sur GitHub releases k2-fsa/sherpa-onnx).
- Plan pub complet (compte, pixel, budget jour par jour, structure de campagne, règles) : `tunnels/kit-minceur-media/PLAN_PUB.md`.

## 6. App WillShop (`index.html`)
- **Rôles** : `ceo` (Direction), `sales` (Commerciale), `driver` (Livreur). Les onglets sont définis dans `const ROLES`.
- **Session** : `localStorage` (`ws_name`, `ws_pin`, `ws_profile`, `ws_cache`). L'app s'ouvre avec les dernières données en cache, puis se met à jour en arrière-plan.
- **Logique des actions du jour** : `taskFor()`, `salesBuckets()`, `SALES_STEPS`, `TODO_GROUPS`. Les relances suivent `STEPS` (J+1, J+3, J+7, J+14) et les modèles `TEMPLATES`.
- **Accueil Direction** : `renderHome()`. Commandes : `renderOrders()` / `renderTodo()`. Routine de la commerciale : `renderDay()`.
- **Après chaque modification**, augmenter le numéro de version dans `sw.js` (`willshop-vN`) pour que les téléphones prennent la nouvelle version.
- **Mode simple** pour les vieux téléphones : `?simple=1` (sans manifest).
- **Présentation en bulles (19/10)** : `todoBubbles()` (étapes en bulles, Commandes « À faire » + accueils Direction et Commerciale), `orderCard()` = carte simple qui ouvre la feuille d'actions `sheetHtml()` / `bindSheet()` (état `sh`). Couleurs : classes `k-red`, `k-green`, etc.
- **Fidélisation** : clients livrés relancés à J+3, J+10, J+25 et J+45 après la livraison (`FID_STEPS`, `T_FID`, `fidStep()`), jetons `F+3`… dans la colonne K. Bulle « Fidélisation ». Le tag « Ne pas relancer » les bloque.
- **Tags clients** : enregistrés au début de la colonne J (Note) sous la forme `[Tags: VIP, Fidèle]` ; `tagsOf()` les lit, `noteText()` donne la note sans les tags.

## 8. Superviseur WhatsApp (22/10)
- **But** : lire le WhatsApp de la commerciale (connecté par QR code via Evolution API, serveur Railway) et lui dire qui répondre ou relancer. **Lecture seule** : rien n'est jamais envoyé depuis ce numéro (risque de bannissement), la commerciale envoie elle-même avec le bouton « Écrire ».
- **Flux** : Evolution → webhook `MESSAGES_UPSERT` → pont Apps Script `doPost` avec `?k=<clé>` (`waWebhook_`) → onglet **Messages** (Date ISO · Tél · Nom · Sens IN/OUT · Texte · Type · ID). Onglet **Suivi WA** (Tél · État perso/pause · Jusqu'à · Par · Le).
- **Pont** : actions `waData` (messages 14 j + suivi), `waMark` (perso / pause / reactiver), `waKey` (Direction : clé secrète du webhook, créée toute seule dans les propriétés du script).
- **Vercel** : `api/whatsapp.js` (Direction : statut, QR code, déconnexion ; variables `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` (ou `AUTHENTICATION_API_KEY`), `WA_INSTANCE` facultatif) et `api/relance.js` (bouton « Rédiger avec l'IA », variables `OPENAI_API_KEY`, `OPENAI_SUPERVISOR_MODEL` facultatif).
- **App** : onglet `wa` « WhatsApp » (Direction et commerciale). Moteur entre `/* SV-ENGINE-START */` et `/* SV-ENGINE-END */` (`svEvaluate`, `svBuild`) : jamais répondu, attend une réponse, promesse dite sur WhatsApp, intéressé sans commande, ne répond plus. Les relances liées à une commande restent dans « Ma journée ».

## 7. Chantiers à faire (par ordre de priorité)

### A. Checklist et suivi de la commerciale — ✅ FAIT le 19/10 (pont v5)
Réalisé avec l'onglet « Tâches » (Date · Qui · Type · Clé · Faite à · Note · Ajoutée par), sans colonne V dans Commandes : les contacts enregistrés sont des lignes de type `contact` dont la clé est le numéro. Code : `renderSalesHome()`, `teamDay()`, `crText()`, `renderTeamFollow()`. Spécification d'origine :
1. **Nouvel onglet « Accueil » pour `sales`**, affiché après « Ma journée » (et par défaut quand `ws_dayDone` = aujourd'hui).
   - Bloc « À faire maintenant » : une ligne par groupe de `TODO_GROUPS`, avec le nombre. Un toucher ouvre Commandes en mode « À faire » sur ce groupe.
2. **Checklist du jour** (enregistrée dans un nouvel onglet **« Tâches »** : Date · Qui · Tâche · Prévue à · Faite à · Note · Ajoutée par) :
   - Poster les statuts WhatsApp du matin.
   - Enregistrer les contacts des nouveaux clients : liste des numéros du jour avec un bouton « Enregistré ✓ » (nouvelle colonne **V « Contact enregistré »** dans Commandes), plus un bouton qui prépare le message *« Enregistre notre numéro pour voir nos nouveautés et promos dans nos statuts 🙏 »*.
   - **Comptes-rendus à 10 h, 12 h, 14 h, 16 h et 18 h** dans le groupe WhatsApp (horaires confirmés par Wilfried). Le texte est généré automatiquement (commandes confirmées, relances envoyées, contacts enregistrés, injoignables) et partagé avec `https://wa.me/?text=...`. Le bouton marque le compte-rendu comme posté.
   - Tâches libres ajoutées par la Direction.
   - Rappel dans l'app quand un compte-rendu est en retard de plus de 30 min.
3. **Pont** : nouvelles actions `tasks` (lecture), `taskDone`, `taskAdd` (Direction seulement). Champ `contact` autorisé dans `update` (colonne 22). Lire 22 colonnes au lieu de 21.
4. **Accueil Direction** : bloc « Suivi de Yasmine » (routine x/y, heure des statuts, contacts enregistrés x/y, comptes-rendus ✓/✗, historique sur 7 jours).

### B. Notifications toutes les 2 h (plus tard)
Web Push : clés VAPID dans les variables Vercel, abonnements enregistrés dans le Sheet, et un déclencheur Apps Script toutes les 2 h qui appelle une fonction Vercel d'envoi (le cron gratuit de Vercel ne tourne qu'une fois par jour). Le Huawei de Yasmine n'a pas les services Google : pour elle, garder les rappels dans l'app.

### C. Tunnel Green Mask avec Awa
Même modèle que le Kit, livraison à 1 000 F. En attente de la vidéo d'Awa avec le Green Mask.

### D. Plus tard
- Assistant IA : Wilfried ajoute `ANTHROPIC_API_KEY` dans Vercel.
- Branchement respond.io (forfait Growth requis pour l'API) ou API WhatsApp Cloud de Meta (projet « Mon Closeur »).

## Will Academy (app séparée)

- Code : dossier `academie/` → projet Vercel `willshop--academie`, adresse **https://will-academy.vercel.app** (dossier racine = `academie`).
- Ne jamais la remettre sous willshop-app.vercel.app : l'app WillShop (scope `/`) l'avalerait. L'ancienne adresse `/academie/` renvoie vers la nouvelle.
- Données : Sheet « WillShop Académie » (ID 1Zdj2DA8Zh_iHEfdvYg6GdFTNMSsjth0v8W2-TXOxIhU), onglets Prospects, Relances, Config (PIN en B1), Budget pub, Tableau de bord.
- API : `apps-script/tunnel-logger.gs` (projet « WillShop Commandes Tunnels »), requêtes `{app:1, action, pin, p}`.

## Tunnel Will Academy (formation vidéos IA) — état au 27/10/2026

- **Format retenu** : « appel vidéo » comme le Kit Minceur. Vidéo de Sadia en haut (une par étape), ses paroles s'écrivent mot à mot dessous pendant qu'elle parle, puis les boutons. Fichier : `tunnels/will-academy-appel.src.html` (build : `cd tunnels && python3 build-will-academy.py`).
- Versions abandonnées (gardées pour mémoire) : `will-academy-chat`, `will-academy-jeu`, `will-academy-parcours`, `will-academy-video`.
- **Vidéos** : `academie/media/*.mp4` servies sur https://will-academy.vercel.app/media/ (montage : `python3 academie/media/build_videos.py <dossier>` → recadrage 4:5, logo, son, `captions.json` = minutage des paroles). Les 8 vidéos actuelles sont à refaire (erreurs de prononciation, phrases manquantes, ordre du parcours à revoir).
- **Pas encore en ligne** : la page Systeme.io /videos-ia garde l'ancien tunnel Sadia + le script de suivi `tunnels/formation-videos-ia-tracking.html` dans son code de pied de page. À la mise en ligne : remplacer le bloc de code et retirer ce script (sinon double comptage).
- Suivi : le tunnel envoie au Sheet « WillShop Académie » et au Pixel 2354404514688190 seulement sur systeme.io.
- Présentiel du 23/10 retiré du nouveau tunnel (date passée).
