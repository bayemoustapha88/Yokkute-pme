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

## Travail participatif et exports PDF / Word (version 1.5)
- **Tableaux de bord ouverts à toute l'équipe** : dans Activités CADE, le Tableau de bord et le Pilotage de l'équipe sont visibles par tous les membres (conseillers, responsable portefeuille, accueil, lecteurs). Sur le Tableau de bord principal, le bloc « Charge par conseiller » est aussi visible par tous.
- **Rapports téléchargeables en PDF, en Word (.docx) et en Excel** : Rapports d'activités (mensuel, trimestriel, semestriel, annuel), rapport de la période dans Activités CADE (Tableau de bord ou Pilotage) et arrêté de caisse. Les fichiers sont produits sur l'appareil, sans connexion nécessaire.
- Nouveaux fichiers : `export.js`, `jspdf.umd.min.js` et `jspdf.plugin.autotable.min.js` (bibliothèque jsPDF, licence MIT). Les règles Firestore ne changent pas.

## Import du journal des recettes de la caisse (version 1.8)

- Dans « Activités CADE › Accueil / caisse », le propriétaire ou le responsable portefeuille peut **importer le journal des recettes** tenu dans Excel (classeur organisé, feuille « Journal ») :
  - les recettes de la **Plateforme électronique** vont dans « Recettes PE », rangées par prestation ;
  - les **business plans et prestations** (agrément local…) comptent dans « Recettes des prestations du CADE » ; une ligne « 15000*15 » compte 15 business plans ;
  - les **renouvellements** absents de la liste des adhérents comptent dans les cartes d'adhésion ;
  - les **adhésions** ne sont pas importées : elles viennent déjà de la liste des adhérents CCIAK.
- Un nouvel import de la même année **remplace** le précédent. Les lignes importées sont visibles mais non modifiables dans l'application.
- **Tableau de bord** : nouveau tableau « Recettes propres par mois » (adhésions, renouvellements, PE, BP et prestations).
- **Catalogue PE** aligné sur les prestations réelles : étiquettes ; cartes de visite et flyers ; grand format (bâches, banderoles, kakémonos, tableaux PVC) ; cartes PVC ; impressions et papeterie ; logo ; visuels réseaux sociaux. Les plans enregistrés avec l'ancien catalogue d'exemple passent automatiquement au nouveau.
- **Règles Firestore à republier** (nouvelle collection `recettes_import`).

## Adhésions gratuites des programmes partenaires (version 1.7.1)

- Les adhésions obtenues par l'enrôlement d'un programme partenaire (Nataal Sine Saloum) sont **gratuites** : elles comptent comme adhérents et comme cartes, mais à 0 FCFA dans les recettes.
- Elles sont repérées par le **coach** de la liste CCIAK : Yatte Diagne, Sophie Diack et Mohammeth Dany Niouky Niouky. La liste des coachs et le nom du programme se modifient dans le plan annuel (« Autres objectifs »).
- La règle s'applique aussitôt aux adhésions déjà importées : inutile de réimporter la liste.
- Dans la base des adhérents, un filtre « Paiement » sépare les adhésions payantes et gratuites.
- Aucune règle Firestore à republier.

## Base des adhérents et cohortes du programme (version 1.7)

- Nouvel onglet **Base des adhérents** dans « Activités CADE » : tous les adhérents de la CCIAK, pour le suivi financier des adhésions. On l'alimente en important la liste des adhérents (export CCIAK ou classeur de vérification avec la colonne « Forme juridique »). Un nouvel import **remplace** celui de la même année : on peut réimporter un fichier corrigé sans créer de doublons.
- Les adhésions importées comptent dans le tableau de bord, l'onglet « Cartes d'adhésion », les relances de renouvellement et les rapports. Elles sont rangées par lots mensuels : une douzaine de lectures au lieu d'une par adhérent, pour rester dans l'offre gratuite de Firebase.
- **Nouveaux tarifs** : EI et SUARL 3 000 FCFA ; GIE et coopérative 10 000 FCFA ; SARL et SA 10 000 FCFA. Cible indicative : 700 cartes par an (600 EI, 90 GIE, 10 sociétés), dépassable. Les plans enregistrés avec les anciens tarifs d'exemple passent automatiquement aux nouveaux.
- **Entreprises suivies** : le module Entreprises ne contient plus que les entreprises accompagnées par le programme. Elles sont choisies dans la base des adhérents (« Inscrire au programme », une par une ou par sélection) et rattachées à une **cohorte** annuelle.
- **Places du programme** : le plan annuel fixe le nombre d'entreprises à suivre (50 par défaut). Au-delà, l'application demande confirmation.
- **Retirer du suivi** : sur la fiche d'une entreprise, le propriétaire ou le responsable portefeuille peut la retirer du suivi avec un motif. Sa fiche, ses diagnostics et son PDI sont conservés ; elle peut être réintégrée.
- **Règles Firestore à republier** (nouvelle collection `adherents`).

## Recettes de la Plateforme électronique, PE (version 1.6)

- Nouvel onglet **Recettes PE** dans « Activités CADE » : chaque prestation numérique encaissée (étiquettes, logo, factures, supports de communication, cartes de visite, visuels pour réseaux sociaux…) est enregistrée avec le client, la quantité, le montant, le mode de paiement, le reçu et l'état de la commande (en cours ou livrée).
- Les recettes PE s'ajoutent aux cartes d'adhésion et aux prestations du CADE dans le **total des recettes propres** : tableau de bord (4e objectif financier), Mon espace, Pilotage de l'équipe, arrêté de caisse et rapports PDF / Word / Excel.
- Le **plan annuel** contient un catalogue PE modifiable (prestations, tarif moyen, nombre de commandes visées). Valeurs d'exemple : 3 150 000 FCFA par an.
- Nouveau rôle **Agent Plateforme électronique (PE)** : il saisit les recettes PE et voit les tableaux de bord. L'accueil / caisse, les conseillers, le responsable portefeuille et le propriétaire peuvent aussi encaisser une recette PE.
- Comme les cartes, une recette PE ne se supprime pas : le propriétaire ou le responsable portefeuille l'annule avec un motif.
- **Règles Firestore à republier** (nouvelle collection `recettes_pe`).

## Mettre à jour l'application
Remplacez les fichiers dans le dépôt GitHub et changez `VERSION` en haut de `sw.js` (ex. `yokkute-v1.1.1`) pour que les appareils reprennent la nouvelle version.

## Sauvegarde et données personnelles
- **Équipe et partage › Export complet** chaque mois : archive Excel de toute la base.
- Le fichier des adhérents contient des données personnelles (noms, téléphones). Si l'outil devient officiel, faire la déclaration auprès de la CDP (loi n° 2008-12 sur la protection des données à caractère personnel).
- Si le propriétaire change d'adresse : modifier `ownerEmail` dans `js/config.js` et l'adresse dans `firestore.rules`.

## À valider avant usage généralisé
Les repères en wolof, la bibliothèque d'actions, les réponses proposées dans le formulaire de diagnostic, le rattachement des communes de Ndiébel et Keur Madiabel.

## Prestations de service au tableau de bord (version 1.8.1)
- Le tableau de bord « Activités CADE » affiche une nouvelle section « Prestations de service du CADE » : nombre et montant par type (Business plan, Agrément local, Dossier d'agrément FRA, Dossier de crédit, Appui à la formalisation, Conseil au forfait), y compris les lignes reprises du journal de caisse.
- Nouveaux types de prestation dans l'axe A3 : « Agrément local », « Dossier d'agrément FRA », « Appui à la formalisation », « Conseil approfondi (forfait) ».
- Une prestation payante peut concerner une entreprise suivie, un adhérent de la base ou tout autre client (nom libre).
- Les business plans repris du journal de caisse comptent désormais dans l'indicateur I05.
- Boutons rapides : « + Saisir une prestation » (tableau de bord) et « + Prestation CADE (BP, agrément, FRA) » (caisse).
- Aucune nouvelle règle Firestore.
