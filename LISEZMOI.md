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

## Masterclasses, outils et pièces justificatives (version 1.1)
- **Masterclasses et outils** (menu) : les dix masterclasses classées par segment, avec deux niveaux (« recommandée » et « selon le diagnostic »). Chaque masterclass propose le classeur Excel des participants, téléchargeable par tous.
- Les **guides du formateur, les diaporamas et le Kit de mise en œuvre des PDI** sont réservés au propriétaire et aux conseillers. Le propriétaire les téléverse depuis cette page (bloc « Téléverser les supports du formateur ») : le nom de chaque fichier doit contenir MC1 à MC10 et « Guide » ou « Diaporama », ou « Kit ».
- Dans chaque PDI, chaque action affiche la masterclass qui l'outille et le lien vers son classeur.
- **Pièces justificatives** : photo, PDF, Word ou Excel (5 Mo au plus), à joindre pendant le diagnostic (par dimension), dans le PDI ou lors d'une visite (par action). Les photos sont allégées automatiquement. Elles sont rangées dans la fiche de l'entreprise. Stockage gratuit dans la base Firestore, découpé en morceaux ; le quota gratuit (1 Gio) suffit pour plusieurs milliers de pièces.
- Trois actions « marchés publics » (MC10) s'ajoutent à la bibliothèque dans la dimension « Marketing et vente » : elles s'installent automatiquement à la première connexion du propriétaire.
- **Important** : les règles `firestore.rules` ont changé. Recopiez-les dans Firebase › Firestore Database › Règles › Publier, sinon les pièces jointes et les supports seront refusés.

## Activités CADE : planification et suivi (version 1.2, phase 1)
Nouveau menu **Activités CADE**, organisé selon les 9 activités de la fiche de poste (axes A1 à A9). Quatre onglets :
- **Tableau de bord** : objectifs financiers (cartes d'adhésion, prestations, financements obtenus) avec jauge, cible de la période et projection ; prévu et réalisé pour chaque indicateur des 9 axes ; cartes à renouveler ; activités par membre ; dernières activités. Période au choix : mois, trimestre, semestre ou année.
- **Journal des activités** : chaque action menée est saisie en moins d'une minute (date, axe, type d'action, entreprise, participants, montant encaissé, financement demandé et obtenu, observation). Les diagnostics, les PDI validés et les visites de suivi déjà enregistrés dans Yokkute sont comptés automatiquement : ne pas les ressaisir. Export Excel.
- **Cartes d'adhésion** : vente ou renouvellement (catégorie, tarif, reçu, date de validité), liste des cartes à relancer, taux de renouvellement. Une vente ne se supprime pas : le propriétaire l'annule avec un motif. Export Excel.
- **Plan annuel et référentiel** : le propriétaire fixe les cibles annuelles de chaque indicateur, les tarifs et cibles des cartes, et les objectifs de recettes ; il peut ajouter des types d'actions propres au CADE. Tant que le plan n'est pas enregistré, des **valeurs d'exemple** s'affichent.

Nouveau rôle **Accueil / caisse** (Équipe et partage) : il enregistre les visiteurs (axe A1) et les ventes de cartes, sans accès aux diagnostics. Une saisie reste modifiable par son auteur pendant 7 jours ; ensuite seul le propriétaire peut la corriger.

**Important** : les règles `firestore.rules` ont changé (collections `realisations`, `adhesions`, `cade_param`). Recopiez-les dans Firebase › Firestore Database › Règles › Publier, sinon le module affiche « Accès refusé par la base ».

## Pilotage de l'équipe (version 1.3, phase 2)
- Nouveau rôle **Responsable gestion portefeuille des entreprises (programme Yokkute)** (Équipe et partage) : il est aussi conseiller (diagnostics, PDI, visites) et peut s'attribuer des tâches ; en plus, il pilote l'équipe. Il voit et attribue toutes les tâches, réattribue les entreprises, fixe le plan annuel, corrige les saisies et annule les ventes de cartes.
- **Tâches** : chaque tâche peut être rattachée à un axe (A1 à A9), avoir une priorité (haute, normale, basse) et se répéter chaque semaine ou chaque mois. La suivante se crée seule quand la précédente est terminée. Un conseiller peut créer ses propres tâches. Le bouton « Terminer et saisir l'activité réalisée » ouvre le journal déjà rempli et ferme la tâche. Vue **Semaine** : une ligne par membre, une colonne par jour.
- **Activités CADE** : trois nouveaux onglets. **Mon espace** (mes tâches en retard, du jour et de la semaine, mes entreprises triées par dernier contact, mes résultats du mois). **Pilotage de l'équipe** (charge et résultats par membre, alertes : tâches en retard, entreprises suivies sans contact depuis 60 jours, cartes à relancer, plan non enregistré). **Accueil / caisse** (visiteur ou carte en un clic, arrêté de caisse du jour par mode de paiement, imprimable).
- Les années proposées vont de 2026 à l'année prochaine, sans limite : les données des années passées restent consultables.
- **Important** : les règles `firestore.rules` ont encore changé. Recopiez-les dans Firebase › Firestore Database › Règles › Publier.

## Masterclass MC11 : dynamique organisationnelle et gestion participative (version 1.4)
- Onzième masterclass, destinée aux **GIE, coopératives et associations** : fondamentaux, organes de gouvernance, statuts et règlement intérieur, communication et conflits, planification et registres, transparence de la caisse, pérennisation et autodiagnostic. Recommandée en segments A et B, à proposer en C selon le diagnostic.
- Classeur **MC11_Outils_participants.xlsx** (9 onglets) : carte d'identité, organes et rôles, conflits, réunions et PV, plan d'action, cotisations et caisse, autodiagnostic sur 24 critères, cas pratique « GIE Jappo Ndoffane » corrigé.
- Cinq actions MC11 dans la bibliothèque (dimension « Leadership, RH et gouvernance »). Elles ne sont proposées dans le PDI que si la forme juridique de l'entreprise est GIE, coopérative ou association, et passent alors avant les actions individuelles. Elles s'ajoutent automatiquement à la bibliothèque à la première connexion du propriétaire.
- Le guide du formateur se téléverse dans Masterclasses et outils, avec un nom de fichier contenant « MC11 » et « Guide » (par exemple `MC11_Guide_formateur.pdf`).

## Mettre à jour l'application
Remplacez les fichiers dans le dépôt GitHub et changez `VERSION` en haut de `sw.js` (ex. `yokkute-v1.1.1`) pour que les appareils reprennent la nouvelle version.

## Sauvegarde et données personnelles
- **Équipe et partage › Export complet** chaque mois : archive Excel de toute la base.
- Le fichier des adhérents contient des données personnelles (noms, téléphones). Si l'outil devient officiel, faire la déclaration auprès de la CDP (loi n° 2008-12 sur la protection des données à caractère personnel).
- Si le propriétaire change d'adresse : modifier `ownerEmail` dans `js/config.js` et l'adresse dans `firestore.rules`.

## À valider avant usage généralisé
Les repères en wolof, la bibliothèque d'actions, les réponses proposées dans le formulaire de diagnostic, le rattachement des communes de Ndiébel et Keur Madiabel.
