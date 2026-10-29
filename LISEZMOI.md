# Yokkute PME · CADE / CCIAK

Application de diagnostic 360°, de Plan de Développement Individuel (PDI), de suivi et de rapports d'activités.
Elle fonctionne sur ordinateur, tablette et téléphone, avec ou sans connexion.

## Essai immédiat (mode local)
Tant que `js/config.js` contient `A_REMPLACER`, l'application tourne en **mode local** : les données restent dans le navigateur de l'appareil.
Pour l'essayer, publiez le dossier sur GitHub Pages (étape 2), ou ouvrez-le avec un petit serveur local
(`python -m http.server` dans le dossier, puis http://localhost:8000).

## 1. Créer la base Firebase (compte baye.moustaphandiaye88@gmail.com)
1. Allez sur https://console.firebase.google.com avec ce compte Google, puis « Créer un projet » (ex. `yokkute-pme`). Google Analytics n'est pas nécessaire.
2. Menu **Build › Firestore Database** › « Créer une base de données » › mode **production** › région `eur3 (europe-west)`.
3. Onglet **Règles** : remplacez tout par le contenu du fichier `firestore.rules`, puis « Publier ».
4. Menu **Build › Authentication** › « Commencer » › fournisseur **Google** › Activer › e-mail d'assistance : votre adresse › Enregistrer.
5. **Paramètres du projet** (roue dentée) › « Vos applications » › icône **Web `</>`** › nom `Yokkute PME` (sans Hosting) › copiez le bloc `firebaseConfig`.
6. Dans `js/config.js`, remplacez les valeurs `A_REMPLACER` par celles du bloc copié (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

## 2. Publier sur GitHub Pages
1. Sur https://github.com, créez un dépôt (ex. `yokkute-pme`). Il peut être public : les données ne sont pas dans le code mais dans Firebase, protégées par les règles.
2. « Add file › Upload files » : déposez **le contenu** du dossier (index.html à la racine), puis « Commit ».
3. **Settings › Pages** › Source : « Deploy from a branch » › branche `main`, dossier `/ (root)` › Save.
   L'adresse sera `https://VOTRE-COMPTE.github.io/yokkute-pme/` (quelques minutes).
4. Retour dans Firebase › **Authentication › Settings › Domaines autorisés** › « Ajouter un domaine » : `VOTRE-COMPTE.github.io`.

## 3. Première connexion et mise en route
1. Ouvrez l'adresse, « Se connecter avec Google » avec baye.moustaphandiaye88@gmail.com : vous êtes **propriétaire**. La bibliothèque d'actions par défaut est créée automatiquement.
2. **Entreprises › Importer l'export CCIAK** : choisissez le fichier « Liste des adhérents » (.xls). Vérifiez le résumé, arbitrez les différences, confirmez.
   Réimportez chaque nouvel export : le matricule évite tout doublon et vos saisies ne sont jamais écrasées.
3. **Équipe et partage** : ajoutez chaque membre avec son adresse Gmail et un rôle :
   - **Conseiller** : réalise les diagnostics, suit les PDI et fait les visites des entreprises qui lui sont attribuées ; reçoit et met à jour ses tâches.
   - **Lecteur** : consulte tout sans rien modifier (hiérarchie).
4. **Tâches › Nouvelle tâche** : attribuez une tâche (diagnostic, visite, formation…) à un membre, avec une échéance, et cochez « Attribuer aussi l'entreprise » pour lui donner le droit de la diagnostiquer.
   On peut aussi changer le « Conseiller référent » sur la fiche d'une entreprise.
5. Sur chaque appareil : ouvrez l'adresse une fois avec internet et connectez-vous. Ensuite l'application marche sans réseau ; tout se synchronise au retour de la connexion.
   Sur téléphone ou tablette : menu du navigateur › « Ajouter à l'écran d'accueil ».

## Rapports d'activités
Menu **Rapports** : mensuel, trimestriel, semestriel ou annuel. Faits marquants, indicateurs (entreprises inscrites, diagnostics, PDI validés, visites, actions réalisées et en retard, évolution du CA, tâches), situation du portefeuille, besoins de formation, activités par conseiller et journal daté. « Imprimer / PDF » ou « Exporter en Excel ».

## Mettre à jour l'application
Remplacez les fichiers dans le dépôt GitHub et changez `VERSION` en haut de `sw.js` (ex. `yokkute-v1.0.1`) pour que les appareils reprennent la nouvelle version.

## Sauvegarde et données personnelles
- **Équipe et partage › Export complet** chaque mois : archive Excel de toute la base.
- Le fichier des adhérents contient des données personnelles (noms, téléphones). Si l'outil devient officiel, faire la déclaration auprès de la CDP (loi n° 2008-12 sur la protection des données à caractère personnel).
- Si le propriétaire change d'adresse : modifier `ownerEmail` dans `js/config.js` et l'adresse dans `firestore.rules`.

## À valider avant usage généralisé
Les repères en wolof, la bibliothèque d'actions, les réponses proposées dans le formulaire de diagnostic, le rattachement des communes de Ndiébel et Keur Madiabel.
