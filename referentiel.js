/* Yokkute PME — référentiels : modules, dimensions, questions, bibliothèque par défaut, règles de calcul.
   Ce fichier ne dépend d'aucune donnée enregistrée : il peut être relu et corrigé sans risque. */
"use strict";
var TODAY = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
var MOD = {
  M1:"TAXAWU PME — Module 1 : Fondamentaux de la gestion d'entreprise",
  M2:"TAXAWU PME — Module 2 : Planification stratégique",
  M3:"TAXAWU PME — Module 3 : Marketing et vente",
  M4:"TAXAWU PME — Module 4 : Gestion financière et accès au financement",
  M5:"TAXAWU PME — Module 5 : Leadership et gestion des ressources humaines",
  M6:"TAXAWU PME — Module 6 : Formalisation et environnement réglementaire",
  U0:"FVE — Séance d'introduction : les avantages de la formalisation",
  U1:"FVE — Unité 1 : Enregistrement de l'entreprise",
  U2:"FVE — Unité 2 : Comptabilité",
  U3:"FVE — Unité 3 : Enregistrement fiscal",
  U4:"FVE — Unité 4 : Couverture sociale",
  U5:"FVE — Unité 5 : Enregistrement à l'inspection du travail",
  U6:"FVE — Unité 6 : Exigences spécifiques",
  CI:"Coaching individuel (sans module de formation)"
};
function recoText(code){
  if(!code || code==="CI") return "Accompagnement individuel par le conseiller, sans module de formation.";
  if(code.charAt(0)==="U") return "Besoin d'une formation : « "+MOD[code]+" ».";
  return "Doit suivre la formation : « "+MOD[code]+" ».";
}
var SEGLAB = {A:"Structuration", B:"Consolidation", C:"Croissance"};
var STATUTS = ["Non engagé","En cours","Obtenu","Non applicable"];
var VOLETS = [
  {nom:"Enregistrement de l'entreprise", u:"U1", preuve:"NINEA ; RCCM ou statuts (GIE, coopérative, société) ; forme juridique adaptée", bloq:true},
  {nom:"Comptabilité", u:"U2", preuve:"Registre des recettes et des dépenses, ou comptabilité SYSCOHADA selon le régime"},
  {nom:"Enregistrement fiscal", u:"U3", preuve:"Immatriculation au centre des services fiscaux, régime identifié (CGU ou réel), déclarations à jour", oblig:true},
  {nom:"Couverture sociale", u:"U4", preuve:"Immatriculation à l'IPRES et à la CSS, employés déclarés"},
  {nom:"Inspection du travail", u:"U5", preuve:"Déclaration d'établissement, contrats écrits, registre de l'employeur"},
  {nom:"Exigences spécifiques", u:"U6", preuve:"FRA, licence de transport, agrément ou norme selon l'activité"}
];
var FREINS = ["Méconnaissance des avantages de la formalisation","Peur des contraintes et des lourdeurs administratives","Formalisation perçue comme une surveillance de l'État","Coût des démarches jugé trop élevé","Manque de réassurance et d'accompagnement"];
var ATT = {saison:"Forte saisonnalité des ventes (campagne, Tabaski, Magal, rentrée)", dependance:"Forte dépendance au promoteur", credit:"Ventes à crédit non suivies"};

var DIMS = [
 {court:"Vision", nom:"Vision et planification", mods:["M2"],
  but:"Le promoteur sait-il où il veut conduire son entreprise et a-t-il un plan pour y arriver ?",
  q:[["Pourquoi avez-vous créé cette entreprise, et qu'est-ce qui a changé depuis ?","Lan moo tax nga sos liggéey bii ? Lan moo soppiku ba léegi ?"],
     ["Où voyez-vous votre entreprise dans trois ans ?","Fan nga bëgg sa liggéey nekk ci ñetti at ?"],
     ["Quels sont vos projets pour les douze prochains mois, et combien coûtent-ils ?","Lan nga bëgg def ci at mii di ñëw ? Ñaata lay jar ?"]],
  c:{A:["Sait dire ce qu'il vise dans un an","Connaît ses principaux concurrents"],
     B:["Objectifs SMART écrits","Analyse SWOT réalisée","Plan d'action annuel"],
     C:["Plan d'affaires chiffré","Projet d'investissement appuyé sur des devis"]},
  g:["Aucune vision, survie au jour le jour","Souhaits généraux sans chiffrage","Objectif clair à 1-2 ans, non écrit","Objectifs SMART et plan d'action écrits","Plan d'affaires chiffré, projet financé en partie"]},
 {court:"Marketing", nom:"Marketing et vente", mods:["M3"],
  but:"L'entreprise connaît-elle ses clients, ses prix, et sait-elle aller chercher de nouveaux marchés ?",
  q:[["Qui sont vos clients principaux, et d'où viennent-ils ?","Ñan ñooy sa kiliyaan yu mag yi ? Fan lañu jóge ?"],
     ["Comment fixez-vous vos prix ? Connaissez-vous votre marge ?","Naka ngay taxawal sa njëg ? Xam nga li ngay gañe ?"],
     ["Vendez-vous à crédit ? Combien vous doit-on aujourd'hui ?","Ndax danga jaay ci bor ? Ñaata lañu la ameel tey ?"]],
  c:{A:["Connaît ses clients réguliers","Prix connus de tous les vendeurs"],
     B:["Client cible défini (fiche persona)","Catalogue WhatsApp Business ou équivalent","Créances clients notées par écrit"],
     C:["Distributeurs ou clients institutionnels","Marque, emballage ou étiquetage propres","A déjà répondu à un appel d'offres"]},
  g:["Ventes au hasard, prix copiés, crédits non notés","Clients connus de mémoire, prix sans calcul","Clients identifiés, prix connus, créances notées","Client cible, catalogue, promotion régulière","Distributeurs ou institutions, marque reconnue"]},
 {court:"Production", nom:"Production, approvisionnement et qualité", mods:["M1","U6"],
  but:"L'outil de production, le stock et l'approvisionnement sont-ils maîtrisés, et l'activité respecte-t-elle ses exigences sanitaires ?",
  q:[["Comment se déroule la production, du début à la fin ?","Naka ngay liggéeye, dale ko ci ndoorte ba ci mujj ?"],
     ["Vos équipements sont-ils en bon état et suffisants ?","Ndax sa jumtukaay yi baax nañu te doy nañu ?"],
     ["Quelles pertes subissez-vous (produits abîmés, invendus) ?","Ndax am na lu la yàqu walla lu des te jaayul ?"]],
  c:{A:["Stock rangé","Fournisseurs réguliers identifiés","Règles d'hygiène de base appliquées"],
     B:["Stock de sécurité calculé","Pertes mesurées","Produits conditionnés"],
     C:["FRA ou autorisation sectorielle obtenue","Démarche qualité ou norme engagée","Production planifiée"]},
  g:["Outil inadapté, ruptures, pertes importantes","Production irrégulière, stock non compté","Stock rangé, fournisseurs fiables, hygiène correcte","Stock de sécurité, pertes mesurées, conditionnement","Autorisations obtenues, production planifiée"]},
 {court:"Gestion", nom:"Fondamentaux de gestion", mods:["M1","U2"],
  but:"L'entreprise note-t-elle ses mouvements d'argent, sépare-t-elle sa caisse du ménage et connaît-elle ses prix de revient ?",
  q:[["Notez-vous chaque jour vos entrées et sorties d'argent ?","Ndax danga bind bés bu nekk xaalis bu dugg ak bu génn ?"],
     ["L'argent de l'entreprise est-il séparé de celui de la famille ?","Ndax xaalisu liggéey bi ak xaalisu kër gi dañoo tàqalikoo ?"],
     ["Savez-vous combien vous coûte chaque produit que vous vendez ?","Xam nga ñaata la lu nekk lay jar balaa ngay jaay ?"]],
  c:{A:["Journal de caisse tenu chaque jour","Caisse de l'entreprise séparée de celle du ménage","Prix de revient d'au moins un produit"],
     B:["Prix de revient de tous les produits","Inventaire régulier","Salaire fixe du promoteur"],
     C:["Comptabilité conforme au régime (SYSCOHADA)","Pièces justificatives classées"]},
  bloq:{A:[0,1]},
  g:["Aucun écrit, caisses confondues","Notes irrégulières, pas de séparation","Journal tenu, caisse séparée, un prix de revient","Tous les prix de revient, inventaires, salaire fixe","Comptabilité conforme, pièces classées"]},
 {court:"Finance", nom:"Gestion financière et financement", mods:["M4"],
  but:"L'entreprise connaît-elle son résultat, anticipe-t-elle sa trésorerie et peut-elle présenter un dossier de financement ?",
  q:[["Quel est votre chiffre d'affaires actuel : combien vendez-vous en moyenne par mois, et sur les 12 derniers mois ?","Ñaata ngay jaay ci weer ci diggante bi ? Te ñaata nga jaay ci fukki weer ak ñaar yi weesu ?"],
     ["Combien dépensez-vous par mois pour faire tourner l'activité, et combien vous reste-t-il ?","Ñaata ngay dépense ci weer ngir liggéey bi dox ? Ñaata lay des ?"],
     ["Avez-vous déjà obtenu un crédit ? L'avez-vous remboursé à temps ?","Ndax jot nga leb ba noppi ? Ndax fey nga ko ci jamono ?"],
     ["De quel financement auriez-vous besoin, et pour quoi faire ?","Ñaata xaalis ngay soxla, te ngir def lan ?"]],
  fin:true,
  c:{A:["Épargne régulière","Compte IMF ou bancaire au nom de l'entreprise"],
     B:["Compte de résultat simple établi","Plan de trésorerie sur 6 mois","Crédit remboursé sans incident"],
     C:["États financiers annuels","Plan de financement de l'investissement","Relation suivie avec une banque"]},
  g:["Aucun compte, aucune épargne, résultat inconnu","Tontine ou compte personnel seulement","Compte de l'entreprise, épargne, crédit IMF remboursé","Compte de résultat et trésorerie suivis, besoin chiffré","États financiers, dossier bancable prêt"]},
 {court:"RH", nom:"Leadership, RH et gouvernance", mods:["M5","U4","U5"],
  but:"L'entreprise peut-elle fonctionner sans la présence permanente du promoteur, et ses employés sont-ils en règle ?",
  q:[["Combien de personnes travaillent ici, et avec quel statut ?","Ñaata nit ñoo fi liggéey ? Naka lañu fi nekke ?"],
     ["Si vous vous absentez une semaine, l'entreprise continue-t-elle ?","Su nga demee ayu-bés, ndax liggéey bi dina dox ?"],
     ["Comment vos employés sont-ils payés, et à quelle régularité ?","Naka ngay fey say liggéeykat, te ban jamono ?"]],
  c:{A:["Tâches réparties","Un remplaçant identifié en cas d'absence"],
     B:["Fiches de poste","Contrats de travail écrits","Délégation effective de tâches"],
     C:["Encadrement intermédiaire","Organes de gouvernance qui fonctionnent (AG, réunions, PV)","Plan de formation du personnel"]},
  g:["Le promoteur fait tout seul","Tâches floues, dépendance totale au promoteur","Tâches réparties, remplaçant possible","Fiches de poste, contrats, délégation","Encadrement intermédiaire, gouvernance en place"]},
 {court:"Formalisation", nom:"Formalisation et conformité", mods:["M6","U1","U2","U3","U4","U5","U6"], volets:true,
  but:"L'entreprise existe-t-elle légalement sur les six volets du module FVE, et qu'est-ce qui freine sa formalisation ?",
  q:[["Votre entreprise est-elle enregistrée ? Avez-vous un NINEA, un RCCM ?","Ndax sa liggéey bi bindu na ? Am nga NINEA ak RCCM ?"],
     ["Si non, qu'est-ce qui vous a retenu jusqu'ici ?","Su bindoowul, lu la ko tee ba léegi ?"],
     ["Payez-vous la CGU ou un autre impôt ? Vos employés sont-ils déclarés ?","Ndax danga fey CGU walla beneen galag ? Ndax say liggéeykat bindu nañu ?"]],
  g:["Informelle, réticente","Informelle mais disposée, démarches à engager","NINEA et RCCM obtenus, fiscalité à régulariser","Enregistrée, à jour, autorisations obtenues","Pleinement conforme sur les six volets"]},
 {court:"Numérique", nom:"Outils numériques", mods:["M1","M3"],
  but:"L'entreprise utilise-t-elle des outils numériques simples pour vendre, encaisser et gérer ?",
  q:[["Utilisez-vous un smartphone pour votre activité ? Pour quoi faire ?","Ndax danga jëfandikoo sa portaabal ci sa liggéey ? Ngir def lan ?"],
     ["Vos clients peuvent-ils payer par Wave ou Orange Money ?","Ndax sa kiliyaan yi mën nañu la fey ci Wave walla Orange Money ?"],
     ["Montrez-vous vos produits sur WhatsApp ou Facebook ?","Ndax danga wone say marsandiis ci WhatsApp walla Facebook ?"]],
  c:{A:["Paiement mobile sur un numéro réservé à l'entreprise"],
     B:["Catalogue en ligne avec photos et prix","Ventes suivies sur tableur ou application"],
     C:["Logiciel de gestion","Vente en ligne"]},
  g:["Appels seulement, paiements en espèces","Paiement mobile sur numéro personnel","Numéro dédié, catalogue en ligne","Ventes suivies sur tableur, promotion régulière","Logiciel de gestion, vente en ligne"]}
];
var IDX_GESTION = 3, IDX_FORMAL = 6;
/* Formulaire de réponses : type par question (choix, multi, texte, nombre, info) ; lie = repères cochés automatiquement par une réponse */
var QFORM = {
 "0-0":{type:"texte"}, "0-1":{type:"texte"},
 "0-2":{type:"choix", opts:["Projet chiffré avec devis","Projet identifié sans chiffrage","Pas de projet précis"], lie:{0:["C1"]}},
 "1-0":{type:"multi", opts:["Ménages","Revendeurs","Institutions","Entreprises","Clients hors de la commune"], lie:{0:["A0"],1:["A0"],2:["C0"],3:["A0"]}},
 "1-1":{type:"choix", opts:["Prix calculé à partir du coût","Prix copié sur le marché","Au cas par cas"]},
 "1-2":{type:"choix", opts:["Ne vend pas à crédit","Crédits notés par écrit","Crédits non notés"], lie:{1:["B2"]}},
 "2-0":{type:"texte"},
 "2-1":{type:"choix", opts:["En bon état et suffisants","Vieillissants ou insuffisants","En panne ou absents"]},
 "2-2":{type:"choix", opts:["Pertes faibles et mesurées","Pertes importantes non mesurées","Ne sait pas"], lie:{0:["B1"]}},
 "3-0":{type:"choix", opts:["Oui, chaque jour","De temps en temps","Non"], lie:{0:["A0"]}},
 "3-1":{type:"choix", opts:["Oui, caisse séparée","En partie","Non, caisse commune avec le ménage"], lie:{0:["A1"]}},
 "3-2":{type:"choix", opts:["Oui, pour tous les produits","Pour certains produits","Non"], lie:{0:["A2","B0"],1:["A2"]}},
 "4-0":{type:"info", msg:"Réponse à saisir dans les chiffres clés ci-dessous."},
 "4-1":{type:"info", msg:"Réponse à saisir dans les chiffres clés ci-dessous."},
 "4-2":{type:"choix", opts:["Crédit remboursé à temps","Crédit en cours sans incident","Retard ou impayé","Jamais de crédit"], lie:{0:["B2"]}},
 "4-3":{type:"texte"},
 "5-0":{type:"multi", opts:["Salariés","Membres de la famille","Apprentis","Journaliers"]},
 "5-1":{type:"choix", opts:["Oui, quelqu'un peut me remplacer","Seulement quelques jours","Non, tout s'arrête"], lie:{0:["A1"]}},
 "5-2":{type:"choix", opts:["Salaire fixe chaque mois","À la tâche","Irrégulier ou en nature"]},
 "6-0":{type:"choix", opts:["NINEA et RCCM","NINEA seulement","Aucun"]},
 "6-1":{type:"texte"},
 "6-2":{type:"choix", opts:["Impôts (CGU) payés et employés déclarés","Impôts payés, employés non déclarés","Rien de déclaré"]},
 "7-0":{type:"multi", opts:["Appels seulement","WhatsApp","Paiement mobile","Réseaux sociaux","Tableur ou application"]},
 "7-1":{type:"choix", opts:["Oui, sur un numéro réservé à l'entreprise","Oui, sur mon numéro personnel","Non"], lie:{0:["A0"]}},
 "7-2":{type:"choix", opts:["Oui, régulièrement","De temps en temps","Non"], lie:{0:["B0"]}}
};
function qForm(st,k){ return QFORM[st+"-"+k] || {type:"texte"}; }
function repText(r, qf){ if(!r) return ""; var v=r.v; if(qf.type==="choix" && v!=null && v!=="") v=qf.opts[v]; if(qf.type==="multi" && v) v=v.map(function(i){return qf.opts[i];}).join(", "); return [v,r.p].filter(Boolean).join(" — "); }
function applyLie(d, st, k, idxs){
  var qf=qForm(st,k); if(!qf.lie || DIMS[st].volets) return;
  d.checks[st]=d.checks[st]||{};
  idxs.forEach(function(i){ (qf.lie[i]||[]).forEach(function(ck){ d.checks[st][ck]=true; }); });
}


/* Bibliothèque d'actions (modifiable). t = déclencheur : n (note max), v (volet FVE non obtenu), frein, att (point d'attention) */
var uid = 100;
function L(dim,segs,t,module,action,livrable,modalite,partenaire,mois,type,nature,outil){ return {id:"L"+(++uid),dim:dim,segs:segs,t:t,module:module,action:action,livrable:livrable,modalite:modalite,partenaire:partenaire,mois:mois,type:type,nature:nature,outil:outil||"",actif:true}; }
var LIB = [
 L(0,["A"],{n:2},"M2","Formuler avec le conseiller un objectif simple et chiffré à 12 mois","Objectif écrit et affiché dans l'entreprise","Coaching sur site","CADE",3,"essentiel","coaching",""),
 L(0,["B","C"],{n:3},"M2","Remplir la grille SWOT de l'entreprise et fixer 3 objectifs SMART avec un plan d'action","SWOT et tableau SMART remplis","Formation collective + coaching","CADE",4,"essentiel","modele","Grille SWOT et tableau des objectifs SMART (modèles TAXAWU M2)"),
 L(0,["C"],{n:4},"M2","Actualiser le plan d'affaires et chiffrer le projet d'investissement","Plan d'affaires chiffré, devis joints","Coaching conseil","CADE, expert financier",3,"essentiel","modele","Canevas de plan d'affaires CADE"),
 L(1,["A"],{n:2},"M3","Lister les clients réguliers et afficher les prix","Liste de clients et prix affichés","Coaching sur site","CADE",2,"rapide","outil","Fichier clients simple (cahier ou répertoire)"),
 L(1,["A","B"],{n:3},"M3","Définir le client cible et ouvrir un catalogue WhatsApp Business","Fiche client cible remplie, catalogue en ligne","Formation collective","CADE",4,"essentiel","modele","Fiche client cible (persona) et formule de positionnement (modèles TAXAWU M3)"),
 L(1,["A","B","C"],{att:"credit"},"M3","Noter toutes les ventes à crédit et organiser le recouvrement","Cahier des créances à jour","Coaching sur site","CADE",3,"rapide","outil","Cahier des créances clients"),
 L(1,["C"],{n:4},"M3","Obtenir le référencement chez deux distributeurs hors région","2 contrats de référencement","Rendez-vous acheteurs","CADE, ASEPEX",9,"essentiel","relation",""),
 L(2,["A"],{n:2},"M1","Mettre en place la fiche de stock, compter le stock chaque semaine et identifier deux fournisseurs fiables","Fiche de stock à jour","Coaching sur site","CADE",3,"rapide","outil","Fiche de stock (modèle TAXAWU M1)"),
 L(2,["B"],{n:3},"M1","Calculer le stock de sécurité et mesurer les pertes","Calcul du stock de sécurité rempli","Formation collective","CADE",6,"complementaire","modele","Calcul du stock de sécurité (modèle TAXAWU M1)"),
 L(2,["A","B","C"],{v:5},"U6","Identifier et constituer le dossier d'autorisation exigé pour l'activité (FRA, licence, agrément)","Dossier d'autorisation déposé","Formation FVE + accompagnement","ADEPME, service régional du commerce, ITA",9,"essentiel","demarche","Liste des pièces de l'autorisation (FVE unité 6)"),
 L(2,["C"],{n:4},"CI","Engager une démarche qualité ou de normalisation","Dossier de certification ouvert","Accompagnement spécialisé","ASN, ITA",9,"complementaire","relation",""),
 L(3,["A","B"],{n:2},"M1","Installer le journal de caisse avec l'entreprise et le tenir chaque soir","Journal de caisse rempli 4 semaines de suite","Formation collective + coaching","CADE",2,"essentiel","outil","Journal de caisse (modèle TAXAWU M1)"),
 L(3,["A","B"],{n:2},"CI","Séparer la caisse de l'entreprise de celle du ménage (boîte dédiée ou compte mobile money)","Caisse séparée constatée, salaire du promoteur fixé","Coaching sur site","CADE",1,"rapide","outil","Caisse dédiée à l'entreprise"),
 L(3,["A","B"],{n:3},"M1","Calculer le prix de revient des produits principaux et ajuster les prix","Fiches de prix de revient remplies","Formation collective","CADE",3,"rapide","modele","Fiche de calcul du prix de revient (modèle TAXAWU M1)"),
 L(3,["B","C"],{n:3},"U2","Mettre en place le registre des recettes et des dépenses, ou une comptabilité SYSCOHADA selon le régime","Registre conforme ou comptabilité tenue","Formation FVE","ADEPME, centre de gestion agréé",9,"essentiel","outil","Registre des recettes et des dépenses (modèle FVE unité 2)"),
 L(4,["A"],{n:2},"M4","Ouvrir un compte IMF au nom de l'entreprise et épargner chaque mois","Compte ouvert, épargne mensuelle constatée","Éducation financière + mise en relation","IMF partenaire",4,"essentiel","relation",""),
 L(4,["B"],{n:3},"M4","Remplir le compte de résultat avec les chiffres des 3 derniers mois et établir un plan de trésorerie sur 6 mois","Compte de résultat et plan de trésorerie remplis","Formation collective","CADE",6,"essentiel","modele","Compte de résultat simplifié et plan de trésorerie sur 6 mois (modèles TAXAWU M4)"),
 L(4,["B"],{n:3},"M4","Monter et déposer un dossier de crédit avec la lettre de demande","Dossier de crédit déposé","Coaching dossier + mise en relation","IMF, banque, FONGIP, DER/FJ",9,"complementaire","relation","Lettre de demande de crédit (modèle TAXAWU M4)"),
 L(4,["C"],{n:4},"M4","Présenter le plan de financement à deux banques avec demande de garantie","Accord de financement","Mise en relation financière","Banques, BNDE, FONGIP",6,"essentiel","relation","Plan de financement de l'investissement"),
 L(4,["A","B","C"],{att:"saison"},"M4","Préparer un calendrier de trésorerie qui anticipe les mois creux et les pics","Calendrier de trésorerie saisonnier rempli","Coaching sur site","CADE",4,"complementaire","modele","Calendrier de trésorerie saisonnier"),
 L(5,["A","B"],{n:2,att:"dependance"},"M5","Répartir les tâches par écrit et désigner un remplaçant","Plan de délégation rempli","Coaching sur site","CADE",4,"essentiel","modele","Plan de délégation de 5 tâches (modèle TAXAWU M5)"),
 L(5,["B","C"],{n:3},"M5","Rédiger les fiches de poste et établir des contrats écrits","Fiches de poste et contrats signés","Formation collective","CADE",6,"complementaire","modele","Fiche de poste et contrat simple (modèles TAXAWU M5)"),
 L(5,["B","C"],{v:3},"U4","Immatriculer l'entreprise et déclarer les employés à l'IPRES et à la CSS","Immatriculations obtenues","Formation FVE + clinique d'entreprise","IPRES, CSS",9,"essentiel","demarche",""),
 L(5,["B","C"],{v:4},"U5","Faire la déclaration d'établissement et tenir le registre de l'employeur","Déclaration faite, registre tenu","Formation FVE","Inspection régionale du travail",9,"complementaire","demarche","Registre de l'employeur (FVE unité 5)"),
 L(6,["A","B","C"],{v:0},"U1","Choisir la forme juridique adaptée et obtenir NINEA et RCCM (ou statuts)","NINEA et RCCM obtenus","Formation FVE + journée de formalisation groupée","ADEPME, guichet de formalisation, greffe",6,"essentiel","demarche","Comparatif des formes juridiques et liste des pièces NINEA/RCCM (TAXAWU M6, FVE unité 1)"),
 L(6,["A","B","C"],{v:2},"U3","Identifier son régime fiscal, calculer sa CGU et se mettre à jour des déclarations","Fiche de calcul de la CGU remplie, quittance","Formation FVE","Centre des services fiscaux",9,"essentiel","modele","Fiche de calcul de la CGU (TAXAWU M6, FVE unité 3)"),
 L(6,["A","B"],{frein:true},"U0","Participer à une séance de sensibilisation sur les avantages de la formalisation","Participation et engagement de démarche signé","Séance collective","CADE, ADEPME",1,"rapide","formation",""),
 L(6,["B","C"],{n:3},"M6","Faire le bilan de conformité de l'entreprise et planifier les régularisations","Bilan de conformité rempli","Formation collective","CADE",6,"complementaire","modele","Bilan de conformité (modèle TAXAWU M6)"),
 L(7,["A","B"],{n:2},"CI","Ouvrir un numéro de paiement mobile réservé à l'entreprise","Numéro dédié actif","Coaching sur site","CADE",2,"rapide","outil","Numéro Wave ou Orange Money dédié"),
 L(7,["B"],{n:3},"M3","Créer un catalogue WhatsApp Business avec photos et prix","Catalogue en ligne","Formation collective","CADE",4,"rapide","outil","Guide de création du catalogue (TAXAWU M3)"),
 L(7,["C"],{n:4},"M1","Mettre en place un tableur de suivi des ventes et du stock","Tableur utilisé chaque semaine","Coaching sur site","CADE",6,"complementaire","outil","Tableur de suivi des ventes"),
 /* Masterclass MC10 · accès aux marchés publics (ajoutées en novembre 2026) */
 L(1,["B","C"],{n:4},"M3","Constituer et tenir à jour son dossier administratif pour les marchés publics (NINEA, RCCM, quitus fiscal, attestations IPRES, CSS et Inspection du travail, non-faillite)","Toutes les pièces présentes et valides à la date de la visite","Formation collective (MC10) + coaching","CADE, ARCOP",3,"essentiel","outil","Tableau du dossier administratif avec dates d'expiration (MC10, onglet Dossier_administratif)"),
 L(1,["C"],{n:4},"M3","Se faire connaître de trois acheteurs publics proches et consulter leurs plans de passation des marchés","Trois dépôts datés de la présentation, plans de passation consultés","Formation collective (MC10) + coaching","CADE, ARCOP",2,"rapide","relation","Veille des marchés publics (MC10, onglet Veille_marches)"),
 L(1,["C"],{n:4},"M3","Déposer une première offre à un marché public, seul ou en groupement, avec prix et trésorerie calculés","Récépissé de dépôt d'une offre conforme","Coaching dossier (relecture de l'offre)","CADE, ARCOP",6,"essentiel","modele","Prix d'offre, trésorerie du marché et rétroplanning (MC10)")
];
/* Masterclasses du parcours : titre, classeur des participants, segments (rec = recommandée, bes = selon le diagnostic) */
var MC = {
 MC1:{t:"Tenir sa caisse et connaître son vrai prix", rec:["A","B"], bes:[]},
 MC2:{t:"Piloter sa trésorerie et préparer son crédit", rec:["B","C"], bes:["A"]},
 MC3:{t:"Vendre plus et se faire payer", rec:["A","B"], bes:["C"]},
 MC4:{t:"Fixer son cap : objectifs et plan d'action", rec:["B","C"], bes:[]},
 MC5:{t:"Déléguer et organiser son équipe", rec:["B","C"], bes:["A"]},
 MC6:{t:"Se formaliser : pourquoi et comment", rec:["A"], bes:["B"]},
 MC7:{t:"Tenir ses comptes et payer le juste impôt", rec:["B","C"], bes:[]},
 MC8:{t:"Employeur en règle", rec:["C"], bes:["A","B"]},
 MC9:{t:"Le numérique au service de mon entreprise", rec:["A","B"], bes:["C"]},
 MC10:{t:"Accéder aux marchés publics", rec:["C"], bes:[]}
};
var MC_POURQUOI = {
 A:{MC2:"Épargne et compte IMF ; mois creux et pics de saisonnalité", MC5:"Si l'entreprise dépend trop de son promoteur", MC8:"Si l'activité exige une autorisation (FRA, licence, agrément)"},
 B:{MC6:"Si le RCCM manque ou si la forme juridique doit changer", MC8:"Si l'entreprise emploie du personnel"},
 C:{MC3:"Créances clients, référencement chez des distributeurs", MC9:"Tableur de suivi des ventes et du stock"}
};
function mcFichier(code){ return code+"_Outils_participants.xlsx"; }
/* Masterclass qui outille une action du PDI : d'abord la dimension Numérique et les actions de marchés publics, puis le module. */
function mcOf(p){
  if(!p) return null;
  if(p.mc) return p.mc;
  if(p.dim===7) return "MC9";
  if(/march[ée]s? publics?|acheteurs? publics?|dossier administratif/i.test(p.action||"")) return "MC10";
  var m={M1:"MC1",M2:"MC4",M3:"MC3",M4:"MC2",M5:"MC5",M6:"MC7",U0:"MC6",U1:"MC6",U2:"MC7",U3:"MC7",U4:"MC8",U5:"MC8",U6:"MC8"}[p.module];
  if(m) return m;
  if(p.module==="CI" && p.dim===3) return "MC1";
  return null;
}
var NATURES = {formation:"Formation", outil:"Outil à mettre en place", modele:"Modèle à remplir", coaching:"Coaching", relation:"Mise en relation", demarche:"Démarche administrative"};
var TYPES = {essentiel:"Essentiel", rapide:"Effet rapide", complementaire:"Complémentaire"};

/* ================= Règles ================= */
function moyenne(n){ var s=0; for(var i=0;i<8;i++) s+=n[i]; return Math.round(s/8*100)/100; }
function segment(n, projet){
  if(!n) return null; var m=moyenne(n);
  if(n[IDX_GESTION]<=1 || n[IDX_FORMAL]<=1) return "A";
  if(m<2.5) return "A";
  if(m>=3.5 && n[IDX_FORMAL]>=3 && projet) return "C";
  return "B";
}
function nf(x){ return String(x).replace(".",","); }
function segReason(n, projet){
  var m=moyenne(n);
  if(n[IDX_GESTION]<=1 || n[IDX_FORMAL]<=1) return "Segment A : les fondamentaux de gestion ou la formalisation sont notés 1 (garde-fou), quelle que soit la moyenne ("+nf(m)+").";
  if(m<2.5) return "Segment A : la moyenne ("+nf(m)+") est inférieure à 2,5.";
  if(m>=3.5 && n[IDX_FORMAL]>=3 && projet) return "Segment C : moyenne de "+nf(m)+", formalisation à "+n[IDX_FORMAL]+" et projet d'investissement chiffré.";
  if(m>=3.5) return "Segment B : la moyenne ("+nf(m)+") atteint 3,5, mais "+(n[IDX_FORMAL]<3?"la formalisation est inférieure à 3":"il n'y a pas encore de projet chiffré")+".";
  return "Segment B : la moyenne ("+nf(m)+") est comprise entre 2,5 et 3,5.";
}
/* note proposée à partir des repères cochés : 1 aucun repère de base, 2 base partielle, 3 base acquise, 4 base + consolidation, 5 tout acquis */
function propFromChecks(dim, ck){
  var D=DIMS[dim]; if(!ck) return 1;
  var all=function(l){ return D.c[l].every(function(_,i){return ck[l+i];}); }, any=function(l){ return D.c[l].some(function(_,i){return ck[l+i];}); };
  if(!all("A")) return any("A") ? 2 : 1;
  if(!all("B")) return 3;
  if(!all("C")) return 4;
  return 5;
}
function propFromVolets(v){
  var app=0, pts=0; v.forEach(function(s){ if(s==="Non applicable") return; app++; if(s==="Obtenu") pts+=1; else if(s==="En cours") pts+=0.5; });
  if(!app) return 5; return Math.max(1, Math.min(5, 1+Math.round(pts/app*4)));
}
function trigOK(l, x){
  var t=l.t, ok=false;
  if(t.n!=null && x.notes[l.dim] && x.notes[l.dim]<=t.n) ok=true;
  if(t.v!=null && x.volets && x.volets[t.v]!=="Obtenu" && x.volets[t.v]!=="Non applicable") ok=true;
  if(t.frein && x.freins && x.freins.some(Boolean)) ok=true;
  if(t.att && x.att && x.att[t.att]) ok=true;
  return ok;
}
function trigText(l){
  var t=l.t, p=[];
  if(t.n!=null) p.push("note « "+DIMS[l.dim].court+" » ≤ "+t.n);
  if(t.v!=null) p.push("volet FVE « "+VOLETS[t.v].nom+" » non obtenu");
  if(t.frein) p.push("frein à la formalisation exprimé");
  if(t.att) p.push("point d'attention : "+ATT[t.att].toLowerCase());
  return p.join(" ou ");
}
function isBloqLib(l, x){
  if(l.dim===IDX_GESTION && l.t.n!=null && x.notes[IDX_GESTION]<=2 && l.module==="M1" && l.type==="essentiel") return true;
  if(l.t.v===0 && x.volets && x.volets[0]!=="Obtenu") return true;
  return false;
}
/* Génération du PDI : 5 actions max, critères bloquants d'abord, au moins un effet rapide, formalisation obligatoire en A et B */
function genPDI(x, seg){
  var rank={essentiel:1,rapide:2,complementaire:3};
  var cand = LIB.filter(function(l){ return l.actif && l.segs.indexOf(seg)>=0 && trigOK(l,x); });
  cand.sort(function(a,b){
    var ba=isBloqLib(a,x)?0:1, bb=isBloqLib(b,x)?0:1; if(ba!==bb) return ba-bb;
    var fa=(seg!=="C" && a.dim===IDX_FORMAL && (a.t.v===0||a.t.v===2))?0:1, fb=(seg!=="C" && b.dim===IDX_FORMAL && (b.t.v===0||b.t.v===2))?0:1; if(fa!==fb) return fa-fb;
    var na=x.notes[a.dim]||5, nb=x.notes[b.dim]||5; if(na!==nb) return na-nb;
    return rank[a.type]-rank[b.type];
  });
  var out=[], perDim={};
  cand.forEach(function(l){ var cap = l.dim===IDX_FORMAL ? 2 : 1;
    if(out.length<5 && (perDim[l.dim]||0)<cap){ out.push(l); perDim[l.dim]=(perDim[l.dim]||0)+1; } });
  if(!out.some(function(l){return enMois(l.mois,l.unite)<=3;})){
    var q = cand.filter(function(l){ return enMois(l.mois,l.unite)<=3 && out.indexOf(l)<0; })[0];
    if(q){ if(out.length>=5) out.pop(); out.push(q); }
  }
  return out.map(function(l){ return libToItem(l, x.diagDate||TODAY); });
}
function addDur(d,n,u){ var x=new Date((d||TODAY)+"T00:00:00Z"); n=Number(n)||0; if(u==="jours") x.setUTCDate(x.getUTCDate()+n); else if(u==="semaines") x.setUTCDate(x.getUTCDate()+7*n); else x.setUTCMonth(x.getUTCMonth()+n); return x.toISOString().slice(0,10); }
function enMois(n,u){ n=Number(n)||0; return u==="jours"? n/30 : u==="semaines"? n/4.3 : n; }
var UNITES=["jours","semaines","mois"];
function libToItem(l, start){ start=start||TODAY; var u=l.unite||"mois"; return {lib:l.id, dim:l.dim, module:l.module, reco:recoText(l.module), action:l.action, livrable:l.livrable, modalite:l.modalite, partenaire:l.partenaire, debut:start, duree:l.mois, unite:u, echeance:addDur(start,l.mois,u), type:l.type, nature:l.nature, outil:l.outil, statut:"À faire"}; }
var TRANCHES = ["Moins de 5 M FCFA","5 à 25 M FCFA","25 à 100 M FCFA","Plus de 100 M FCFA"];
function money(x){ return (x==null||x==="")?"—":Number(x).toLocaleString("fr-FR").replace(/ | /g," ")+" FCFA"; }
function benef(f){ return (f && f.caMois!=null && f.charges!=null && f.caMois!=="" && f.charges!=="") ? Number(f.caMois)-Number(f.charges) : null; }


/* Copie de la bibliothèque par défaut : sert à initialiser la base au premier lancement. */
var LIB_DEFAUT = JSON.parse(JSON.stringify(LIB));
var FILIERES = ["Transformation agroalimentaire","Agriculture et maraîchage","Élevage et aviculture","Pêche et produits halieutiques","Sel","Commerce","Services","Artisanat (couture, menuiserie, coiffure)","BTP et matériaux","Transport et logistique","Autre"];
var FORMES = ["Informelle","Entreprise individuelle","GIE","SUARL","SARL","SA","SCOOPS / Coopérative","Association"];
var DEPTS = ["Kaolack","Guinguinéo","Nioro du Rip","Hors région"];
var AGES = {"-35":"Moins de 35 ans","35-50":"35 à 50 ans","50+":"Plus de 50 ans"};
var SECTEUR_CODE = {AG:"Agriculture", IN:"Industrie", SE:"Services", CO:"Commerce"};
var TYPES_TACHE = ["Diagnostic","Visite de suivi","Préparation du PDI","Formation à animer","Mise en relation","Autre"];
/* Table communes -> départements (région de Kaolack). Sources : pages Wikipédia des départements de Kaolack, Guinguinéo et Nioro du Rip. */
var COMMUNES = {"KAOLACK":"Kaolack","KAHONE":"Kaolack","NDOFFANE":"Kaolack","GANDIAYE":"Kaolack","SIBASSOR":"Kaolack","KEUR BAKA":"Kaolack","LATMINGUE":"Kaolack","THIARE":"Kaolack",
 "KEUR SOCE":"Kaolack","NDIAFFATE":"Kaolack","NDIEDIENG":"Kaolack","NDIEBEL":"Kaolack","GUINGUINEO":"Guinguinéo","FASS":"Guinguinéo","MBOSS":"Guinguinéo","KHELCOM BIRANE":"Guinguinéo",
 "MBADAKHOUNE":"Guinguinéo","NDIAGO":"Guinguinéo","NGATHIE NAOUDE":"Guinguinéo","GAGNICK":"Guinguinéo","NGUELOU":"Guinguinéo","OUROUR":"Guinguinéo","DARA MBOSS":"Guinguinéo",
 "PANAL WOLOF":"Guinguinéo","NIORO DU RIP":"Nioro du Rip","KEUR MADIABEL":"Nioro du Rip","MEDINA SABAKH":"Nioro du Rip","KAYEMOR":"Nioro du Rip","NGAYENE":"Nioro du Rip",
 "GAINTHE KAYE":"Nioro du Rip","PAOS KOTO":"Nioro du Rip","TAIBA NIASSENE":"Nioro du Rip","DABALY":"Nioro du Rip","DAROU SALAM":"Nioro du Rip","KEUR MABA DIAKHOU":"Nioro du Rip",
 "KEUR MADONGO":"Nioro du Rip","NDRAME ESCALE":"Nioro du Rip","WACK NGOUNA":"Nioro du Rip"};
var COMMUNES_A_CONFIRMER = ["NDIEBEL","KEUR MADIABEL"];
var ACT_FILIERE = {"AGROALIMENTAIRE":0,"AGROBUSINESS":0,"BOULANGERIE":0,"GLACIER":0,"SAPONIFICATION":0,"MARAICHAGE":1,"PRODUCTION AGRICOLE":1,"AVICULTURE":2,"ELEVAGE":2,"BOUCHER":2,
 "PECHE":3,"CONDITIONNEMENT DE SEL":4,"PRODUCTION DE SEL":4,"COMMERCE":5,"VENTE DE MARCHANDISES DIVERSES":5,"IMPORT EXPORT":5,"PRESTATION DE SERVICES":6,"TECHNICIENNE DE SURFACE":6,
 "NETTOIEMENT":6,"RESTAURATION":6,"FROID - CLIMATISATION":6,"COUTURE":7,"MENUISERIE EBENISTE":7,"COIFFURE":7,"BATIMENTS ET TRAVAUX PUBLICS ( BTP)":8,"TRANSPORT":9};
function cle(s){ return String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim(); }
function deptDe(commune){ return COMMUNES[cle(commune)] || ""; }
function filiereDe(activite){ var k=cle(activite); return (k in ACT_FILIERE) ? FILIERES[ACT_FILIERE[k]] : ""; }
function formeDe(rs, org){
  var s=cle((rs||"")+" "+(org||""));
  if(/\bGIE\b/.test(s)) return "GIE";
  if(/\b(SCOOP\w*|COOP\w*|SOCIETE COOPERATIVE)\b/.test(s)) return "SCOOPS / Coopérative";
  if(/\bSUARL\b/.test(s)) return "SUARL";
  if(/\bSARL\b/.test(s)) return "SARL";
  if(/\b(ETS|ETABLISSEMENTS?|ENTREPRISE)\b/.test(s)) return "Entreprise individuelle";
  return "";
}
function telNorm(raw){
  var d=String(raw==null?"":raw).replace(/\D/g,"");
  if(d.length===9) d="221"+d;
  if(d.length===12 && d.indexOf("221")===0){ var n=d.slice(3); return "+221 "+n.slice(0,2)+" "+n.slice(2,5)+" "+n.slice(5,7)+" "+n.slice(7); }
  return String(raw==null?"":raw).trim();
}
function telCle(t){ return String(t||"").replace(/\D/g,"").slice(-9); }
