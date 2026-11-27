/* Yokkute PME — module « Activités CADE » (version 1.8.1 : prestations de service par type, clients hors suivi ; v1.8 : import du journal des recettes de la caisse ; v1.7.1 : adhésions gratuites des programmes partenaires ; v1.7 : base des adhérents et cohortes ; v1.6 : recettes de la Plateforme électronique (PE) ; v1.5 : exports PDF / Word / Excel, pilotage ouvert à toute l'équipe).
   Référentiel des 9 axes de la fiche de poste, plan annuel (objectifs), journal des réalisations,
   ventes de cartes d'adhésion et tableau de bord prévu / réalisé.
   Collections Firestore : realisations, adhesions, adherents et recettes_import (lots importés), recettes_pe, cade_param. */
"use strict";
(function(){
var DB = window.YK_DB;
function APP(){ return window.YK_APP; }
function ME(){ return APP().ME; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function fd(d){ if(!d) return "—"; d=String(d).slice(0,10); var m=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."]; return Number(d.slice(8))+" "+m[Number(d.slice(5,7))-1]+" "+d.slice(0,4); }
function toast(m){ if(window.ykToast) window.ykToast(m); }
function num(v){ var n=Number(String(v==null?"":v).replace(/\s/g,"").replace(",",".")); return isFinite(n)?n:0; }
function ent(n){ return Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g," "); }
function pct(a,b){ return b>0 ? Math.round(a/b*100) : null; }
var SEPT_JOURS = 7*864e5;

/* ================= Référentiel : les 9 axes de la fiche de poste ================= */
/* m : l'action peut générer une recette (montant encaissé) · p : participants · f : financement (montant demandé / obtenu) */
var AXES = [
 {code:"A1", lib:"Accueil, écoute et diagnostic des besoins", ent:"option", note:"Les diagnostics 360° sont comptés automatiquement depuis le module Diagnostic.",
  types:[{t:"Accueil d'un visiteur"},{t:"Entretien d'écoute des besoins"},{t:"Orientation vers un service ou un partenaire"}]},
 {code:"A2", lib:"Plans d'accompagnement individualisés", ent:"oui", note:"Les PDI validés sont comptés automatiquement depuis le module PDI.",
  types:[{t:"Préparation d'un PDI"},{t:"Restitution du PDI au promoteur"},{t:"Révision d'un PDI"}]},
 {code:"A3", lib:"Conseil en gestion, organisation et financement", ent:"oui",
  types:[{t:"Séance de conseil en gestion ou organisation"},{t:"Conseil en financement"},{t:"Business plan",m:1},{t:"Dossier de crédit",m:1},{t:"Agrément local",m:1},{t:"Dossier d'agrément FRA",m:1},{t:"Appui à la formalisation",m:1},{t:"Conseil approfondi (forfait)",m:1}]},
 {code:"A4", lib:"Formations ciblées", ent:"option",
  types:[{t:"Session de formation",p:1,m:1},{t:"Masterclass (MC1 à MC11)",p:1,m:1},{t:"Atelier ou sensibilisation",p:1}]},
 {code:"A5", lib:"Opportunités de financement et de partenariat", ent:"option",
  types:[{t:"Veille sur les opportunités"},{t:"Diffusion d'un appel ou d'une opportunité"},{t:"Positionnement d'entreprises sur une opportunité"}]},
 {code:"A6", lib:"Mises en relation", ent:"oui",
  types:[{t:"Transmission d'un dossier de financement",f:1},{t:"Réponse reçue de l'institution",f:1},{t:"Rencontre entreprise et partenaire technique"}]},
 {code:"A7", lib:"Suivi des parcours et évaluation", ent:"oui", note:"Les visites de suivi saisies sur la fiche entreprise sont comptées automatiquement.",
  types:[{t:"Point d'avancement du PDI"},{t:"Suivi téléphonique"},{t:"Évaluation de fin de parcours"}]},
 {code:"A8", lib:"Gestion de la base de données", ent:"non",
  types:[{t:"Import de la liste des adhérents"},{t:"Mise à jour de fiches entreprises"},{t:"Nettoyage de la base"}]},
 {code:"A9", lib:"Rapports périodiques", ent:"non",
  types:[{t:"Rédaction d'un rapport"},{t:"Transmission du rapport"}]}
];
var INSTITUTIONS = ["BIMAO","FONGIP","DER/FJ","ADEPME","IMF (Baobab, PAMECAS, CMS…)","Banque","Partenaire technique","Autre"];
var MODES = ["Espèces","Wave","Orange Money","Chèque","Virement"];

/* Indicateurs du plan annuel. src : real (journal), diag, pdi, visite (données Yokkute existantes). Cibles : valeurs d'exemple. */
var INDIC = [
 {id:"I01", axe:"A1", lib:"Entreprises accueillies et écoutées", src:"real", types:["Accueil d'un visiteur","Entretien d'écoute des besoins"], def:400},
 {id:"I02", axe:"A1", lib:"Diagnostics 360° réalisés", src:"diag", def:100},
 {id:"I03", axe:"A2", lib:"PDI validés", src:"pdi", def:80},
 {id:"I04", axe:"A3", lib:"Séances de conseil", src:"real", types:["Séance de conseil en gestion ou organisation","Conseil en financement"], def:300},
 {id:"I05", axe:"A3", lib:"Business plans et dossiers de crédit", src:"real", types:["Business plan","Dossier de crédit"], def:40},
 {id:"I06", axe:"A4", lib:"Sessions de formation et masterclasses", src:"real", tout:1, def:24},
 {id:"I07", axe:"A4", lib:"Participants formés", src:"real", tout:1, mesure:"participants", def:600},
 {id:"I08", axe:"A5", lib:"Opportunités diffusées", src:"real", types:["Diffusion d'un appel ou d'une opportunité"], def:20},
 {id:"I09", axe:"A6", lib:"Dossiers transmis aux institutions", src:"real", types:["Transmission d'un dossier de financement"], def:60},
 {id:"I10", axe:"A7", lib:"Visites et points de suivi", src:"visite", types:["Point d'avancement du PDI","Suivi téléphonique"], def:200},
 {id:"I11", axe:"A8", lib:"Mises à jour de la base", src:"real", tout:1, def:12},
 {id:"I12", axe:"A9", lib:"Rapports transmis", src:"real", types:["Transmission du rapport"], def:19}
];
/* Tarifs CCIAK des cartes d'adhésion (version 1.7) : EI et SUARL 3 000 FCFA ; GIE, coopérative, SARL et SA 10 000 FCFA. Cible indicative : 700 cartes par an. */
var CARTES_DEF = [
 {code:"EI", lib:"Entreprise individuelle / SUARL", tarif:3000, cible:600},
 {code:"GIE", lib:"GIE / Coopérative", tarif:10000, cible:90},
 {code:"SOC", lib:"SARL / SA", tarif:10000, cible:10}
];
var CARTES_ANCIENNES = "TPE:10000|PME:25000|GE:100000";
var CAT_LIB = {EI:"Entreprise individuelle / SUARL", GIE:"GIE / Coopérative", SOC:"SARL / SA"};
var PLACES_DEF = 50;
/* Version 1.7.1 : adhésions gratuites, offertes par l'enrôlement d'un programme partenaire, repérées par le coach. Modifiable dans le plan annuel. */
var GRATUITES_DEF = {programme:"Nataal Sine Saloum (NSS)", coachs:["Yatte Diagne","Sophie Diack","Mohammeth Dany Niouky Niouky"]};
/* Plateforme électronique (PE) : catalogue des prestations numériques, tarifs et cibles annuelles d'exemple (modifiables dans le plan annuel). */
/* Version 1.8 : catalogue aligné sur les prestations réelles de la PE (caisse mars–novembre 2026) ; tarifs moyens et cibles d'exemple, modifiables. */
var PE_DEF = [
 {code:"ETQ", lib:"Étiquettes et emballages", tarif:7500, cible:50},
 {code:"CVIS", lib:"Cartes de visite et flyers", tarif:15000, cible:15},
 {code:"COM", lib:"Grand format (bâches, banderoles, kakémonos, tableaux PVC)", tarif:20000, cible:15},
 {code:"PVC", lib:"Cartes PVC et impression de cartes", tarif:2000, cible:20},
 {code:"FACT", lib:"Impressions et papeterie (attestations, factures)", tarif:7500, cible:5},
 {code:"LOGO", lib:"Logo et identité visuelle", tarif:5000, cible:10},
 {code:"RS", lib:"Visuels pour les réseaux sociaux", tarif:15000, cible:10}
];
var PE_ANCIEN = "ETQ:15000|LOGO:25000|FACT:10000|COM:20000|CVIS:10000|RS:15000";
/* Correspondance entre les prestations du journal de caisse et le catalogue PE. */
function peCodeDe(lib){ var k=cle(lib);
  if(/ETIQU/.test(k)) return "ETQ"; if(/LOGO/.test(k)) return "LOGO"; if(/VISITE|FLYER|CDV/.test(k)) return "CVIS";
  if(/BACHE|BANDEROLE|KAKEMONO|TABLEAU|GRAND FORMAT|AFFICHE/.test(k)) return "COM"; if(/PVC|IMPRESSION DE CARTE|IMP CARTE/.test(k)) return "PVC";
  if(/ATTESTATION|FACTURE|PAPETERIE|DEVIS/.test(k)) return "FACT"; if(/RESEAU|VISUEL/.test(k)) return "RS"; return "AUTRE"; }
var PE_AUTRE = {code:"AUTRE", lib:"Autre prestation numérique", tarif:0, cible:0};
var PRESTA_DEF = 10100000, FINANC_DEF = 300000000;

/* ================= Données ================= */
var REAL = [], ADH = [], ADHDOCS = [], LOTS = [], PE = [], PEDOCS = [], RIMP = [], PARAM = {}, ERR = null;
function refresh(){ if(APP()) APP().refresh(); }
DB.listen("realisations", function(d){ REAL=d.map(function(x){ x.id=x.id||x._id; return x; }); ERR=null; refresh(); });
DB.listen("adhesions", function(d){ ADHDOCS=d.map(function(x){ x.id=x.id||x._id; return x; }); rebuildAdh(); refresh(); });
/* Version 1.7 : les adhésions importées depuis la liste CCIAK sont rangées par lots mensuels (une douzaine de lectures au lieu d'une par adhérent). */
DB.listen("adherents", function(d){ LOTS=d.map(function(x){ x.id=x.id||x._id; return x; }); rebuildAdh(); refresh(); });
DB.listen("recettes_pe", function(d){ PEDOCS=d.map(function(x){ x.id=x.id||x._id; return x; }); rebuildPE(); refresh(); });
/* Version 1.8 : journal des recettes de la caisse (PE, prestations, renouvellements), importé par lots mensuels. */
DB.listen("recettes_import", function(d){ RIMP=d.map(function(x){ x.id=x.id||x._id; return x; }); rebuildAdh(); rebuildPE(); refresh(); });
DB.listen("cade_param", function(d){ PARAM={}; d.forEach(function(x){ PARAM[x._id]=x; }); rebuildAdh(); rebuildPE(); refresh(); });
DB.listen("_error", function(col, err){ if(["realisations","adhesions","adherents","recettes_import","recettes_pe","cade_param"].indexOf(col)>=0){ ERR=(err && err.code)||"erreur"; refresh(); } });

/* ---- Base des adhérents ---- */
function normForme(f){ var k=cle(f).replace(/[^A-Z ]/g," ").trim();
  if(!k) return ""; if(/COOP/.test(k)) return "Coopérative"; if(/\bGIE\b|G I E/.test(k)) return "GIE"; if(/SUARL/.test(k)) return "SUARL";
  if(/SARL/.test(k)) return "SARL"; if(k==="SA" || /SOCIETE ANONYME/.test(k)) return "SA"; if(/^EI\b|INDIVIDUEL/.test(k)) return "EI"; return String(f).trim(); }
function catDeForme(f){ f=normForme(f); return (f==="GIE"||f==="Coopérative") ? "GIE" : (f==="SARL"||f==="SA") ? "SOC" : "EI"; }
function tarifCat(annee, cat){ var c=plan(annee).cartes.filter(function(x){ return x.code===cat; })[0]; if(c) return num(c.tarif); var d=CARTES_DEF.filter(function(x){ return x.code===cat; })[0]; return d?d.tarif:0; }
function cleNom(x){ return cle(x).replace(/([A-Z])\1+/g,"$1"); }
function gratuiteDe(coach, annee){ var k=cleNom(coach); if(!k) return ""; var G=plan(Number(annee)).gratuites||{};
  return (G.coachs||[]).some(function(c){ var g=cleNom(c); return g && (g===k || k.indexOf(g)===0 || g.indexOf(k)===0); }) ? (G.programme||"Programme partenaire") : ""; }
function montantLigne(l){ var an=String(l.date).slice(0,4); return gratuiteDe(l.coach, an) ? 0 : tarifCat(Number(an), catDeForme(l.forme)); }
function journalImporte(cat){ var out=[]; RIMP.forEach(function(L){ (L.lignes||[]).forEach(function(l){ if(!cat || l.cat===cat) out.push(l); }); }); return out; }
function rebuildPE(){
  PE=PEDOCS.concat(journalImporte("PE").map(function(l){ var c=peCodeDe(l.pres+" "+l.libelle), cat=plan(Number(String(l.date).slice(0,4))).pe.concat([PE_AUTRE]).filter(function(x){ return x.code===c; })[0];
    return {id:"jr_"+l.n+"_"+l.date, importe:true, date:l.date, entrepriseId:l.mat||"", entrepriseNom:l.client, telephone:"", prestation:c, prestationLib:cat?cat.lib:l.pres, quantite:num(l.quantite)||1,
      montant:num(l.montant), modePaiement:"", recu:"", description:l.libelle||"", statutCommande:"Livrée", livreLe:l.date, statut:"Valide", auteur:"", creeLe:"", creeMs:0}; }));
}
function prestaImportees(){ return journalImporte("Prestations"); }
function lignesImportees(){ var out=[]; LOTS.forEach(function(L){ (L.lignes||[]).forEach(function(l){ out.push(l); }); }); return out; }
function rebuildAdh(){
  var deja={}; ADHDOCS.forEach(function(x){ if(x.statut!=="Annulée" && x.matricule) deja[x.matricule+"|"+String(x.date).slice(0,4)]=1; });
  var imp=lignesImportees().filter(function(l){ return l.mat && l.date && !deja[l.mat+"|"+String(l.date).slice(0,4)]; }).map(function(l){
    var cat=catDeForme(l.forme), anMat=Number(String(l.mat).slice(2,6));
    return {id:"imp_"+l.mat+"_"+String(l.date).slice(0,4), importe:true, date:l.date, entrepriseId:"", entrepriseNom:l.nom, matricule:l.mat, categorie:cat, categorieLib:CAT_LIB[cat],
      montant:montantLigne(l), gratuite:gratuiteDe(l.coach, String(l.date).slice(0,4)), nature:(anMat && anMat<Number(String(l.date).slice(0,4))) ? "Renouvellement" : "Nouvelle adhésion", echeance:addDur(l.date,12,"mois"),
      modePaiement:"", recu:"", statut:"Valide", auteur:"", telephone:l.tel||"", forme:l.forme||"", commune:l.commune||"", coach:l.coach||""}; });
  /* Renouvellements du journal de caisse absents de la liste CCIAK (une ligne déjà dans la liste n'est pas comptée deux fois). */
  var vuMat={}; imp.concat(ADHDOCS).forEach(function(x){ if(x.matricule && x.statut!=="Annulée") vuMat[x.matricule+"|"+String(x.date).slice(0,4)]=1; });
  var ren=journalImporte("Renouvellement").filter(function(l){ return !(l.mat && vuMat[l.mat+"|"+String(l.date).slice(0,4)]); }).map(function(l){ var cat=catDeForme(l.statut);
    return {id:"jr_"+l.n+"_"+l.date, importe:true, journal:true, date:l.date, entrepriseId:"", entrepriseNom:l.client, matricule:l.mat||"", categorie:cat, categorieLib:CAT_LIB[cat], montant:num(l.montant),
      nature:"Renouvellement", echeance:addDur(l.date,12,"mois"), modePaiement:"", recu:"", statut:"Valide", auteur:"", telephone:"", forme:l.statut||"", gratuite:""}; });
  ADH=ADHDOCS.concat(imp, ren);
}
/* Une ligne par adhérent et par année : liste importée + cartes vendues dans l'application. */
function baseRows(annee){
  var rows=[], vu={};
  lignesImportees().forEach(function(l){ if(!l.mat || !l.date) return; var a=String(l.date).slice(0,4); if(annee!=="tous" && a!==String(annee)) return;
    rows.push({mat:l.mat, date:l.date, annee:a, nom:l.nom, org:l.org||"", prom:l.prom||"", prenom:l.prenom||"", nomP:l.nomP||"", tel:l.tel||"", adresse:l.adresse||"", commune:l.commune||"", activite:l.activite||"", coach:l.coach||"", forme:l.forme||"", montant:montantLigne(l), gratuite:gratuiteDe(l.coach, a), source:"Liste importée"}); vu[l.mat+"|"+a]=1; });
  ADHDOCS.forEach(function(x){ if(x.statut==="Annulée") return; var a=String(x.date).slice(0,4); if(annee!=="tous" && a!==String(annee)) return; var k=(x.matricule||("NOM:"+cle(x.entrepriseNom)))+"|"+a;
    if(vu[k]){ rows.forEach(function(r){ if(r.mat+"|"+r.annee===k){ r.montant=num(x.montant); r.gratuite=""; r.source="Vente enregistrée"; } }); return; } vu[k]=1;
    var e=x.entrepriseId?APP().byId(x.entrepriseId):null;
    rows.push({mat:x.matricule||"", date:x.date, annee:a, nom:x.entrepriseNom, org:e?e.org:"", prom:e?e.prom:"", prenom:e?e.prenom:"", nomP:e?e.nomP:"", tel:e?e.tel:"", adresse:e?e.adresse:"", commune:e?e.commune:"", activite:e?e.activite:"", coach:e?e.coach:"", forme:e?e.forme:(x.categorieLib||""), montant:num(x.montant), source:"Vente enregistrée"}); });
  if(annee==="tous"){ var last={}; rows.forEach(function(r){ var k=r.mat||("NOM:"+cle(r.nom)); if(!last[k] || r.date>last[k].date) last[k]=r; }); rows=Object.keys(last).map(function(k){ return last[k]; }); }
  return rows;
}
function suiviDe(mat){ var e=mat?APP().byId(mat):null; if(!e) return null; return e; }
function suiviesCohorte(annee){ return APP().ENT.filter(function(e){ return String(e.cohorte||"")===String(annee); }).length; }

function refDoc(){ return PARAM.referentiel || {types:{}}; }
function axe(code){ for(var i=0;i<AXES.length;i++) if(AXES[i].code===code) return AXES[i]; return null; }
function typesOf(code){ var a=axe(code); if(!a) return []; return a.types.concat((refDoc().types||{})[code]||[]); }
function typeOf(code, t){ if(/^Masterclass \(MC1 à MC1\d\)$/.test(t||"")) t="Masterclass (MC1 à MC11)"; var L=typesOf(code); for(var i=0;i<L.length;i++) if(L[i].t===t) return L[i]; return {t:t}; }
function plan(annee){
  var p=PARAM["annee_"+annee], cib={};
  INDIC.forEach(function(i){ cib[i.id]=(p && p.cibles && p.cibles[i.id]!=null) ? Number(p.cibles[i.id]) : i.def; });
  return {annee:annee, existe:!!p, cibles:cib, cartes:(p && p.cartes && p.cartes.map(function(c){ return c.code+":"+c.tarif; }).join("|")!==CARTES_ANCIENNES) ? p.cartes : JSON.parse(JSON.stringify(CARTES_DEF)), places:(p && p.places!=null) ? num(p.places) : PLACES_DEF, gratuites:(p && p.gratuites) || JSON.parse(JSON.stringify(GRATUITES_DEF)), pe:(p && p.pe && p.pe.map(function(c){ return c.code+":"+c.tarif; }).join("|")!==PE_ANCIEN) ? p.pe : JSON.parse(JSON.stringify(PE_DEF)),
    prestations:(p && p.prestations!=null) ? Number(p.prestations) : PRESTA_DEF, financements:(p && p.financements!=null) ? Number(p.financements) : FINANC_DEF,
    majLe:p && p.majLe, majPar:p && p.majPar};
}
function cibleCartes(P){ return P.cartes.reduce(function(s,c){ return s+num(c.tarif)*num(c.cible); },0); }
function ciblePE(P){ return (P.pe||[]).reduce(function(s,c){ return s+num(c.tarif)*num(c.cible); },0); }
function valides(L){ return L.filter(function(x){ return x.statut!=="Annulée"; }); }
function somme(L){ return L.reduce(function(s,x){ return s+num(x.montant); },0); }

/* ================= Droits ================= */
function role(){ return ME() ? ME().role : ""; }
function isOwner(){ return role()==="proprietaire"; }
function isMgr(){ return role()==="proprietaire" || role()==="chef"; }
function isAccueil(){ return role()==="accueil"; }
function isConsLike(){ return role()==="proprietaire" || role()==="chef" || role()==="conseiller"; }
function canSaisir(){ return isConsLike() || isAccueil(); }
function isPE(){ return role()==="pe"; }
/* Recettes PE : saisies par l'agent PE, l'accueil / caisse, les conseillers, le responsable portefeuille et le propriétaire. */
function canSaisirPE(){ return canSaisir() || isPE(); }
function canEditPE(x){ return isMgr() || (canSaisirPE() && x.auteur===ME().email && recent(x)); }
/* Version 1.5 : tableaux de bord et pilotage visibles par toute l'équipe, pour un suivi participatif. */
function canVoirEquipe(){ return !!ME(); }
function recent(x){ return x.creeMs && (Date.now()-x.creeMs) < SEPT_JOURS; }
function canEditDoc(x){ return isMgr() || (canSaisir() && x.auteur===ME().email && recent(x)); }
function axesSaisissables(){ return isAccueil() ? AXES.filter(function(a){ return a.code==="A1"; }) : AXES; }

/* ================= Périodes ================= */
/* Années proposées : de 2026 (mise en service) à l'année prochaine, plus toute année où des données existent. */
function annees(){
  var y=Number(TODAY.slice(0,4)), set={}; for(var a=2026; a<=y+1; a++) set[a]=1;
  REAL.concat(ADH, PE).forEach(function(x){ var z=Number(String(x.date||"").slice(0,4)); if(z>2000) set[z]=1; });
  Object.keys(PARAM).forEach(function(k){ var m=k.match(/^annee_(\d{4})$/); if(m) set[Number(m[1])]=1; });
  return Object.keys(set).map(Number).sort();
}
function yearOpts(cur){ var L=annees(); if(L.indexOf(cur)<0){ L.push(cur); L.sort(); } return L.map(function(z){ return '<option'+(z===cur?" selected":"")+'>'+z+'</option>'; }).join(""); }
var MOISN=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
var C = {tab:"tableau", per:{type:"annee", annee:Number(TODAY.slice(0,4)), idx:Number(TODAY.slice(5,7))}, form:null, adh:null, jf:{axe:"", qui:"", q:""},
         planEdit:null, planAnnee:Number(TODAY.slice(0,4)), ntype:null, annuler:null, caisse:{date:TODAY, tous:false}};
function periode(r){
  var y=r.annee, a, b, lab, mois;
  function fin(yy,mm){ return new Date(Date.UTC(yy,mm,0)).toISOString().slice(0,10); }
  function p2(n){ return String(n).padStart(2,"0"); }
  if(r.type==="mois"){ a=y+"-"+p2(r.idx)+"-01"; b=fin(y,r.idx); lab=MOISN[r.idx-1]+" "+y; mois=1; }
  else if(r.type==="trimestre"){ var m0=(r.idx-1)*3+1; a=y+"-"+p2(m0)+"-01"; b=fin(y,m0+2); lab=["1er","2e","3e","4e"][r.idx-1]+" trimestre "+y; mois=3; }
  else if(r.type==="semestre"){ var s0=r.idx===1?1:7; a=y+"-"+p2(s0)+"-01"; b=fin(y,s0+5); lab=(r.idx===1?"1er":"2e")+" semestre "+y; mois=6; }
  else { a=y+"-01-01"; b=y+"-12-31"; lab="Année "+y; mois=12; }
  return {debut:a, fin:b, label:lab, part:mois/12};
}
/* Part de la période déjà écoulée (pour la trajectoire et la projection). */
function ecoule(P){
  if(TODAY<P.debut) return 0; if(TODAY>=P.fin) return 1;
  return (Date.parse(TODAY)-Date.parse(P.debut)+864e5)/(Date.parse(P.fin)-Date.parse(P.debut)+864e5);
}

/* ================= Calculs ================= */
function calc(per){
  var P=periode(per), inP=function(d){ d=String(d||"").slice(0,10); return d && d>=P.debut && d<=P.fin; };
  var ENT=APP().ENT, R=REAL.filter(function(r){ return inP(r.date); });
  var out={P:P, ind:{}, R:R};
  INDIC.forEach(function(i){
    var v=0;
    if(i.src==="diag") ENT.forEach(function(e){ (e.diags||[]).forEach(function(d){ if(inP(d.date)) v++; }); });
    else if(i.src==="pdi") ENT.forEach(function(e){ if(inP(e.pdiValide)) v++; });
    if(i.src==="visite") ENT.forEach(function(e){ (e.visites||[]).forEach(function(x){ if(inP(x.date)) v++; }); });
    if(i.src==="real" || i.src==="visite") R.forEach(function(r){
      if(r.axe!==i.axe) return; if(!i.tout && (i.types||[]).indexOf(r.type)<0) return;
      v += i.mesure==="participants" ? num(r.participants) : 1; });
    /* Business plans repris du journal de caisse (une ligne « 15000*15 » compte 15 business plans). */
    if(i.id==="I05") prestaImportees().forEach(function(l){ if(inP(l.date) && /BUSINESS/.test(cle(l.pres))) v += num(l.quantite)||1; });
    out.ind[i.id]=v;
  });
  var A=ADH.filter(function(x){ return x.statut!=="Annulée" && inP(x.date); });
  out.cartesNb=A.length; out.cartes=A.reduce(function(s,x){ return s+num(x.montant); },0);
  out.cartesNouv=A.filter(function(x){ return x.nature!=="Renouvellement"; }).length;
  out.cartesGrat=A.filter(function(x){ return x.gratuite; }).length;
  var Q=valides(PE).filter(function(x){ return inP(x.date); });
  out.peNb=Q.length; out.pe=somme(Q); out.peQte=Q.reduce(function(s,x){ return s+(num(x.quantite)||1); },0);
  out.prestaJ=prestaImportees().filter(function(l){ return inP(l.date); });
  var pt={}; R.forEach(function(r){ if(num(r.montant)>0){ var k=r.type||"Autre prestation"; var o=pt[k]||(pt[k]={type:k, n:0, mt:0}); o.n++; o.mt+=num(r.montant); } });
  out.prestaJ.forEach(function(l){ var k=/BUSINESS/.test(cle(l.pres))?"Business plan":/AGREMENT|AGREEMENT/.test(cle(l.pres))?"Agrément local":/FRA/.test(cle(l.pres))?"Dossier d'agrément FRA":(l.pres||"Autre prestation");
    var o=pt[k]||(pt[k]={type:k, n:0, mt:0}); o.n+=num(l.quantite)||1; o.mt+=num(l.montant); });
  out.prestaParType=Object.keys(pt).map(function(k){ return pt[k]; }).sort(function(a,b){ return b.mt-a.mt; });
  out.presta=R.reduce(function(s,r){ return s+num(r.montant); },0)+out.prestaJ.reduce(function(s,l){ return s+num(l.montant); },0);
  out.financ=R.reduce(function(s,r){ return s+num(r.montantObtenu); },0);
  out.demande=R.reduce(function(s,r){ return s+num(r.montantDemande); },0);
  out.parAuteur={}; R.forEach(function(r){ out.parAuteur[r.auteur]=(out.parAuteur[r.auteur]||0)+1; });
  return out;
}
/* Cartes arrivant à échéance dans les 30 jours ou échues depuis moins de 60 jours, sans renouvellement enregistré. */
function aRelancer(){
  var last={};
  ADH.forEach(function(x){ if(x.statut==="Annulée") return; var k=x.matricule||("NOM:"+cle(x.entrepriseNom)); if(!last[k] || (x.echeance||"")>(last[k].echeance||"")) last[k]=x; });
  var lo=addDur(TODAY,-60,"jours"), hi=addDur(TODAY,30,"jours");
  return Object.keys(last).map(function(k){ return last[k]; }).filter(function(x){ return x.echeance && x.echeance>=lo && x.echeance<=hi; })
    .sort(function(a,b){ return a.echeance<b.echeance?-1:1; });
}

/* ================= Composants ================= */
function couleur(t){ return t==null ? "var(--muted)" : t>=90 ? "var(--good)" : t>=60 ? "var(--warn)" : "var(--bad)"; }
function barre(t){ var w=Math.max(0,Math.min(100,t||0)); return '<div class="bar" style="min-width:90px"><span style="width:'+w+'%;background:'+couleur(t)+'"></span></div>'; }
function tabList(){
  var T=[];
  if(isConsLike()) T.push(["moi","Mon espace"]);
  if(isPE()) T.push(["pe","Recettes PE"]);
  if(canSaisirPE()) T.push(["caisse","Accueil / caisse"]);
  T.push(["tableau","Tableau de bord"]);
  if(canVoirEquipe()) T.push(["equipe","Pilotage de l'équipe"]);
  T.push(["journal","Journal des activités"],["cartes","Cartes d'adhésion"],["base","Base des adhérents"]);
  if(!isPE()) T.push(["pe","Recettes PE"]);
  T.push(["plan","Plan annuel et référentiel"]);
  return T;
}
function tabs(){
  var T=tabList();
  return '<div class="row segtabs">'+T.map(function(x){ return '<button class="btn sm'+(C.tab===x[0]?" primary":" ghost")+'" data-act="c_tab" data-v="'+x[0]+'">'+x[1]+'</button>'; }).join("")+'</div>';
}
function perSelect(){
  var p=C.per, idx="";
  if(p.type==="mois") idx=MOISN.map(function(m,i){ return '<option value="'+(i+1)+'"'+(p.idx===i+1?" selected":"")+'>'+m+'</option>'; }).join("");
  else if(p.type==="trimestre") idx=[1,2,3,4].map(function(i){ return '<option value="'+i+'"'+(p.idx===i?" selected":"")+'>T'+i+'</option>'; }).join("");
  else if(p.type==="semestre") idx=[1,2].map(function(i){ return '<option value="'+i+'"'+(p.idx===i?" selected":"")+'>S'+i+'</option>'; }).join("");
  return '<div class="card"><div class="filters" style="grid-template-columns:1fr 1fr 1fr"><label class="f">Période<select id="c_ptype">'+
    [["mois","Mois"],["trimestre","Trimestre"],["semestre","Semestre"],["annee","Année"]].map(function(x){ return '<option value="'+x[0]+'"'+(p.type===x[0]?" selected":"")+'>'+x[1]+'</option>'; }).join("")+'</select></label>'+
    (idx?'<label class="f">Lequel<select id="c_pidx">'+idx+'</select></label>':'<div></div>')+
    '<label class="f">Année<select id="c_pan">'+yearOpts(p.annee)+'</select></label></div></div>';
}
function entList(){
  return '<datalist id="c_ents">'+APP().ENT.slice().sort(function(a,b){ return a.nom<b.nom?-1:1; }).map(function(e){ return '<option value="'+esc(e.nom+" · "+e.id)+'"></option>'; }).join("")+'</datalist>';
}
function adhList(){ var vu={}, o=[];
  APP().ENT.forEach(function(e){ if(e.id && !vu[e.id]){ vu[e.id]=1; o.push(e.nom+" · "+e.id); } });
  baseRows("tous").forEach(function(r){ if(r.mat && !vu[r.mat]){ vu[r.mat]=1; o.push(r.nom+" · "+r.mat); } });
  return '<datalist id="c_adhs">'+o.sort().map(function(v){ return '<option value="'+esc(v)+'"></option>'; }).join("")+'</datalist>'; }
function baseFromText(txt){ var m=String(txt||"").match(/·\s*([^·]+)$/); if(!m) return null; var id=m[1].trim(), L=baseRows("tous"); for(var i=0;i<L.length;i++) if(L[i].mat===id) return L[i]; return null; }
function entFromText(txt){
  var s=String(txt||"").trim(), m=s.match(/·\s*([^·]+)$/), ENT=APP().ENT;
  if(m){ var id=m[1].trim(); for(var i=0;i<ENT.length;i++) if(ENT[i].id===id) return ENT[i]; }
  for(var j=0;j<ENT.length;j++) if(cle(ENT[j].nom)===cle(s) || ENT[j].id===s) return ENT[j];
  return null;
}
function rulesWarn(){
  return ERR ? '<div class="warnbox"><b>Accès refusé par la base ('+esc(ERR)+').</b><span class="small">Les règles Firestore n\'ont pas encore été mises à jour pour la version 1.2. Recopiez le fichier firestore.rules dans Firebase › Firestore Database › Règles › Publier, puis rechargez la page.</span></div>' : "";
}

/* ================= Écran : tableau de bord ================= */
function vTableau(){
  var per=C.per, K=calc(per), P=K.P, Pl=plan(per.annee), part=P.part, ec=ecoule(P), h=perSelect()+barreExport("Télécharger le rapport de la période");
  if(!Pl.existe) h+='<p class="ro-banner">Les cibles affichées sont des <b>valeurs d\'exemple</b>. Le propriétaire ou le responsable portefeuille les remplace dans « Plan annuel et référentiel ».</p>';
  function fin(lib, real, cibleAn, sous){
    var cib=cibleAn*part, t=pct(real,cib), proj=ec>0 && ec<1 ? real/ec : null;
    return '<div class="card"><span class="small muted">'+lib+'</span><b class="num" style="font-family:var(--f-display);font-size:1.5rem">'+ent(real)+' <span class="small muted">FCFA</span></b>'+barre(t)+
      '<span class="small"><b style="color:'+couleur(t)+'">'+(t==null?"—":t+" %")+'</b> de la cible de la période ('+ent(cib)+' FCFA)</span>'+
      (sous?'<span class="small muted">'+sous+'</span>':'')+(proj!=null?'<span class="small muted">Projection fin de période au rythme actuel : '+ent(proj)+' FCFA</span>':'')+'</div>';
  }
  h+='<section class="card"><div class="row between"><h2>Objectifs financiers · '+esc(P.label)+'</h2><span class="small muted">Période écoulée : '+Math.round(ec*100)+' %</span></div><div class="grid g4">'+
    fin("Recettes des cartes d'adhésion", K.cartes, cibleCartes(Pl), K.cartesNb+" carte(s), dont "+K.cartesNouv+" nouvelle(s) adhésion(s)"+(K.cartesGrat?" et "+K.cartesGrat+" gratuite(s) (programme partenaire)":""))+
    fin("Recettes de la Plateforme électronique (PE)", K.pe, ciblePE(Pl), K.peNb+" recette(s) · étiquettes, logos, factures, supports…")+
    fin("Recettes des prestations du CADE", K.presta, Pl.prestations, "Business plans et prestations encaissés"+(K.prestaJ.length?" · dont "+K.prestaJ.length+" opération(s) du journal de caisse":""))+
    fin("Financements obtenus par les entreprises", K.financ, Pl.financements, "Montant demandé : "+ent(K.demande)+" FCFA")+'</div>'+
    '<p class="small muted">Total des recettes propres (cartes + PE + prestations) : <b>'+ent(K.cartes+K.pe+K.presta)+' FCFA</b> sur une cible de '+ent((cibleCartes(Pl)+ciblePE(Pl)+Pl.prestations)*part)+' FCFA pour la période ('+(pct(K.cartes+K.pe+K.presta,(cibleCartes(Pl)+ciblePE(Pl)+Pl.prestations)*part)==null?"—":pct(K.cartes+K.pe+K.presta,(cibleCartes(Pl)+ciblePE(Pl)+Pl.prestations)*part)+" %")+').</p></section>';

  h+=vPrestaTypes(K, P);
  h+=recettesParMois(Number(String(P.debut).slice(0,4)));
  h+='<section class="card"><h2>Prévu et réalisé par axe de la fiche de poste</h2><div class="tablewrap"><table><thead><tr><th>Axe</th><th>Indicateur</th><th class="num">Réalisé</th><th class="num">Cible</th><th>Taux</th></tr></thead><tbody>';
  INDIC.forEach(function(i){ var r=K.ind[i.id], c=Math.round(Pl.cibles[i.id]*part*10)/10, t=pct(r,c);
    h+='<tr><td><span class="tag">'+i.axe+'</span></td><td>'+esc(i.lib)+(i.src!=="real"?' <span class="small muted">(auto)</span>':'')+'</td><td class="num"><b>'+ent(r)+'</b></td><td class="num">'+nf(c)+'</td><td><div class="row" style="flex-wrap:nowrap;gap:8px">'+barre(t)+'<b class="small num" style="color:'+couleur(t)+';min-width:44px">'+(t==null?"—":t+" %")+'</b></div></td></tr>'; });
  h+='</tbody></table></div><p class="small muted">Vert à partir de 90 % de la cible de la période, orange de 60 à 89 %, rouge en dessous. « (auto) » : compté depuis les diagnostics, PDI et visites déjà enregistrés dans Yokkute.</p></section>';

  var rel=aRelancer();
  h+='<div class="grid g2"><section class="card"><div class="row between"><h2>Cartes à renouveler</h2><span class="tag">'+rel.length+'</span></div>';
  if(!rel.length) h+='<p class="empty">Aucune carte n\'arrive à échéance dans les 30 prochains jours.</p>';
  rel.slice(0,8).forEach(function(x){ var late=x.echeance<TODAY; h+='<div class="alert" data-act="c_tab" data-v="cartes"><b class="'+(late?"ko":"")+'" style="min-width:92px">'+fd(x.echeance)+'</b><span>'+esc(x.entrepriseNom)+' <span class="small muted">'+esc(x.matricule||"")+' · '+esc(x.categorie||"")+'</span></span></div>'; });
  if(rel.length>8) h+='<p class="small muted">… et '+(rel.length-8)+' autre(s), voir l\'onglet « Cartes d\'adhésion ».</p>';
  h+='</section><section class="card"><h2>Activités saisies par membre</h2>';
  var au=Object.keys(K.parAuteur).sort(function(a,b){ return K.parAuteur[b]-K.parAuteur[a]; });
  if(!au.length) h+='<p class="empty">Aucune activité saisie sur la période.</p>';
  else { var mx=K.parAuteur[au[0]]; h+='<div class="tablewrap"><table><tbody>'+au.map(function(a){ return '<tr><td>'+esc(APP().court(a))+'</td><td style="width:45%"><div class="bar"><span style="width:'+Math.round(K.parAuteur[a]/mx*100)+'%;background:var(--accent)"></span></div></td><td class="num"><b>'+K.parAuteur[a]+'</b></td></tr>'; }).join("")+'</tbody></table></div>'; }
  h+='</section></div>';

  var fil=REAL.map(function(r){ return {d:r.creeLe||r.date, txt:'<span class="tag">'+r.axe+'</span> '+esc(r.type)+(r.entrepriseNom?' · '+esc(r.entrepriseNom):''), a:r.auteur, j:r.date}; })
    .concat(ADH.filter(function(x){ return !x.importe; }).map(function(x){ return {d:x.creeLe||x.date, txt:'<span class="tag">Carte</span> '+esc(x.nature||"")+' · '+esc(x.entrepriseNom)+' · '+ent(num(x.montant))+' FCFA', a:x.auteur, j:x.date}; }))
    .concat(valides(PE).filter(function(x){ return !x.importe; }).map(function(x){ return {d:x.creeLe||x.date, txt:'<span class="tag">PE</span> '+esc(x.prestationLib||"")+' · '+esc(x.entrepriseNom)+' · '+ent(num(x.montant))+' FCFA', a:x.auteur, j:x.date}; }))
    .sort(function(a,b){ return a.d<b.d?1:-1; }).slice(0,10);
  h+='<section class="card"><h2>Dernières activités de l\'équipe</h2>';
  if(!fil.length) h+='<p class="empty">Rien pour l\'instant. Les activités apparaissent ici dès leur saisie.</p>';
  else h+='<div class="timeline">'+fil.map(function(f){ return '<div class="ev"><span class="small muted">'+fd(f.j)+'</span><span>'+f.txt+' <span class="small muted">· '+esc(APP().court(f.a))+'</span></span></div>'; }).join("")+'</div>';
  return h+'</section>';
}

/* ================= Écran : journal des activités ================= */
function nouvelleReal(){ var ax=axesSaisissables()[0].code; return {date:TODAY, axe:ax, type:typesOf(ax)[0].t, entTxt:"", participants:"", femmes:"", montant:"", mode:"Espèces", recu:"", institution:INSTITUTIONS[0], montantDemande:"", montantObtenu:"", obs:""}; }
function vForm(){
  var f=C.form, a=axe(f.axe), ty=typeOf(f.axe, f.type);
  var h='<section class="editor"><h3 class="full">'+(f.id?"Modifier l'activité":"Nouvelle activité réalisée")+'</h3>'+(f.tacheTitre?'<p class="small full">Pour la tâche : <b>'+esc(f.tacheTitre)+'</b></p>':'')+
    '<label class="f">Date<input type="date" id="cf_date" value="'+esc(f.date)+'" max="'+TODAY+'"></label>'+
    '<label class="f">Axe de la fiche de poste<select id="cf_axe">'+axesSaisissables().map(function(x){ return '<option value="'+x.code+'"'+(f.axe===x.code?" selected":"")+'>'+x.code+' · '+esc(x.lib)+'</option>'; }).join("")+'</select></label>'+
    '<label class="f full">Type d\'action<select id="cf_type">'+typesOf(f.axe).map(function(x){ return '<option'+(f.type===x.t?" selected":"")+'>'+esc(x.t)+'</option>'; }).join("")+'</select></label>';
  if(a.note) h+='<p class="small muted full">'+esc(a.note)+'</p>';
  /* Version 1.8.1 : une prestation payante (BP, agrément, FRA…) peut concerner une entreprise suivie, un adhérent de la base ou un autre client. */
  if(a.ent!=="non") h+='<label class="f full">'+(ty.m?'Client (entreprise suivie, adhérent ou autre client)':'Entreprise concernée')+(a.ent==="oui"?' (obligatoire)':' (facultatif)')+'<input type="text" id="cf_ent" list="'+(ty.m?'c_adhs':'c_ents')+'" value="'+esc(f.entTxt)+'" placeholder="'+(ty.m?'Choisissez dans la liste ou tapez le nom du client':'Tapez le nom ou le matricule, puis choisissez dans la liste')+'" autocomplete="off"></label>'+(ty.m?adhList():entList());
  if(ty.p) h+='<label class="f">Nombre de participants<input type="number" min="0" id="cf_part" value="'+esc(f.participants)+'"></label><label class="f">Dont femmes<input type="number" min="0" id="cf_fem" value="'+esc(f.femmes)+'"></label>';
  if(ty.m) h+='<label class="f">Montant encaissé (FCFA, 0 si gratuit)<input type="number" min="0" step="500" id="cf_mt" value="'+esc(f.montant)+'"></label>'+
    '<label class="f">Mode de paiement<select id="cf_mode">'+MODES.map(function(x){ return '<option'+(f.mode===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">N° de reçu<input type="text" id="cf_recu" value="'+esc(f.recu)+'"></label><div></div>';
  if(ty.f) h+='<label class="f">Institution<select id="cf_inst">'+INSTITUTIONS.map(function(x){ return '<option'+(f.institution===x?" selected":"")+'>'+esc(x)+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Montant demandé (FCFA)<input type="number" min="0" step="1000" id="cf_dem" value="'+esc(f.montantDemande)+'"></label>'+
    '<label class="f">Montant obtenu (FCFA, si accordé)<input type="number" min="0" step="1000" id="cf_obt" value="'+esc(f.montantObtenu)+'"></label><div></div>';
  h+='<label class="f full">Observation ou compte rendu<textarea id="cf_obs" placeholder="Ce qui a été fait, résultat, suite à donner…">'+esc(f.obs)+'</textarea></label>'+
    '<div class="full row between"><button class="btn ghost" data-act="c_fcancel">Annuler</button><button class="btn primary" data-act="c_fsave">'+(f.taskId?"Enregistrer et terminer la tâche":"Enregistrer l\'activité")+'</button></div></section>';
  return h;
}
function saveForm(){
  var f=C.form, a=axe(f.axe), ty=typeOf(f.axe, f.type), e=null;
  if(!f.date || f.date>TODAY){ toast("Indiquez une date qui n'est pas dans le futur."); return; }
  if(a.ent!=="non" && String(f.entTxt).trim()){ e=entFromText(f.entTxt); }
  var cli=(!e && ty.m) ? (baseFromText(f.entTxt) || (String(f.entTxt||"").trim()?{mat:"", nom:String(f.entTxt).trim()}:null)) : null;
  if(a.ent==="oui" && !e && !cli){ toast(ty.m?"Indiquez le client de la prestation.":"Choisissez l'entreprise dans la liste proposée (axe "+a.code+")."); return; }
  if(ty.p && num(f.femmes)>num(f.participants)){ toast("Le nombre de femmes dépasse le nombre de participants."); return; }
  if(ty.f && num(f.montantObtenu)>0 && num(f.montantDemande)>0 && num(f.montantObtenu)>num(f.montantDemande)){ toast("Le montant obtenu dépasse le montant demandé : vérifiez."); return; }
  var old=f.id ? REAL.filter(function(r){ return r.id===f.id; })[0] : null;
  var doc={date:f.date, axe:f.axe, type:f.type, entrepriseId:e?e.id:"", entrepriseNom:e?e.nom:cli?cli.nom:(a.ent==="option"?String(f.entTxt||"").trim():""), matricule:e?e.id:(cli&&cli.mat)||"",
    participants:ty.p?num(f.participants):null, femmes:ty.p?num(f.femmes):null,
    montant:ty.m?num(f.montant):null, modePaiement:ty.m?f.mode:"", recu:ty.m?String(f.recu||"").trim():"",
    institution:ty.f?f.institution:"", montantDemande:ty.f?num(f.montantDemande):null, montantObtenu:ty.f?num(f.montantObtenu):null,
    obs:String(f.obs||"").trim(), auteur:old?old.auteur:ME().email, creeLe:old?old.creeLe:new Date().toISOString(), creeMs:old?old.creeMs:Date.now(), majLe:new Date().toISOString(), majPar:ME().email};
  if(old){ doc.id=old.id; DB.save("realisations", old.id, doc); toast("Activité modifiée."); }
  else { var rid=DB.add("realisations", doc); APP().journal("realisation", e, a.code+" · "+f.type+(doc.montant?" · "+money(doc.montant):""));
    var tk=f.taskId ? APP().TACHES.filter(function(x){ return x.id===f.taskId; })[0] : null;
    if(tk){ APP().terminerTache(tk, rid); toast("Activité enregistrée et tâche terminée"+(tk.recurrence?" (la suivante est programmée).":".")); }
    else toast("Activité enregistrée."); }
  var retour=f.retour; C.form=null;
  if(retour==="taches"){ APP().go("taches"); return; }
  if(retour){ C.tab=retour; }
  APP().render();
}
function vJournal(){
  var h=rulesWarn();
  if(canSaisir()) h+='<div class="row between"><p class="small muted">Chaque action menée est rattachée à un axe de la fiche de poste : le tableau de bord se remplit tout seul.</p>'+(C.form?'':'<button class="btn primary" data-act="c_fnew">+ Nouvelle activité</button>')+'</div>';
  if(C.form) h+=vForm();
  var jf=C.jf, L=REAL.slice();
  if(jf.axe) L=L.filter(function(r){ return r.axe===jf.axe; });
  if(jf.qui) L=L.filter(function(r){ return r.auteur===jf.qui; });
  if(jf.q){ var q=cle(jf.q); L=L.filter(function(r){ return cle(r.type+" "+r.entrepriseNom+" "+r.obs).indexOf(q)>=0; }); }
  L.sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:((a.creeLe||"")<(b.creeLe||"")?1:-1); });
  var auteurs={}; REAL.forEach(function(r){ auteurs[r.auteur]=1; });
  h+='<div class="card"><div class="filters"><label class="f s">Rechercher<input type="search" id="c_jq" value="'+esc(jf.q)+'" placeholder="Type, entreprise, observation…"></label>'+
    '<label class="f">Axe<select id="c_jaxe"><option value="">Tous les axes</option>'+AXES.map(function(x){ return '<option value="'+x.code+'"'+(jf.axe===x.code?" selected":"")+'>'+x.code+' · '+esc(x.lib)+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Saisi par<select id="c_jqui"><option value="">Toute l\'équipe</option>'+Object.keys(auteurs).map(function(m){ return '<option value="'+esc(m)+'"'+(jf.qui===m?" selected":"")+'>'+esc(APP().court(m))+'</option>'; }).join("")+'</select></label></div>'+
    '<div class="row between"><span class="small muted">'+L.length+' activité(s)</span><button class="btn sm ghost" data-act="c_xlsj">Exporter en Excel</button></div></div>';
  if(!L.length) h+='<p class="empty">Aucune activité à afficher.</p>';
  L.slice(0,200).forEach(function(r){
    var det=[]; if(r.participants!=null) det.push(r.participants+" participant(s)"+(r.femmes?" dont "+r.femmes+" femme(s)":""));
    if(r.montant) det.push("encaissé "+money(r.montant)+(r.modePaiement?" ("+r.modePaiement+")":"")+(r.recu?" · reçu "+r.recu:""));
    if(r.institution) det.push(r.institution+(r.montantDemande?" · demandé "+money(r.montantDemande):"")+(r.montantObtenu?" · obtenu "+money(r.montantObtenu):""));
    var ed=canEditDoc(r);
    h+='<div class="task"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><b><span class="tag">'+esc(r.axe)+'</span> '+esc(r.type)+'</b><div class="small muted">'+fd(r.date)+
      (r.entrepriseId?' · <a href="#" data-act="fiche" data-id="'+esc(r.entrepriseId)+'">'+esc(r.entrepriseNom)+'</a>':(r.entrepriseNom?' · '+esc(r.entrepriseNom)+' (non inscrite)':''))+' · saisi par '+esc(APP().court(r.auteur))+'</div>'+
      (det.length?'<p class="small">'+esc(det.join(" · "))+'</p>':'')+(r.obs?'<p class="small">'+esc(r.obs)+'</p>':'')+'</div>'+
      (ed?'<div class="row"><button class="btn sm ghost" data-act="c_fedit" data-id="'+esc(r.id)+'">Modifier</button><button class="btn sm ghost danger" data-act="c_fdel" data-id="'+esc(r.id)+'">'+(C.delR===r.id?"Confirmer la suppression":"Supprimer")+'</button></div>':'')+'</div></div>'; });
  if(L.length>200) h+='<p class="small muted">Seules les 200 plus récentes sont affichées : utilisez les filtres ou l\'export Excel.</p>';
  return h;
}

/* ================= Écran : cartes d'adhésion ================= */
function nouvelleAdh(){ var c=plan(Number(TODAY.slice(0,4))).cartes[0]||{code:"",tarif:0}; return {date:TODAY, entTxt:"", nom:"", matricule:"", categorie:c.code, montant:c.tarif, nature:"Nouvelle adhésion", echeance:addDur(TODAY,12,"mois"), mode:"Espèces", recu:""}; }
function natureAuto(mat){ return mat && ADH.some(function(x){ return x.matricule===mat && x.statut!=="Annulée"; }) ? "Renouvellement" : "Nouvelle adhésion"; }
function vAdhForm(){
  var f=C.adh, cartes=plan(Number(String(f.date).slice(0,4))||Number(TODAY.slice(0,4))).cartes;
  return '<section class="editor"><h3 class="full">'+(f.id?"Modifier la vente":"Vente ou renouvellement d'une carte d'adhésion")+'</h3>'+
    '<label class="f full">Adhérent ou entreprise déjà connu<input type="text" id="ca_ent" list="c_adhs" value="'+esc(f.entTxt)+'" placeholder="Nom ou matricule, puis choisissez dans la liste" autocomplete="off"></label>'+adhList()+
    '<label class="f">Ou nom de l\'entreprise (non encore inscrite)<input type="text" id="ca_nom" value="'+esc(f.nom)+'"></label>'+
    '<label class="f">Matricule CCIAK<input type="text" id="ca_mat" value="'+esc(f.matricule)+'" placeholder="Ex. CO-…"></label>'+
    '<label class="f">Catégorie de carte<select id="ca_cat">'+cartes.map(function(c){ return '<option value="'+esc(c.code)+'"'+(f.categorie===c.code?" selected":"")+'>'+esc(c.lib)+' · '+ent(num(c.tarif))+' FCFA</option>'; }).join("")+'</select></label>'+
    '<label class="f">Montant encaissé (FCFA)<input type="number" min="0" step="500" id="ca_mt" value="'+esc(f.montant)+'"></label>'+
    '<label class="f">Nature<select id="ca_nat">'+["Nouvelle adhésion","Renouvellement"].map(function(x){ return '<option'+(f.nature===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Date d\'encaissement<input type="date" id="ca_date" value="'+esc(f.date)+'" max="'+TODAY+'"></label>'+
    '<label class="f">Valable jusqu\'au<input type="date" id="ca_ech" value="'+esc(f.echeance)+'"></label>'+
    '<label class="f">Mode de paiement<select id="ca_mode">'+MODES.map(function(x){ return '<option'+(f.mode===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">N° de reçu<input type="text" id="ca_recu" value="'+esc(f.recu)+'"></label>'+
    '<div class="full row between"><button class="btn ghost" data-act="c_acancel">Annuler</button><button class="btn primary" data-act="c_asave">Enregistrer la carte</button></div></section>';
}
function saveAdh(){
  var f=C.adh, e=String(f.entTxt||"").trim() ? entFromText(f.entTxt) : null, b=(!e && String(f.entTxt||"").trim()) ? baseFromText(f.entTxt) : null;
  var nom=e?e.nom:b?b.nom:String(f.nom||"").trim(), mat=e?e.id:b?b.mat:String(f.matricule||"").trim();
  if(!nom){ toast("Choisissez l'entreprise dans la liste ou saisissez son nom."); return; }
  if(num(f.montant)<=0){ toast("Indiquez le montant encaissé."); return; }
  if(!f.date || f.date>TODAY){ toast("La date d'encaissement ne peut pas être dans le futur."); return; }
  if(!f.echeance || f.echeance<=f.date){ toast("La date de validité doit être postérieure à la date d'encaissement."); return; }
  if(String(f.recu||"").trim() && ADH.some(function(x){ return x.id!==f.id && x.recu===String(f.recu).trim() && x.statut!=="Annulée"; })){ toast("Ce numéro de reçu est déjà enregistré : vérifiez."); return; }
  var old=f.id ? ADH.filter(function(x){ return x.id===f.id; })[0] : null;
  var c=plan(Number(f.date.slice(0,4))).cartes.filter(function(x){ return x.code===f.categorie; })[0];
  var doc={date:f.date, entrepriseId:e?e.id:"", entrepriseNom:nom, matricule:mat, categorie:f.categorie, categorieLib:c?c.lib:f.categorie, montant:num(f.montant),
    nature:f.nature, echeance:f.echeance, modePaiement:f.mode, recu:String(f.recu||"").trim(), statut:old?old.statut:"Valide",
    auteur:old?old.auteur:ME().email, creeLe:old?old.creeLe:new Date().toISOString(), creeMs:old?old.creeMs:Date.now(), majLe:new Date().toISOString(), majPar:ME().email};
  if(old){ doc.id=old.id; DB.save("adhesions", old.id, doc); toast("Vente modifiée."); }
  else { DB.add("adhesions", doc); APP().journal("adhesion", e, doc.nature+" · "+doc.categorieLib+" · "+money(doc.montant)); toast("Carte enregistrée."); }
  var ret=f.retour; C.adh=null; if(ret) C.tab=ret; APP().render();
}
function vCartes(){
  var h=rulesWarn(), y=C.per.annee, Pl=plan(y);
  var A=ADH.filter(function(x){ return String(x.date).slice(0,4)===String(y); }), V=A.filter(function(x){ return x.statut!=="Annulée"; });
  var tot=V.reduce(function(s,x){ return s+num(x.montant); },0), cib=cibleCartes(Pl);
  if(canSaisir()) h+='<div class="row between"><p class="small muted">Chaque carte vendue ou renouvelée alimente directement l\'objectif financier « cartes d\'adhésion ».</p>'+(C.adh?'':'<button class="btn primary" data-act="c_anew">+ Vendre une carte</button>')+'</div>';
  if(C.adh) h+=vAdhForm();
  h+='<section class="card"><div class="row between"><h2>Recettes des cartes · '+y+'</h2><div class="row"><select id="c_cyear" style="width:auto">'+yearOpts(y)+'</select></div></div>'+
    '<div class="grid g3">'+
    '<div class="card kpi"><span class="v num">'+ent(tot)+'</span><span class="l">FCFA encaissés sur '+ent(cib)+' visés ('+(pct(tot,cib)==null?"—":pct(tot,cib)+" %")+')</span>'+barre(pct(tot,cib))+'</div>'+
    '<div class="card kpi"><span class="v num">'+V.length+'</span><span class="l">cartes, dont '+V.filter(function(x){return x.nature!=="Renouvellement";}).length+' nouvelles adhésions</span></div>';
  var ech=ADH.filter(function(x){ return x.statut!=="Annulée" && x.echeance && x.echeance.slice(0,4)===String(y) && x.echeance<=TODAY; }).length,
      ren=V.filter(function(x){ return x.nature==="Renouvellement"; }).length;
  h+='<div class="card kpi"><span class="v num">'+(ech?Math.round(ren/ech*100)+" %":"—")+'</span><span class="l">taux de renouvellement (renouvellements ÷ cartes échues)</span></div></div>';
  h+='<div class="tablewrap"><table><thead><tr><th>Catégorie</th><th class="num">Tarif</th><th class="num">Vendues</th><th class="num">Cible</th><th class="num">Encaissé</th><th>Taux</th></tr></thead><tbody>';
  Pl.cartes.forEach(function(c){ var L=V.filter(function(x){ return x.categorie===c.code; }), m=L.reduce(function(s,x){ return s+num(x.montant); },0), t=pct(L.length,num(c.cible));
    h+='<tr><td>'+esc(c.lib)+'</td><td class="num">'+ent(num(c.tarif))+'</td><td class="num"><b>'+L.length+'</b></td><td class="num">'+ent(num(c.cible))+'</td><td class="num">'+ent(m)+'</td><td>'+barre(t)+'</td></tr>'; });
  h+='</tbody></table></div></section>';

  var rel=aRelancer();
  h+='<section class="card"><h2>À relancer ('+rel.length+')</h2><p class="small muted">Cartes échues depuis moins de 60 jours ou arrivant à échéance dans les 30 jours, sans renouvellement enregistré.</p>';
  if(!rel.length) h+='<p class="empty">Aucune relance à faire.</p>';
  else h+='<div class="tablewrap"><table><thead><tr><th>Échéance</th><th>Entreprise</th><th class="hide-sm">Catégorie</th><th class="hide-sm">Téléphone</th></tr></thead><tbody>'+rel.map(function(x){ var e=x.entrepriseId?APP().byId(x.entrepriseId):null;
    return '<tr><td class="'+(x.echeance<TODAY?"ko":"")+'"><b>'+fd(x.echeance)+'</b></td><td>'+esc(x.entrepriseNom)+' <span class="small muted">'+esc(x.matricule||"")+'</span></td><td class="hide-sm">'+esc(x.categorieLib||x.categorie)+'</td><td class="hide-sm">'+esc((e&&e.tel)||x.telephone||"—")+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='</section>';

  var nImp=A.filter(function(x){ return x.importe; }).length; A=A.filter(function(x){ return !x.importe; });
  h+='<section class="card"><div class="row between"><h2>Ventes enregistrées en '+y+' ('+A.length+')</h2><button class="btn sm ghost" data-act="c_xlsa">Exporter en Excel</button></div>';
  if(nImp) h+='<p class="small muted">S\'y ajoutent '+nImp+' adhésion(s) importées de la liste CCIAK, comptées dans les totaux ci-dessus et détaillées dans l\'onglet <a href="#" data-act="c_tab" data-v="base">Base des adhérents</a>.</p>';
  if(!A.length) h+='<p class="empty">Aucune carte enregistrée pour cette année.</p>';
  else { h+='<div class="tablewrap"><table><thead><tr><th>Date</th><th>Entreprise</th><th class="hide-sm">Catégorie</th><th class="num">Montant</th><th class="hide-sm">Reçu</th><th class="hide-sm">Valable jusqu\'au</th><th></th></tr></thead><tbody>';
    A.sort(function(a,b){ return a.date<b.date?1:-1; }).forEach(function(x){ var an=x.statut==="Annulée";
      h+='<tr style="'+(an?"opacity:.55;text-decoration:line-through":"")+'"><td>'+fd(x.date)+'</td><td>'+esc(x.entrepriseNom)+'<div class="small muted">'+esc(x.nature)+(x.matricule?' · '+esc(x.matricule):'')+' · '+esc(APP().court(x.auteur))+(an?' · annulée : '+esc(x.motifAnnulation||""):'')+'</div></td><td class="hide-sm">'+esc(x.categorieLib||x.categorie)+'</td><td class="num">'+ent(num(x.montant))+'</td><td class="hide-sm">'+esc(x.recu||"—")+'</td><td class="hide-sm">'+fd(x.echeance)+'</td><td>'+
        (!an && canEditDoc(x)?'<button class="btn sm ghost" data-act="c_aedit" data-id="'+esc(x.id)+'">Modifier</button>':'')+(!an && isMgr()?'<button class="btn sm ghost danger" data-act="c_aannul" data-id="'+esc(x.id)+'">Annuler</button>':'')+'</td></tr>';
      if(C.annuler===x.id) h+='<tr><td colspan="7"><div class="confirm"><label class="f">Motif de l\'annulation (obligatoire)<input type="text" id="c_motif" placeholder="Ex. : erreur de saisie, doublon, remboursement"></label><div class="row"><button class="btn sm ghost" data-act="c_aannulno">Retour</button><button class="btn sm danger" data-act="c_aannulok" data-id="'+esc(x.id)+'">Confirmer l\'annulation</button></div></div></td></tr>'; });
    h+='</tbody></table></div><p class="small muted">Une recette ne se supprime pas : le propriétaire ou le responsable portefeuille l\'annule avec un motif, et la ligne reste visible pour la traçabilité.</p>'; }
  return h+'</section>';
}

/* ================= Version 1.8 : recettes propres par mois et import du journal de caisse ================= */
function vPrestaTypes(K, P){
  var L=K.prestaParType||[]; if(!L.length && !isConsLike()) return "";
  var h='<section class="card"><div class="row between"><h2>Prestations de service du CADE · '+esc(P.label)+'</h2>'+(isConsLike()?'<button class="btn sm primary" data-act="c_qpresta" data-r="tableau">+ Saisir une prestation</button>':'')+'</div>';
  if(!L.length) h+='<p class="empty">Aucune prestation encaissée sur la période. Saisissez un business plan, un agrément local ou un dossier FRA avec son montant.</p>';
  else h+='<div class="tablewrap"><table><thead><tr><th>Prestation</th><th class="num">Nombre</th><th class="num">Montant encaissé (FCFA)</th><th class="num">Part</th></tr></thead><tbody>'+
    L.map(function(o){ return '<tr><td>'+esc(o.type)+'</td><td class="num">'+ent(o.n)+'</td><td class="num">'+ent(o.mt)+'</td><td class="num">'+(K.presta?Math.round(o.mt/K.presta*100):0)+' %</td></tr>'; }).join("")+
    '<tr><td><b>Total</b></td><td class="num"><b>'+ent(L.reduce(function(s,o){ return s+o.n; },0))+'</b></td><td class="num"><b>'+ent(K.presta)+'</b></td><td></td></tr></tbody></table></div>'+
    '<p class="small muted">Business plans, agréments (local, FRA), dossiers de crédit, formations payantes et conseil au forfait : saisies du journal des activités avec un montant, et lignes reprises du journal de caisse.</p>';
  return h+'</section>';
}
function recettesParMois(y){
  var mo=[], tot={adh:0, ren:0, pe:0, pr:0}, an=String(y);
  for(var m=1;m<=12;m++){ var k=an+"-"+String(m).padStart(2,"0"), inM=function(d){ return String(d||"").slice(0,7)===k; };
    var A=ADH.filter(function(x){ return x.statut!=="Annulée" && inM(x.date); });
    var r={m:m, adh:somme(A.filter(function(x){ return x.nature!=="Renouvellement"; })), ren:somme(A.filter(function(x){ return x.nature==="Renouvellement"; })),
      pe:somme(valides(PE).filter(function(x){ return inM(x.date); })),
      pr:REAL.filter(function(x){ return inM(x.date); }).reduce(function(s,x){ return s+num(x.montant); },0)+prestaImportees().filter(function(l){ return inM(l.date); }).reduce(function(s,l){ return s+num(l.montant); },0)};
    r.t=r.adh+r.ren+r.pe+r.pr; ["adh","ren","pe","pr"].forEach(function(c){ tot[c]+=r[c]; }); mo.push(r); }
  var T=tot.adh+tot.ren+tot.pe+tot.pr; if(!T) return "";
  var h='<section class="card"><div class="row between"><h2>Recettes propres '+an+' par mois</h2><span class="small muted">Adhésions de la liste CCIAK, caisse du CADE et saisies de l\'application</span></div><div class="tablewrap"><table><thead><tr><th>Mois</th><th class="num">Adhésions</th><th class="num">Renouvellements</th><th class="num">Plateforme électronique</th><th class="num">BP et prestations</th><th class="num">Total</th></tr></thead><tbody>';
  mo.forEach(function(r){ if(!r.t) return; h+='<tr><td>'+MOISN[r.m-1]+'</td><td class="num">'+ent(r.adh)+'</td><td class="num">'+ent(r.ren)+'</td><td class="num">'+ent(r.pe)+'</td><td class="num">'+ent(r.pr)+'</td><td class="num"><b>'+ent(r.t)+'</b></td></tr>'; });
  h+='<tr><td><b>Total</b></td><td class="num"><b>'+ent(tot.adh)+'</b></td><td class="num"><b>'+ent(tot.ren)+'</b></td><td class="num"><b>'+ent(tot.pe)+'</b></td><td class="num"><b>'+ent(tot.pr)+'</b></td><td class="num"><b>'+ent(T)+'</b></td></tr>';
  h+='<tr><td class="small muted">Part</td>'+["adh","ren","pe","pr"].map(function(c){ return '<td class="num small muted">'+Math.round(tot[c]/T*100)+' %</td>'; }).join("")+'<td></td></tr></tbody></table></div></section>';
  return h;
}
function lireJournal(buf, nomFichier){
  var wb=XLSX.read(buf, {type:"array", cellDates:true}), feuille=null, rows=null, hi=-1;
  wb.SheetNames.forEach(function(n){ if(feuille) return; var r=XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, raw:true, defval:""});
    for(var i=0;i<Math.min(r.length,10);i++){ var ks=r[i].map(function(c){ return cle(c); }); if(ks.indexOf("CATEGORIE")>=0 && ks.some(function(k){ return k.indexOf("MONTANT")===0; })){ feuille=n; rows=r; hi=i; break; } } });
  if(!feuille){ toast("Feuille « Journal » introuvable : utilisez le classeur Suivi_recettes_CADE organisé (colonnes Catégorie et Montant)."); return; }
  var H=rows[hi].map(function(c){ return cle(c); }), col=function(){ for(var a=0;a<arguments.length;a++){ var k=H.indexOf(arguments[a]); if(k>=0) return k; } for(var b=0;b<arguments.length;b++){ for(var z=0;z<H.length;z++) if(H[z].indexOf(arguments[b])===0) return z; } return -1; };
  var cD=col("DATE"), cM=col("N MOIS","NO MOIS"), cC=col("CLIENT"), cS=col("STATUT JURIDIQUE"), cK=col("CATEGORIE"), cP=col("PRESTATION"), cL=col("LIBELLE D ORIGINE","LIBELLE"), cT=col("MONTANT FCFA","MONTANT"), cO=col("COACH"), cX=col("MATRICULE CCIAK RETROUVE","MATRICULE");
  var L=[], ign={adh:0, aut:0}, corr=0, sansDate=0;
  rows.slice(hi+1).forEach(function(r, i){
    var k=cle(r[cK]), mt=num(r[cT]); if(!k || !mt) return;
    var cat=/^PLATEFORME|^PE$/.test(k)?"PE":/^PRESTATION|^BP|BUSINESS/.test(k)?"Prestations":/^RENOUVEL/.test(k)?"Renouvellement":/^ADHESION/.test(k)?"Adhésion":"";
    if(cat==="Adhésion"){ ign.adh++; return; } if(!cat){ ign.aut++; return; }
    var d=r[cD], ds=""; if(d instanceof Date) ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); else { var mm=String(d||"").match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/); if(mm) ds=mm[3]+"-"+mm[2].padStart(2,"0")+"-"+mm[1].padStart(2,"0"); }
    var nm=cM>=0?Number(r[cM]):0; if(!ds){ if(!nm){ sansDate++; return; } ds="2026-"+String(nm).padStart(2,"0")+"-28"; corr++; }
    if(nm && Number(ds.slice(5,7))!==nm){ var jj=Math.min(Number(ds.slice(8,10)),28); ds=ds.slice(0,4)+"-"+String(nm).padStart(2,"0")+"-"+String(jj).padStart(2,"0"); corr++; }
    var lib=String(cL>=0?r[cL]:"").trim(), q=lib.match(/(\d+)\s*[*x×]\s*(\d+)\s*$/i), mat=String(cX>=0?r[cX]:"").trim();
    L.push({n:i+1, date:ds, client:String(r[cC]||"").trim(), statut:String(cS>=0?r[cS]:"").trim(), cat:cat, pres:String(cP>=0?r[cP]:"").trim(), libelle:lib, montant:mt,
      quantite:q?Number(q[2]):1, coach:String(cO>=0?r[cO]:"").trim(), mat:/^[A-Z]{2}\d{10}$/.test(mat)?mat:""});
  });
  if(!L.length){ toast("Aucune recette PE, prestation ou renouvellement dans ce fichier."); return; }
  var mois={}, an={}; L.forEach(function(l){ var k=l.date.slice(0,7); an[l.date.slice(0,4)]=1; var m=mois[k]||(mois[k]={k:k, lab:MOISN[Number(k.slice(5,7))-1]+" "+k.slice(0,4), PE:0, Prestations:0, Renouvellement:0}); m[l.cat]+=l.montant; });
  var ans=Object.keys(an).sort();
  C.jimp={fichier:nomFichier, feuille:feuille, lignes:L, mois:Object.keys(mois).sort().map(function(k){ return mois[k]; }), ign:ign, corr:corr, sansDate:sansDate, annees:ans,
    renDeja:L.filter(function(l){ return l.cat==="Renouvellement" && l.mat; }).length, remplace:journalImporte().filter(function(l){ return ans.indexOf(String(l.date).slice(0,4))>=0; }).length};
  APP().render(); window.scrollTo(0,0);
}
function vJournalImport(){
  var I=C.jimp, t=function(c){ return I.lignes.filter(function(l){ return l.cat===c; }); }, sm=function(L){ return L.reduce(function(s,l){ return s+l.montant; },0); };
  var h='<section class="editor"><h3 class="full">Aperçu de l\'import du journal des recettes · '+esc(I.fichier)+' (feuille « '+esc(I.feuille)+' »)</h3>';
  h+='<div class="full tablewrap"><table><thead><tr><th>Mois</th><th class="num">Plateforme électronique</th><th class="num">BP et prestations</th><th class="num">Renouvellements</th></tr></thead><tbody>'+
    I.mois.map(function(m){ return '<tr><td>'+esc(m.lab)+'</td><td class="num">'+ent(m.PE)+'</td><td class="num">'+ent(m.Prestations)+'</td><td class="num">'+ent(m.Renouvellement)+'</td></tr>'; }).join("")+
    '<tr><td><b>Total</b></td><td class="num"><b>'+ent(sm(t("PE")))+'</b></td><td class="num"><b>'+ent(sm(t("Prestations")))+'</b></td><td class="num"><b>'+ent(sm(t("Renouvellement")))+'</b></td></tr></tbody></table></div>';
  h+='<ul class="full small"><li>'+t("PE").length+' recette(s) PE, rangées dans le catalogue de la Plateforme électronique.</li><li>'+t("Prestations").length+' prestation(s) (business plans, agrément local), comptées dans « Recettes des prestations du CADE ».</li>'+
    '<li>'+t("Renouvellement").length+' renouvellement(s)'+(I.renDeja?', dont '+I.renDeja+' déjà présent(s) dans la liste des adhérents : non comptés deux fois':'')+'.</li>'+
    (I.ign.adh?'<li>'+I.ign.adh+' adhésion(s) non importée(s) : elles viennent déjà de la liste des adhérents CCIAK.</li>':'')+
    (I.corr?'<li>'+I.corr+' date(s) ramenée(s) dans le mois de la feuille d\'origine.</li>':'')+(I.sansDate?'<li class="ko">'+I.sansDate+' ligne(s) sans date ignorée(s).</li>':'')+
    (I.remplace?'<li><b>Cet import remplace</b> les '+I.remplace+' ligne(s) déjà importées pour '+I.annees.join(", ")+'.</li>':'')+'</ul>';
  h+='<div class="full row between"><button class="btn ghost" data-act="c_jimpno">Annuler</button><button class="btn primary" data-act="c_jimpok">Importer ces '+I.lignes.length+' recettes</button></div></section>';
  return h;
}
function importerJournal(){
  var I=C.jimp, lots={}, at=new Date().toISOString();
  I.lignes.forEach(function(l){ var k="lot_"+l.date.slice(0,4)+"_"+l.date.slice(5,7); (lots[k]=lots[k]||[]).push(l); });
  RIMP.forEach(function(L){ if(I.annees.indexOf(String(L.annee))>=0 && !lots[L.id] && (L.lignes||[]).length) lots[L.id]=[]; });
  Object.keys(lots).forEach(function(k){ var pr=k.split("_"); DB.save("recettes_import", k, {annee:Number(pr[1]), mois:Number(pr[2]), lignes:lots[k], fichier:I.fichier, importLe:at, importPar:ME().email}); });
  var tot=I.lignes.reduce(function(s,l){ return s+l.montant; },0);
  APP().journal("recette_pe", null, "Import du journal des recettes ("+I.fichier+") : "+I.lignes.length+" recette(s), "+money(tot));
  toast(I.lignes.length+" recette(s) importée(s)."); C.jimp=null; APP().render();
}
function vJournalBloc(){
  if(!isMgr()) return "";
  var J=journalImporte(), sm=function(c){ return J.filter(function(l){ return l.cat===c; }).reduce(function(s,l){ return s+num(l.montant); },0); };
  var h='<section class="card"><div class="row between"><h2>Journal des recettes de la caisse (import)</h2><label class="btn file-btn">Importer le journal des recettes<input type="file" id="c_jfile" accept=".xls,.xlsx"></label></div>'+
    '<p class="small muted">Pour reprendre les recettes déjà notées dans le fichier Excel de suivi : Plateforme électronique, business plans et prestations, renouvellements. Utilisez le classeur organisé (feuille « Journal »). Un nouvel import de la même année remplace le précédent.</p>';
  if(C.jimp) h+=vJournalImport();
  if(J.length) h+='<p class="small">Déjà importé : '+J.length+' recette(s) · PE '+ent(sm("PE"))+' FCFA · prestations '+ent(sm("Prestations"))+' FCFA · renouvellements '+ent(sm("Renouvellement"))+' FCFA.</p>';
  return h+'</section>';
}

/* ================= Écran : base des adhérents · version 1.7 ================= */
function coachEmail(nom){ var k=cle(nom); if(!k) return ""; var m=APP().MEMBRES.filter(function(x){ return x.actif && cle(x.nom)===k; })[0]; return m?m.email:""; }
function baseFiltres(){ return C.bf || (C.bf={q:"", commune:"", forme:"", mois:"", statut:"", paie:""}); }
function statutBase(r){ var e=suiviDe(r.mat); if(!e) return {k:"non", lab:"Non suivie"}; if(e.horsSuivi) return {k:"retiree", lab:"Retirée du suivi"}; return {k:"suivie", lab:"Suivie"+(e.cohorte?" · cohorte "+e.cohorte:"")}; }
function baseFiltrees(){
  var y=C.baseAn||Number(TODAY.slice(0,4)), F=baseFiltres(), q=cle(F.q);
  return baseRows(y).filter(function(r){
    if(q && cle([r.nom,r.org,r.prom,r.mat,r.tel,r.commune,r.activite,r.coach].join(" ")).indexOf(q)<0) return false;
    if(F.commune && cle(r.commune)!==F.commune) return false;
    if(F.forme && catDeForme(r.forme)!==F.forme) return false;
    if(F.mois && Number(String(r.date).slice(5,7))!==Number(F.mois)) return false;
    if(F.statut && statutBase(r).k!==F.statut) return false;
    if(F.paie==="grat" && !r.gratuite) return false; if(F.paie==="pay" && r.gratuite) return false;
    return true; }).sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:(a.nom<b.nom?-1:1); });
}
function vBaseImport(){
  var I=C.bimp, h='<section class="editor"><h3 class="full">Aperçu de l\'import · '+esc(I.fichier)+'</h3>';
  h+='<p class="full">'+I.lignes.length+' adhérent(s) lus, pour un montant de <b>'+ent(I.total)+' FCFA</b>. '+(I.remplace?'<b>Cet import remplace</b> les '+I.remplace+' ligne(s) déjà importées pour '+I.annees.join(", ")+'.':'')+'</p>';
  h+='<div class="full tablewrap"><table><thead><tr><th>Mois</th><th class="num">Adhérents</th><th class="num">EI / SUARL</th><th class="num">GIE / coop.</th><th class="num">SARL / SA</th><th class="num">Montant (FCFA)</th></tr></thead><tbody>'+
    I.mois.map(function(m){ return '<tr><td>'+esc(m.lab)+'</td><td class="num">'+m.n+'</td><td class="num">'+m.EI+'</td><td class="num">'+m.GIE+'</td><td class="num">'+m.SOC+'</td><td class="num">'+ent(m.mt)+'</td></tr>'; }).join("")+'</tbody></table></div>';
  if(I.gratuites) h+='<p class="full small"><b>'+I.gratuites+' adhésion(s) gratuite(s)</b> (coachs du programme partenaire, voir le plan annuel) : comptées comme adhérents, à 0 FCFA.</p>';
  if(I.sansForme) h+='<p class="full small"><b class="ko">'+I.sansForme+' ligne(s) sans forme juridique</b> : comptées comme entreprise individuelle (3 000 FCFA). Ajoutez une colonne « Forme juridique » au fichier pour les préciser.</p>';
  if(I.erreurs.length) h+='<details class="full"><summary class="small">'+I.erreurs.length+' remarque(s) sur le fichier</summary><ul class="small">'+I.erreurs.slice(0,40).map(function(e){ return '<li>Ligne '+esc(e.ligne)+' · '+esc(e.nom||"")+' : '+esc(e.probleme)+'</li>'; }).join("")+'</ul></details>';
  h+='<div class="full row between"><button class="btn ghost" data-act="c_bimpno">Annuler</button><button class="btn primary" data-act="c_bimpok">Importer ces '+I.lignes.length+' adhérents</button></div></section>';
  return h;
}
function lireBase(buf, nomFichier){
  var res=YKX.lire(buf); if(res.erreur){ toast(res.erreur); return; }
  var erreurs=(res.erreurs||[]).slice(), vu={}, L=[];
  res.lignes.forEach(function(x){
    if(!x.dateIns){ erreurs.push({ligne:"—", nom:x.nom, probleme:"date d'inscription absente ou illisible : ligne non importée"}); return; }
    if(vu[x.id]){ erreurs.push({ligne:"—", nom:x.nom, probleme:"matricule présent deux fois : seule la première ligne est gardée"}); return; } vu[x.id]=1;
    var fo=normForme((x.comp||{}).forme||""), an=Number(x.dateIns.slice(0,4)), cat=catDeForme(fo);
    L.push({mat:x.id, date:x.dateIns, prenom:x.prenom, nomP:x.nomP, prom:x.prom, tel:x.tel, adresse:x.adresse, commune:x.commune, activite:x.activite, nom:x.nom, org:x.org, coach:x.coach, forme:fo, montant:0, _cat:cat}); var dl=L[L.length-1]; dl.montant=montantLigne(dl); dl._grat=!!gratuiteDe(dl.coach, an);
  });
  if(!L.length){ toast("Aucune ligne exploitable dans ce fichier."); return; }
  var mois={}, annees={};
  L.forEach(function(l){ var k=l.date.slice(0,7); annees[l.date.slice(0,4)]=1; var m=mois[k]||(mois[k]={k:k, lab:MOISN[Number(k.slice(5,7))-1]+" "+k.slice(0,4), n:0, EI:0, GIE:0, SOC:0, mt:0}); m.n++; m[l._cat]++; m.mt+=l.montant; });
  var ann=Object.keys(annees).sort(), remplace=lignesImportees().filter(function(l){ return ann.indexOf(String(l.date).slice(0,4))>=0; }).length;
  C.bimp={fichier:nomFichier, lignes:L, total:L.reduce(function(s,l){ return s+l.montant; },0), mois:Object.keys(mois).sort().map(function(k){ return mois[k]; }),
    sansForme:L.filter(function(l){ return !l.forme; }).length, gratuites:L.filter(function(l){ return l._grat; }).length, erreurs:erreurs, annees:ann, remplace:remplace};
  C.tab="base"; APP().render(); window.scrollTo(0,0);
}
function importerBase(){
  var I=C.bimp, lots={}, at=new Date().toISOString();
  I.lignes.forEach(function(l){ var k="lot_"+l.date.slice(0,4)+"_"+l.date.slice(5,7); var c=JSON.parse(JSON.stringify(l)); delete c._cat; delete c._grat; (lots[k]=lots[k]||[]).push(c); });
  LOTS.forEach(function(L){ if(I.annees.indexOf(String(L.annee))>=0 && !lots[L.id] && (L.lignes||[]).length) lots[L.id]=[]; });
  Object.keys(lots).forEach(function(k){ var pr=k.split("_");
    DB.save("adherents", k, {annee:Number(pr[1]), mois:Number(pr[2]), lignes:lots[k], fichier:I.fichier, importLe:at, importPar:ME().email}); });
  APP().journal("adhesion", null, "Import de la liste des adhérents ("+I.fichier+") : "+I.lignes.length+" adhérent(s), "+money(I.total));
  toast(I.lignes.length+" adhérent(s) importé(s)."); C.bimp=null; APP().render();
}
function inscrire(mats, force){
  var y=String(C.bcoh||Number(TODAY.slice(0,4))), Pl=plan(Number(y)), deja=suiviesCohorte(y), rows=baseRows("tous"), faits=0, ignores=0;
  var aFaire=mats.filter(function(m){ var e=suiviDe(m); if(e && !e.horsSuivi){ ignores++; return false; } return true; });
  if(!aFaire.length){ toast(ignores?"Ces entreprises sont déjà suivies.":"Aucune entreprise sélectionnée."); return; }
  if(!force && deja+aFaire.length>Pl.places){ C.depasse={mats:aFaire, y:y, n:deja+aFaire.length, places:Pl.places, gratuites:JSON.parse(JSON.stringify(Pl.gratuites))}; APP().render(); return; }
  aFaire.forEach(function(m){
    var r=rows.filter(function(x){ return x.mat===m; })[0]; if(!r) return; var e=suiviDe(m);
    if(e){ e.horsSuivi=null; e.cohorte=y; e.suiviDepuis=TODAY; APP().saveEnt(e); }
    else { e=APP().nouvelleEnt({id:m, nom:r.nom, org:r.org, prenom:r.prenom, nomP:r.nomP, prom:r.prom||(r.prenom+" "+r.nomP).trim(), tel:r.tel, adresse:r.adresse, commune:r.commune,
      activite:r.activite, coach:r.coach, dateIns:r.date, forme:r.forme, conseiller:coachEmail(r.coach)||APP().OWNER, cohorte:y, suiviDepuis:TODAY, source:"Base des adhérents"});
      APP().saveEnt(e); }
    APP().journal("inscription_programme", e, "Inscription au programme Yokkute · cohorte "+y); faits++; });
  C.bsel={}; C.depasse=null;
  toast(faits+" entreprise(s) inscrite(s) dans la cohorte "+y+(ignores?" ("+ignores+" déjà suivie(s))":"")+"."); APP().render();
}
function vBase(){
  var y=C.baseAn||Number(TODAY.slice(0,4)), Pl=plan(y), F=baseFiltres(), all=baseRows(y), L=baseFiltrees(), mgr=isMgr(), sel=C.bsel||(C.bsel={});
  var tot=all.reduce(function(s,r){ return s+r.montant; },0), nGrat=all.filter(function(r){ return r.gratuite; }).length, cib=cibleCartes(Pl), nbCib=Pl.cartes.reduce(function(a,c){ return a+num(c.cible); },0);
  var coh=String(C.bcoh||Number(TODAY.slice(0,4))), nCoh=suiviesCohorte(coh), places=plan(Number(coh)).places;
  var h='<p class="small muted">Tous les adhérents de la CCIAK, pour le suivi financier des adhésions. Les entreprises accompagnées par le programme Yokkute y sont choisies chaque année et inscrites dans le module Entreprises.</p>';
  if(mgr) h+='<div class="row between"><span class="small muted">Liste mensuelle des adhérents (export CCIAK ou classeur vérifié avec la colonne « Forme juridique »). Un nouvel import remplace celui de la même année.</span><label class="btn file-btn">Importer une liste d\'adhérents<input type="file" id="c_bfile" accept=".xls,.xlsx"></label></div>';
  if(C.bimp) h+=vBaseImport();
  h+='<section class="card"><div class="row between"><h2>Adhérents '+y+'</h2><select id="c_byear" style="width:auto">'+yearOpts(y)+'</select></div><div class="grid g3">'+
    '<div class="card kpi"><span class="v num">'+all.length+'</span><span class="l">adhérents sur '+ent(nbCib)+' cartes visées ('+(pct(all.length,nbCib)==null?"—":pct(all.length,nbCib)+" %")+')'+(nGrat?' · dont '+nGrat+' gratuite(s), '+esc((Pl.gratuites||{}).programme||"programme partenaire"):'')+'</span>'+barre(pct(all.length,nbCib))+'</div>'+
    '<div class="card kpi"><span class="v num">'+ent(tot)+'</span><span class="l">FCFA de cartes sur '+ent(cib)+' visés ('+(pct(tot,cib)==null?"—":pct(tot,cib)+" %")+')</span>'+barre(pct(tot,cib))+'</div>'+
    '<div class="card kpi"><span class="v num">'+nCoh+' / '+places+'</span><span class="l">entreprises suivies dans la cohorte '+esc(coh)+(nCoh>places?' · <b class="ko">places dépassées</b>':'')+'</span>'+barre(pct(nCoh,places))+'</div></div></section>';
  if(C.depasse){ var D=C.depasse; h+='<div class="confirm"><p><b>Places dépassées.</b> La cohorte '+esc(D.y)+' compterait '+D.n+' entreprises pour '+D.places+' places prévues au plan. Confirmez si les ressources du programme le permettent, ou augmentez les places dans le plan annuel.</p><div class="row"><button class="btn sm ghost" data-act="c_bdepno">Retour</button><button class="btn sm primary" data-act="c_bdepok">Inscrire quand même</button></div></div>'; }
  var communes={}; all.forEach(function(r){ if(r.commune) communes[cle(r.commune)]=r.commune; });
  h+='<section class="card"><div class="filters" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><label class="f s" style="grid-column:1/-1">Rechercher<input type="search" id="c_bq" value="'+esc(F.q)+'" placeholder="Nom, promoteur, matricule, téléphone, coach"></label>'+
    '<label class="f">Commune<select id="c_bcom"><option value="">Toutes</option>'+Object.keys(communes).sort().map(function(k){ return '<option value="'+esc(k)+'"'+(F.commune===k?" selected":"")+'>'+esc(communes[k])+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Forme<select id="c_bfor"><option value="">Toutes</option>'+[["EI","EI / SUARL"],["GIE","GIE / Coopérative"],["SOC","SARL / SA"]].map(function(o){ return '<option value="'+o[0]+'"'+(F.forme===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Mois<select id="c_bmois"><option value="">Tous</option>'+MOISN.map(function(m,i){ return '<option value="'+(i+1)+'"'+(Number(F.mois)===i+1?" selected":"")+'>'+m+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Paiement<select id="c_bpaie"><option value="">Toutes</option>'+[["pay","Payantes"],["grat","Gratuites (programme)"]].map(function(o){ return '<option value="'+o[0]+'"'+(F.paie===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Suivi<select id="c_bst"><option value="">Tous</option>'+[["suivie","Suivies"],["non","Non suivies"],["retiree","Retirées du suivi"]].map(function(o){ return '<option value="'+o[0]+'"'+(F.statut===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></label></div>';
  var nSel=Object.keys(sel).filter(function(k){ return sel[k]; }).length;
  h+='<div class="row between"><span class="small muted">'+L.length+' adhérent(s) affiché(s) · '+ent(L.reduce(function(s,r){ return s+r.montant; },0))+' FCFA</span><div class="row">'+
    (mgr?'<label class="small">Cohorte <select id="c_bcoh" style="width:auto">'+annees().concat([Number(TODAY.slice(0,4))+1]).filter(function(v,i,a){ return a.indexOf(v)===i; }).map(function(a){ return '<option'+(String(a)===coh?" selected":"")+'>'+a+'</option>'; }).join("")+'</select></label><button class="btn sm primary" data-act="c_binsel"'+(nSel?'':' disabled')+'>Inscrire la sélection ('+nSel+')</button>':'')+
    '<button class="btn sm ghost" data-act="c_bxls">Exporter en Excel</button></div></div>';
  if(!all.length) h+='<p class="empty">Aucun adhérent pour '+y+'.'+(mgr?' Importez la liste des adhérents avec le bouton ci-dessus.':'')+'</p>';
  else if(!L.length) h+='<p class="empty">Aucun adhérent ne correspond à ces filtres.</p>';
  else { var N=C.bn||100;
    h+='<div class="tablewrap"><table><thead><tr>'+(mgr?'<th style="width:28px"></th>':'')+'<th>Adhérent</th><th class="hide-sm">Commune</th><th class="hide-sm">Forme</th><th>Adhésion</th><th class="num">Montant</th><th>Suivi</th></tr></thead><tbody>';
    L.slice(0,N).forEach(function(r){ var st=statutBase(r), ok=st.k!=="suivie";
      h+='<tr>'+(mgr?'<td>'+(ok && r.mat?'<input type="checkbox" data-bsel="'+esc(r.mat)+'"'+(sel[r.mat]?" checked":"")+' aria-label="Sélectionner">':'')+'</td>':'')+
        '<td><b>'+esc(r.nom)+'</b><div class="small muted">'+esc([r.prom, r.mat, r.tel, r.coach?("coach : "+r.coach):""].filter(Boolean).join(" · "))+'</div></td>'+
        '<td class="hide-sm">'+esc(r.commune||"—")+'</td><td class="hide-sm">'+esc(r.forme||"EI (par défaut)")+'</td><td>'+fd(r.date)+'</td><td class="num">'+(r.gratuite?'<span class="small" title="'+esc(r.gratuite)+'">Gratuite</span>':ent(r.montant))+'</td>'+
        '<td>'+(st.k==="suivie"?'<a href="#" data-act="fiche" data-id="'+esc(r.mat)+'"><span class="tag">'+esc(st.lab)+'</span></a>':st.k==="retiree"?'<span class="small muted">'+esc(st.lab)+'</span> ':'')+
        (mgr && ok && r.mat?'<button class="btn sm ghost" data-act="c_bins" data-id="'+esc(r.mat)+'">'+(st.k==="retiree"?"Réintégrer":"Inscrire au programme")+'</button>':(st.k==="non"?'<span class="small muted">Non suivie</span>':''))+'</td></tr>'; });
    h+='</tbody></table></div>';
    if(L.length>N) h+='<div class="row"><button class="btn sm ghost" data-act="c_bmore">Afficher 100 adhérents de plus ('+(L.length-N)+' restants)</button></div>';
  }
  return h+'</section>';
}
function xlsBase(){
  exporter("Base_adherents_"+(C.baseAn||TODAY.slice(0,4))+".xlsx", baseFiltrees().map(function(r){ return {"Matricule":r.mat, "Date d'adhésion":r.date, "Adhérent":r.nom, "Organisation":r.org, "Promoteur":r.prom, "Téléphone":r.tel,
    "Commune":r.commune, "Activité":r.activite, "Coach":r.coach, "Forme juridique":r.forme||"EI (par défaut)", "Montant (FCFA)":r.montant, "Adhésion gratuite (programme)":r.gratuite||"", "Source":r.source, "Suivi":statutBase(r).lab}; }));
}

/* ================= Écran : plan annuel et référentiel ================= */
function vPlan(){
  var y=C.planAnnee, Pl=plan(y), ed=isMgr(), E=C.planEdit && C.planEdit.annee===y ? C.planEdit : null, src=E||Pl;
  var h=rulesWarn()+'<section class="card"><div class="row between"><div><h2>Plan annuel '+y+'</h2><p class="small muted">'+(Pl.existe?"Enregistré le "+fd(Pl.majLe)+" par "+esc(APP().court(Pl.majPar)):"Pas encore enregistré : les valeurs ci-dessous sont des exemples.")+'</p></div>'+
    '<div class="row"><select id="c_plyear" style="width:auto">'+yearOpts(y)+'</select>'+
    (ed && !E?'<button class="btn primary" data-act="c_pledit">Modifier les cibles</button>':'')+'</div></div>';
  var dis=E?"":" disabled";
  h+='<h3>Cibles opérationnelles par axe</h3><div class="tablewrap"><table><thead><tr><th>Axe</th><th>Indicateur</th><th class="num">Cible annuelle</th><th class="num hide-sm">Par mois</th></tr></thead><tbody>';
  INDIC.forEach(function(i){ var v=src.cibles[i.id];
    h+='<tr><td><span class="tag">'+i.axe+'</span></td><td>'+esc(i.lib)+'</td><td class="num" style="width:150px"><input type="number" min="0" data-cpi="'+i.id+'" value="'+esc(v)+'"'+dis+' style="text-align:right"></td><td class="num hide-sm">'+nf(Math.round(num(v)/12*10)/10)+'</td></tr>'; });
  h+='</tbody></table></div>';
  h+='<h3>Cartes d\'adhésion : tarifs et cibles</h3><div class="tablewrap"><table><thead><tr><th>Catégorie</th><th class="num">Tarif (FCFA)</th><th class="num">Cartes visées</th><th class="num">Montant visé</th>'+(E?'<th></th>':'')+'</tr></thead><tbody>';
  src.cartes.forEach(function(c,k){
    h+='<tr><td><input type="text" data-cpc="'+k+'" data-f="lib" value="'+esc(c.lib)+'"'+dis+'></td><td class="num" style="width:140px"><input type="number" min="0" step="500" data-cpc="'+k+'" data-f="tarif" value="'+esc(c.tarif)+'"'+dis+' style="text-align:right"></td>'+
      '<td class="num" style="width:120px"><input type="number" min="0" data-cpc="'+k+'" data-f="cible" value="'+esc(c.cible)+'"'+dis+' style="text-align:right"></td><td class="num">'+ent(num(c.tarif)*num(c.cible))+'</td>'+
      (E?'<td>'+(src.cartes.length>1?'<button class="btn sm ghost danger" data-act="c_pcdel" data-i="'+k+'">Retirer</button>':'')+'</td>':'')+'</tr>'; });
  h+='<tr><td colspan="2"><b>Total cartes d\'adhésion</b></td><td class="num"><b>'+ent(src.cartes.reduce(function(a,c){ return a+num(c.cible); },0))+' cartes</b></td><td class="num"><b>'+ent(cibleCartes(src))+'</b></td>'+(E?'<td><button class="btn sm ghost" data-act="c_pcadd">+ Catégorie</button></td>':'')+'</tr></tbody></table></div>';
  h+='<h3>Plateforme électronique (PE) : prestations numériques, tarifs et cibles</h3><div class="tablewrap"><table><thead><tr><th>Prestation</th><th class="num">Tarif moyen (FCFA)</th><th class="num">Commandes visées</th><th class="num">Montant visé</th>'+(E?'<th></th>':'')+'</tr></thead><tbody>';
  (src.pe||[]).forEach(function(c,k){
    h+='<tr><td><input type="text" data-cpe="'+k+'" data-f="lib" value="'+esc(c.lib)+'"'+dis+'></td><td class="num" style="width:140px"><input type="number" min="0" step="500" data-cpe="'+k+'" data-f="tarif" value="'+esc(c.tarif)+'"'+dis+' style="text-align:right"></td>'+
      '<td class="num" style="width:120px"><input type="number" min="0" data-cpe="'+k+'" data-f="cible" value="'+esc(c.cible)+'"'+dis+' style="text-align:right"></td><td class="num">'+ent(num(c.tarif)*num(c.cible))+'</td>'+
      (E?'<td>'+(src.pe.length>1?'<button class="btn sm ghost danger" data-act="c_ppdel" data-i="'+k+'">Retirer</button>':'')+'</td>':'')+'</tr>'; });
  h+='<tr><td colspan="3"><b>Total Plateforme électronique</b></td><td class="num"><b>'+ent(ciblePE(src))+'</b></td>'+(E?'<td><button class="btn sm ghost" data-act="c_ppadd">+ Prestation</button></td>':'')+'</tr></tbody></table></div>';
  h+='<h3>Autres objectifs financiers</h3><div class="grid g2">'+
    '<label class="f">Recettes des prestations du CADE (FCFA)<input type="number" min="0" step="10000" id="c_ppres" value="'+esc(src.prestations)+'"'+dis+'></label>'+
    '<label class="f">Financements à obtenir pour les entreprises (FCFA)<input type="number" min="0" step="100000" id="c_pfin" value="'+esc(src.financements)+'"'+dis+'></label>'+
    '<label class="f">Entreprises à suivre dans le programme (places de la cohorte)<input type="number" min="0" step="1" id="c_pplaces" value="'+esc(src.places)+'"'+dis+'></label>'+
    '<label class="f">Programme partenaire dont les adhésions sont gratuites<input type="text" id="c_pgprog" value="'+esc((src.gratuites||{}).programme||"")+'"'+dis+'></label>'+
    '<label class="f">Coachs de ce programme (un par ligne, comme dans la liste CCIAK)<textarea id="c_pgcoach" rows="3"'+dis+'>'+esc(((src.gratuites||{}).coachs||[]).join("\n"))+'</textarea></label></div>'+
    '<p class="small">Recettes propres visées (cartes + PE + prestations) : <b>'+ent(cibleCartes(src)+ciblePE(src)+num(src.prestations))+' FCFA</b>.</p>';
  if(E) h+='<div class="row between"><button class="btn ghost" data-act="c_plcancel">Annuler</button><button class="btn primary" data-act="c_plsave">Enregistrer le plan '+y+'</button></div>';
  h+='<p class="small muted">Les cibles de la période (mois, trimestre, semestre) sont calculées au prorata de la cible annuelle.</p></section>';

  h+='<section class="card"><h2>Référentiel des axes et types d\'actions</h2><p class="small muted">Chaque activité saisie choisit un axe et un type d\'action. '+(ed?"Vous pouvez ajouter des types d'actions propres au CADE.":"Seuls le propriétaire et le responsable portefeuille peuvent compléter cette liste.")+'</p>';
  var aj=(refDoc().types)||{};
  AXES.forEach(function(a){
    h+='<div class="lib-row"><div class="row between"><b><span class="tag">'+a.code+'</span> '+esc(a.lib)+'</b><span class="small muted">Entreprise : '+({oui:"obligatoire",option:"facultative",non:"sans objet"})[a.ent]+'</span></div><div class="small">'+
      typesOf(a.code).map(function(t){ var perso=(aj[a.code]||[]).some(function(z){ return z.t===t.t; });
        return '<span class="tag" style="margin:2px 4px 2px 0;display:inline-block">'+esc(t.t)+(t.m?" · recette":"")+(t.p?" · participants":"")+(t.f?" · financement":"")+(perso && ed?' <a href="#" data-act="c_tdel" data-axe="'+a.code+'" data-t="'+esc(t.t)+'" title="Retirer" style="color:var(--bad)">×</a>':'')+'</span>'; }).join("")+'</div>';
    if(ed && C.ntype && C.ntype.axe===a.code) h+='<div class="grid g4" style="align-items:end"><label class="f">Nouveau type d\'action<input type="text" id="c_nt" value="'+esc(C.ntype.t)+'"></label>'+
      '<label class="small"><input type="checkbox" id="c_ntm"'+(C.ntype.m?" checked":"")+'> Peut générer une recette</label><label class="small"><input type="checkbox" id="c_ntp"'+(C.ntype.p?" checked":"")+'> Compte des participants</label>'+
      '<div class="row"><button class="btn sm ghost" data-act="c_ntcancel">Annuler</button><button class="btn sm primary" data-act="c_ntsave">Ajouter</button></div></div>';
    else if(ed) h+='<div><button class="btn sm ghost" data-act="c_ntnew" data-axe="'+a.code+'">+ Type d\'action</button></div>';
    h+='</div>'; });
  return h+'</section>';
}
function savePlan(){
  var E=C.planEdit, bad=E.cartes.filter(function(c){ return !String(c.lib).trim() || num(c.tarif)<=0; });
  if(bad.length){ toast("Chaque catégorie de carte doit avoir un nom et un tarif."); return; }
  if(E.pe.some(function(c){ return !String(c.lib).trim() || num(c.tarif)<=0; })){ toast("Chaque prestation PE doit avoir un nom et un tarif."); return; }
  E.pe.forEach(function(c,i){ if(!c.code) c.code="P"+Date.now().toString(36)+i; });
  var codes={}; E.cartes.forEach(function(c,i){ if(!c.code){ c.code="C"+Date.now().toString(36)+i; } codes[c.code]=1; });
  var doc={annee:E.annee, cibles:{}, cartes:E.cartes.map(function(c){ return {code:c.code, lib:String(c.lib).trim(), tarif:num(c.tarif), cible:num(c.cible)}; }),
    pe:E.pe.map(function(c){ return {code:c.code, lib:String(c.lib).trim(), tarif:num(c.tarif), cible:num(c.cible)}; }),
    prestations:num(E.prestations), financements:num(E.financements), places:Math.max(0,Math.round(num(E.places))), gratuites:{programme:String((E.gratuites||{}).programme||"").trim(), coachs:((E.gratuites||{}).coachs||[]).map(function(c){ return String(c).trim(); }).filter(Boolean)}, majLe:TODAY, majPar:ME().email};
  INDIC.forEach(function(i){ doc.cibles[i.id]=num(E.cibles[i.id]); });
  DB.save("cade_param", "annee_"+E.annee, doc); APP().journal("realisation", null, "Plan annuel "+E.annee+" enregistré");
  C.planEdit=null; toast("Plan "+doc.annee+" enregistré."); APP().render();
}

/* ================= Exports Excel ================= */
function exporter(nom, lignes){
  if(!window.XLSX){ toast("Export indisponible sur cet appareil."); return; }
  var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), "Données"); XLSX.writeFile(wb, nom);
}
function xlsJournal(){
  exporter("Activites_CADE_"+TODAY+".xlsx", REAL.slice().sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(r){ return {"Date":r.date, "Axe":r.axe, "Axe (libellé)":(axe(r.axe)||{}).lib||"", "Type d'action":r.type,
    "Matricule":r.entrepriseId||"", "Entreprise":r.entrepriseNom||"", "Participants":r.participants, "Dont femmes":r.femmes, "Montant encaissé":r.montant, "Mode de paiement":r.modePaiement||"", "Reçu":r.recu||"",
    "Institution":r.institution||"", "Montant demandé":r.montantDemande, "Montant obtenu":r.montantObtenu, "Observation":r.obs||"", "Saisi par":r.auteur, "Saisi le":String(r.creeLe||"").slice(0,10)}; }));
}
function xlsAdh(){
  exporter("Cartes_adhesion_"+TODAY+".xlsx", ADH.slice().sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(x){ return {"Date":x.date, "Matricule":x.matricule||"", "Entreprise":x.entrepriseNom, "Catégorie":x.categorieLib||x.categorie,
    "Nature":x.nature, "Source":x.importe?"Liste CCIAK importée":"Vente enregistrée", "Montant":x.montant, "Adhésion gratuite (programme)":x.gratuite||"", "Mode de paiement":x.modePaiement||"", "Reçu":x.recu||"", "Valable jusqu'au":x.echeance, "Statut":x.statut, "Motif d'annulation":x.motifAnnulation||"", "Saisi par":x.auteur}; }));
}

function xlsPE(){
  exporter("Recettes_PE_"+TODAY+".xlsx", PE.slice().sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(x){ return {"Date":x.date, "Client":x.entrepriseNom, "Matricule":x.entrepriseId||"", "Téléphone":x.telephone||"",
    "Prestation":x.prestationLib||x.prestation, "Quantité":x.quantite, "Montant":x.montant, "Mode de paiement":x.modePaiement||"", "Reçu":x.recu||"", "Description":x.description||"", "Commande":x.statutCommande||"",
    "Livrée le":x.livreLe||"", "Statut":x.statut, "Motif d'annulation":x.motifAnnulation||"", "Saisi par":x.auteur}; }));
}

/* ================= Écran : Recettes de la Plateforme électronique (PE) · version 1.6 ================= */
function peCatalogue(annee){ return plan(annee).pe.concat([PE_AUTRE]); }
function nouvellePE(){ var c=plan(Number(TODAY.slice(0,4))).pe[0]||PE_AUTRE; return {date:TODAY, entTxt:"", nom:"", tel:"", prestation:c.code, quantite:1, montant:c.tarif, mode:"Espèces", recu:"", description:"", statutCommande:"Livrée"}; }
function vPEForm(){
  var f=C.pe, cat=peCatalogue(Number(String(f.date).slice(0,4))||Number(TODAY.slice(0,4)));
  return '<section class="editor"><h3 class="full">'+(f.id?"Modifier la recette PE":"Nouvelle recette de la Plateforme électronique")+'</h3>'+
    '<label class="f full">Client inscrit dans la base<input type="text" id="pe_ent" list="c_ents" value="'+esc(f.entTxt)+'" placeholder="Nom ou matricule, puis choisissez dans la liste (facultatif)" autocomplete="off"></label>'+entList()+
    '<label class="f">Ou nom du client (non inscrit)<input type="text" id="pe_nom" value="'+esc(f.nom)+'"></label>'+
    '<label class="f">Téléphone du client<input type="tel" id="pe_tel" value="'+esc(f.tel)+'"></label>'+
    '<label class="f">Prestation<select id="pe_pres">'+cat.map(function(c){ return '<option value="'+esc(c.code)+'"'+(f.prestation===c.code?" selected":"")+'>'+esc(c.lib)+(num(c.tarif)?' · '+ent(num(c.tarif))+' FCFA':'')+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">Quantité (nombre de commandes ou de lots)<input type="number" min="1" step="1" id="pe_qte" value="'+esc(f.quantite)+'"></label>'+
    '<label class="f">Montant encaissé (FCFA)<input type="number" min="0" step="500" id="pe_mt" value="'+esc(f.montant)+'"></label>'+
    '<label class="f">Date d\'encaissement<input type="date" id="pe_date" value="'+esc(f.date)+'" max="'+TODAY+'"></label>'+
    '<label class="f">Mode de paiement<select id="pe_mode">'+MODES.map(function(x){ return '<option'+(f.mode===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select></label>'+
    '<label class="f">N° de reçu<input type="text" id="pe_recu" value="'+esc(f.recu)+'"></label>'+
    '<label class="f">État de la commande<select id="pe_stc">'+["Livrée","En cours"].map(function(x){ return '<option'+(f.statutCommande===x?" selected":"")+'>'+x+'</option>'; }).join("")+'</select></label>'+
    '<label class="f full">Description du travail<input type="text" id="pe_desc" value="'+esc(f.description)+'" placeholder="Ex. : 500 étiquettes pour jus de bissap, format 6 × 4 cm"></label>'+
    '<div class="full row between"><button class="btn ghost" data-act="c_pecancel">Annuler</button><button class="btn primary" data-act="c_pesave">Enregistrer la recette</button></div></section>';
}
function savePE(){
  var f=C.pe, e=String(f.entTxt||"").trim() ? entFromText(f.entTxt) : null;
  var nom=e?e.nom:String(f.nom||"").trim();
  if(!nom){ toast("Choisissez le client dans la liste ou saisissez son nom."); return; }
  if(num(f.montant)<=0){ toast("Indiquez le montant encaissé."); return; }
  if(num(f.quantite)<1){ toast("La quantité doit être d'au moins 1."); return; }
  if(!f.date || f.date>TODAY){ toast("La date d'encaissement ne peut pas être dans le futur."); return; }
  if(f.prestation==="AUTRE" && !String(f.description||"").trim()){ toast("Décrivez la prestation réalisée."); return; }
  if(String(f.recu||"").trim() && PE.concat(ADH).some(function(x){ return x.id!==f.id && x.recu===String(f.recu).trim() && x.statut!=="Annulée"; })){ toast("Ce numéro de reçu est déjà enregistré : vérifiez."); return; }
  var old=f.id ? PE.filter(function(x){ return x.id===f.id; })[0] : null;
  var c=peCatalogue(Number(f.date.slice(0,4))).filter(function(x){ return x.code===f.prestation; })[0];
  var liv=f.statutCommande==="Livrée" ? ((old && old.livreLe) || TODAY) : "";
  var doc={date:f.date, entrepriseId:e?e.id:"", entrepriseNom:nom, telephone:String(f.tel||"").trim()||(e&&e.tel)||"", prestation:f.prestation, prestationLib:c?c.lib:f.prestation,
    quantite:Math.round(num(f.quantite))||1, montant:num(f.montant), modePaiement:f.mode, recu:String(f.recu||"").trim(), description:String(f.description||"").trim(),
    statutCommande:f.statutCommande, livreLe:liv, statut:old?old.statut:"Valide",
    auteur:old?old.auteur:ME().email, creeLe:old?old.creeLe:new Date().toISOString(), creeMs:old?old.creeMs:Date.now(), majLe:new Date().toISOString(), majPar:ME().email};
  if(old){ doc.id=old.id; DB.save("recettes_pe", old.id, doc); toast("Recette PE modifiée."); }
  else { DB.add("recettes_pe", doc); APP().journal("recette_pe", e, doc.prestationLib+" · "+nom+" · "+money(doc.montant)); toast("Recette PE enregistrée."); }
  var ret=f.retour; C.pe=null; if(ret) C.tab=ret; APP().render();
}
function vPE(){
  var h=rulesWarn(), y=C.per.annee, Pl=plan(y), part=1;
  var A=PE.filter(function(x){ return String(x.date).slice(0,4)===String(y); }), V=valides(A), tot=somme(V), cib=ciblePE(Pl);
  var propres=somme(valides(ADH).filter(function(x){ return String(x.date).slice(0,4)===String(y); }))+tot+REAL.filter(function(r){ return String(r.date).slice(0,4)===String(y); }).reduce(function(s,r){ return s+num(r.montant); },0);
  var cibP=cibleCartes(Pl)+cib+Pl.prestations;
  if(canSaisirPE()) h+='<div class="row between"><p class="small muted">Chaque prestation numérique encaissée (étiquettes, logos, factures, supports de communication…) alimente l\'objectif « Plateforme électronique » et le total des recettes propres du CADE.</p>'+(C.pe?'':'<button class="btn primary" data-act="c_penew">+ Enregistrer une recette PE</button>')+'</div>';
  if(C.pe) h+=vPEForm();
  var enc=A.filter(function(x){ return x.statut!=="Annulée" && x.statutCommande==="En cours"; });
  h+='<section class="card"><div class="row between"><h2>Recettes de la Plateforme électronique · '+y+'</h2><div class="row"><select id="c_peyear" style="width:auto">'+yearOpts(y)+'</select></div></div>'+
    '<div class="grid g3">'+
    '<div class="card kpi"><span class="v num">'+ent(tot)+'</span><span class="l">FCFA encaissés sur '+ent(cib)+' visés ('+(pct(tot,cib)==null?"—":pct(tot,cib)+" %")+')</span>'+barre(pct(tot,cib))+'</div>'+
    kpiC(V.reduce(function(s,x){ return s+(num(x.quantite)||1); },0), V.length+" recette(s) · "+enc.length+" commande(s) en cours de réalisation")+
    kpiC(propres?Math.round(tot/propres*100)+" %":"—", "part de la PE dans les recettes propres du CADE ("+ent(propres)+" FCFA sur "+ent(cibP)+" visés)")+'</div>';
  h+='<div class="tablewrap"><table><thead><tr><th>Prestation</th><th class="num">Tarif moyen</th><th class="num">Commandes</th><th class="num">Cible</th><th class="num">Encaissé</th><th class="num hide-sm">Montant visé</th><th>Taux</th></tr></thead><tbody>';
  peCatalogue(y).forEach(function(c){ var L=V.filter(function(x){ return x.prestation===c.code; }), q=L.reduce(function(s,x){ return s+(num(x.quantite)||1); },0), m=somme(L), mv=num(c.tarif)*num(c.cible);
    if(c.code==="AUTRE" && !L.length) return;
    h+='<tr><td>'+esc(c.lib)+'</td><td class="num">'+(num(c.tarif)?ent(num(c.tarif)):"—")+'</td><td class="num"><b>'+q+'</b></td><td class="num">'+(num(c.cible)?ent(num(c.cible)):"—")+'</td><td class="num">'+ent(m)+'</td><td class="num hide-sm">'+(mv?ent(mv):"—")+'</td><td>'+(mv?barre(pct(m,mv)):'')+'</td></tr>'; });
  h+='<tr><td colspan="4"><b>Total</b></td><td class="num"><b>'+ent(tot)+'</b></td><td class="num hide-sm"><b>'+ent(cib)+'</b></td><td>'+barre(pct(tot,cib))+'</td></tr></tbody></table></div>';
  var parMois=[]; for(var m=1;m<=12;m++){ var mm=y+"-"+String(m).padStart(2,"0"); parMois.push(somme(V.filter(function(x){ return String(x.date).slice(0,7)===mm; }))); }
  var mx=Math.max.apply(null, parMois.concat([cib/12,1]));
  h+='<h3>Encaissements par mois</h3><div class="tablewrap"><table><tbody>'+parMois.map(function(v,i){ if(String(y)+"-"+String(i+1).padStart(2,"0")>TODAY.slice(0,7) && !v) return "";
    return '<tr><td style="width:110px">'+MOISN[i]+'</td><td><div class="bar"><span style="width:'+Math.round(v/mx*100)+'%;background:'+couleur(pct(v,cib/12))+'"></span></div></td><td class="num" style="width:110px"><b>'+ent(v)+'</b></td></tr>'; }).join("")+'</tbody></table></div>'+
    '<p class="small muted">Couleur de la barre : comparée à la cible mensuelle moyenne ('+ent(cib/12)+' FCFA).</p></section>';

  h+='<section class="card"><div class="row between"><h2>Commandes en cours ('+enc.length+')</h2></div>';
  if(!enc.length) h+='<p class="empty">Aucune commande en attente de livraison.</p>';
  else h+=enc.sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(x){ var j=days(x.date,TODAY);
    return '<div class="alert" style="cursor:default"><b class="'+(j>7?"ko":"")+'" style="min-width:92px">'+fd(x.date)+'</b><div style="flex:1;min-width:0"><b>'+esc(x.prestationLib)+'</b> · '+esc(x.entrepriseNom)+(x.telephone?' · '+esc(x.telephone):'')+'<div class="small muted">'+esc(x.description||"")+' · '+j+' jour(s) · '+esc(APP().court(x.auteur))+'</div></div>'+
      (canSaisirPE()?'<button class="btn sm primary" data-act="c_peliv" data-id="'+esc(x.id)+'">Marquer livrée</button>':'')+'</div>'; }).join("");
  h+='</section>';

  h+='<section class="card"><div class="row between"><h2>Recettes PE enregistrées en '+y+' ('+A.length+')</h2><button class="btn sm ghost" data-act="c_xlspe">Exporter en Excel</button></div>';
  if(!A.length) h+='<p class="empty">Aucune recette PE enregistrée pour cette année.</p>';
  else { h+='<div class="tablewrap"><table><thead><tr><th>Date</th><th>Client</th><th class="hide-sm">Prestation</th><th class="num">Qté</th><th class="num">Montant</th><th class="hide-sm">Reçu</th><th></th></tr></thead><tbody>';
    A.sort(function(a,b){ return a.date<b.date?1:-1; }).forEach(function(x){ var an=x.statut==="Annulée";
      h+='<tr style="'+(an?"opacity:.55;text-decoration:line-through":"")+'"><td>'+fd(x.date)+'</td><td>'+esc(x.entrepriseNom)+'<div class="small muted">'+esc(x.statutCommande||"")+(x.description?' · '+esc(x.description):'')+' · '+esc(APP().court(x.auteur))+(an?' · annulée : '+esc(x.motifAnnulation||""):'')+'</div></td><td class="hide-sm">'+esc(x.prestationLib||x.prestation)+'</td><td class="num">'+(num(x.quantite)||1)+'</td><td class="num">'+ent(num(x.montant))+'</td><td class="hide-sm">'+esc(x.recu||"—")+'</td><td>'+
        (!an && !x.importe && canEditPE(x)?'<button class="btn sm ghost" data-act="c_peedit" data-id="'+esc(x.id)+'">Modifier</button>':'')+(!an && !x.importe && isMgr()?'<button class="btn sm ghost danger" data-act="c_peannul" data-id="'+esc(x.id)+'">Annuler</button>':'')+'</td></tr>';
      if(C.annuler===x.id) h+='<tr><td colspan="7"><div class="confirm"><label class="f">Motif de l\'annulation (obligatoire)<input type="text" id="c_motif" placeholder="Ex. : erreur de saisie, doublon, remboursement"></label><div class="row"><button class="btn sm ghost" data-act="c_aannulno">Retour</button><button class="btn sm danger" data-act="c_peannulok" data-id="'+esc(x.id)+'">Confirmer l\'annulation</button></div></div></td></tr>'; });
    h+='</tbody></table></div><p class="small muted">Une recette ne se supprime pas : le propriétaire ou le responsable portefeuille l\'annule avec un motif. L\'auteur peut la corriger pendant 7 jours.</p>'; }
  return h+'</section>';
}

/* ================= Phase 2 : dernier contact avec une entreprise ================= */
function contacts(){
  var M={};
  function up(id, d){ d=String(d||"").slice(0,10); if(id && d && (!M[id] || d>M[id])) M[id]=d; }
  APP().ENT.forEach(function(e){ (e.visites||[]).forEach(function(v){ up(e.id, v.date); }); (e.diags||[]).forEach(function(d){ up(e.id, d.date); }); up(e.id, e.pdiValide); });
  REAL.forEach(function(r){ up(r.entrepriseId, r.date); });
  return M;
}
function etape(e){ return !e.notes ? "À diagnostiquer" : !e.pdiValide ? "PDI à valider" : "En suivi"; }
function sansContact(e, M){ var d=M[e.id]; return d ? days(d, TODAY) : null; }
function days(a,b){ return Math.round((Date.parse(b)-Date.parse(a))/864e5); }
function lundi(){ var d=new Date(TODAY+"T00:00:00Z"), w=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-w); return d.toISOString().slice(0,10); }
function tacheLigne(t){
  var late=APP().enRetard(t), act=t.axe && t.type!=="Diagnostic" && t.type!=="Visite de suivi";
  return '<div class="alert" style="cursor:default"><b class="'+(late?"ko":"")+'" style="min-width:92px">'+fd(t.echeance)+'</b><div style="flex:1;min-width:0">'+(t.axe?'<span class="tag">'+esc(t.axe)+'</span> ':'')+esc(t.titre)+
    (t.priorite==="Haute"?' <span class="tag ess">haute</span>':'')+(t.entrepriseNom?'<div class="small muted">'+esc(t.entrepriseNom)+'</div>':'')+'</div>'+
    (act?'<button class="btn sm primary" data-act="c_fromtask" data-id="'+esc(t.id)+'">Terminer</button>':'<button class="btn sm ghost" data-act="go" data-v="taches">Ouvrir</button>')+'</div>';
}

/* ================= Écran : Mon espace (conseiller, responsable portefeuille, propriétaire) ================= */
function vMoi(){
  var me=ME().email, T=APP().TACHES.filter(function(t){ return t.assigneA===me && t.statut!=="Fait" && t.statut!=="Annulée"; });
  var fin7=addDur(TODAY,7,"jours"), retard=T.filter(function(t){ return APP().enRetard(t); }), auj=T.filter(function(t){ return t.echeance===TODAY; }),
      sem=T.filter(function(t){ return t.echeance>TODAY && t.echeance<=fin7; });
  function tri(L){ return L.sort(function(a,b){ return (a.echeance||"")<(b.echeance||"")?-1:1; }); }
  var h='<div class="row between"><p class="small muted">Votre journée : ce qui est en retard, ce qui est prévu, et vos entreprises à recontacter.</p><div class="row">'+
    '<button class="btn primary" data-act="c_qreal" data-r="moi">+ Saisir une activité</button><button class="btn" data-act="c_qcarte" data-r="moi">+ Vendre une carte</button><button class="btn" data-act="c_qpe" data-r="moi">+ Recette PE</button></div></div>';
  h+='<div class="grid g3">'+kpiC(retard.length,"tâche(s) en retard",retard.length?"var(--bad)":null)+kpiC(auj.length,"tâche(s) pour aujourd'hui")+kpiC(sem.length,"tâche(s) dans les 7 prochains jours")+'</div>';
  h+='<section class="card"><div class="row between"><h2>Mes tâches</h2><button class="btn sm ghost" data-act="go" data-v="taches">Toutes mes tâches ›</button></div>';
  if(!T.length) h+='<p class="empty">Aucune tâche ouverte. Vous pouvez en créer une dans « Tâches ».</p>';
  if(retard.length) h+='<h3 class="ko">En retard</h3>'+tri(retard).map(tacheLigne).join("");
  if(auj.length) h+='<h3>Aujourd\'hui</h3>'+auj.map(tacheLigne).join("");
  if(sem.length) h+='<h3>Cette semaine</h3>'+tri(sem).map(tacheLigne).join("");
  var plus=T.length-retard.length-auj.length-sem.length; if(plus>0) h+='<p class="small muted">… et '+plus+' tâche(s) à plus de 7 jours.</p>';
  h+='</section>';

  var M=contacts(), E=APP().ENT.filter(function(e){ return e.conseiller===me; }).map(function(e){ return {e:e, j:sansContact(e,M)}; })
    .sort(function(a,b){ return (b.j==null?1e6:b.j)-(a.j==null?1e6:a.j); });
  var froid=E.filter(function(x){ return x.j==null || x.j>60; }).length;
  h+='<section class="card"><div class="row between"><h2>Mes entreprises ('+E.length+')</h2>'+(froid?'<span class="small ko"><b>'+froid+'</b> sans contact depuis plus de 60 jours</span>':'')+'</div>';
  if(!E.length) h+='<p class="empty">Aucune entreprise ne vous est encore attribuée.</p>';
  else { h+='<div class="tablewrap"><table><thead><tr><th>Entreprise</th><th>Étape</th><th>Dernier contact</th><th class="num">Jours</th></tr></thead><tbody>'+
    E.slice(0,15).map(function(x){ var late=x.j==null||x.j>60; return '<tr class="click" data-act="fiche" data-id="'+esc(x.e.id)+'"><td><b>'+esc(x.e.nom)+'</b> <span class="small muted">'+esc(x.e.id)+'</span></td><td>'+etape(x.e)+'</td><td>'+(M[x.e.id]?fd(M[x.e.id]):"Jamais")+'</td><td class="num '+(late?"ko":"")+'"><b>'+(x.j==null?"—":x.j)+'</b></td></tr>'; }).join("")+'</tbody></table></div>';
    if(E.length>15) h+='<p class="small muted">Les 15 entreprises sans contact depuis le plus longtemps sont affichées.</p>'; }
  h+='</section>';

  var y=TODAY.slice(0,7), R=REAL.filter(function(r){ return r.auteur===me && String(r.date).slice(0,7)===y; }), parAxe={};
  R.forEach(function(r){ parAxe[r.axe]=(parAxe[r.axe]||0)+1; });
  var enc=R.reduce(function(s2,r){ return s2+num(r.montant); },0)+somme(valides(ADH.concat(PE)).filter(function(x){ return x.auteur===me && String(x.date).slice(0,7)===y; }));
  var tot=REAL.filter(function(r){ return String(r.date).slice(0,7)===y; }).length;
  h+='<section class="card"><h2>Mes résultats · '+MOISN[Number(y.slice(5))-1]+' '+y.slice(0,4)+'</h2><p class="small">'+R.length+' activité(s) saisie(s)'+(tot?' ('+Math.round(R.length/tot*100)+' % de l\'équipe)':'')+' · <b>'+ent(enc)+' FCFA</b> encaissés (prestations, cartes et PE).</p>';
  if(R.length) h+='<div class="row">'+AXES.filter(function(a){ return parAxe[a.code]; }).map(function(a){ return '<span class="tag" title="'+esc(a.lib)+'">'+a.code+' · '+parAxe[a.code]+'</span>'; }).join("")+'</div>';
  return h+'</section>';
}
function kpiC(v,l,col){ return '<div class="card kpi"><span class="v num"'+(col?' style="color:'+col+'"':'')+'>'+v+'</span><span class="l">'+l+'</span></div>'; }

/* ================= Écran : Pilotage de l'équipe (responsable portefeuille, propriétaire, lecteur) ================= */
function vEquipe(){
  var K=calc(C.per), P=K.P, inP=function(d){ d=String(d||"").slice(0,10); return d && d>=P.debut && d<=P.fin; }, T=APP().TACHES, M=contacts(), E=APP().ENT;
  var h=perSelect()+barreExport("Télécharger le rapport de la période");
  var gens=APP().conseillers().concat(APP().MEMBRES.filter(function(m){ return m.actif && (m.role==="accueil" || m.role==="pe"); }));
  h+='<section class="card"><h2>Charge et résultats de l\'équipe · '+esc(P.label)+'</h2><div class="tablewrap"><table><thead><tr><th>Membre</th><th class="num">Tâches ouvertes</th><th class="num">En retard</th><th class="num">Terminées</th><th class="num">Activités saisies</th><th class="num hide-sm">Encaissé (FCFA)</th><th class="num hide-sm">Entreprises</th><th class="num hide-sm">Sans contact &gt; 60 j</th></tr></thead><tbody>';
  gens.forEach(function(g){ var em=g.email, to=T.filter(function(t){ return t.assigneA===em && t.statut!=="Fait" && t.statut!=="Annulée"; }), lr=to.filter(APP().enRetard).length,
      tf=T.filter(function(t){ return t.assigneA===em && t.statut==="Fait" && inP(t.dateFait); }).length, ra=K.R.filter(function(r){ return r.auteur===em; }),
      enc=ra.reduce(function(s2,r){ return s2+num(r.montant); },0)+somme(valides(ADH.concat(PE)).filter(function(x){ return x.auteur===em && inP(x.date); })),
      es=E.filter(function(e){ return e.conseiller===em; }), froid=es.filter(function(e){ var j=sansContact(e,M); return e.pdiValide && (j==null || j>60); }).length;
    h+='<tr><td><b>'+esc(APP().court(em))+'</b><div class="small muted">'+esc(g.role==="accueil"?"Accueil / caisse":g.role==="pe"?"Agent Plateforme électronique":g.role==="chef"?"Responsable portefeuille":em===APP().OWNER?"Propriétaire":"Conseiller")+'</div></td><td class="num">'+to.length+'</td><td class="num '+(lr?"ko":"")+'"><b>'+lr+'</b></td><td class="num">'+tf+'</td><td class="num"><b>'+ra.length+'</b></td><td class="num hide-sm">'+ent(enc)+'</td><td class="num hide-sm">'+es.length+'</td><td class="num hide-sm '+(froid?"ko":"")+'">'+froid+'</td></tr>'; });
  h+='</tbody></table></div><p class="small muted">« Sans contact » : entreprises en suivi (PDI validé) sans visite, diagnostic ni activité enregistrés depuis plus de 60 jours.</p></section>';

  var late=T.filter(APP().enRetard).sort(function(a,b){ return a.echeance<b.echeance?-1:1; });
  var froids=E.filter(function(e){ var j=sansContact(e,M); return e.pdiValide && (j==null || j>60); }).sort(function(a,b){ return (M[a.id]||"")<(M[b.id]||"")?-1:1; });
  var rel=aRelancer(), y=Number(TODAY.slice(0,4));
  h+='<section class="card"><h2>Alertes</h2>';
  var al=[];
  if(!plan(y).existe) al.push('<div class="alert" data-act="c_tab" data-v="plan"><span class="feu Orange"><i></i></span><div style="flex:1"><b>Le plan '+y+' n\'est pas enregistré</b><div class="small muted">Les cibles affichées sont des exemples.</div></div><span class="small muted">Ouvrir ›</span></div>');
  if(!plan(y+1).existe && TODAY.slice(5)>="10-01") al.push('<div class="alert" data-act="c_tab" data-v="plan"><span class="feu Orange"><i></i></span><div style="flex:1"><b>Préparer le plan '+(y+1)+'</b><div class="small muted">À enregistrer avant le 1er janvier.</div></div><span class="small muted">Ouvrir ›</span></div>');
  var peEnc=valides(PE).filter(function(x){ return x.statutCommande==="En cours" && days(x.date,TODAY)>7; });
  if(peEnc.length) al.push('<div class="alert" data-act="c_tab" data-v="pe"><span class="feu Orange"><i></i></span><div style="flex:1"><b>'+peEnc.length+' commande(s) PE en cours depuis plus de 7 jours</b><div class="small muted">Payées mais pas encore livrées au client.</div></div><span class="small muted">Ouvrir ›</span></div>');
  if(rel.length) al.push('<div class="alert" data-act="c_tab" data-v="cartes"><span class="feu Orange"><i></i></span><div style="flex:1"><b>'+rel.length+' carte(s) d\'adhésion à relancer</b><div class="small muted">Échues récemment ou à échéance dans les 30 jours.</div></div><span class="small muted">Ouvrir ›</span></div>');
  late.slice(0,8).forEach(function(t){ al.push('<div class="alert" data-act="go" data-v="taches"><span class="feu Rouge"><i></i></span><div style="flex:1;min-width:0"><b>'+esc(t.titre)+'</b><div class="small muted">'+esc(APP().court(t.assigneA))+' · échéance '+fd(t.echeance)+' · '+days(t.echeance,TODAY)+' j de retard</div></div><span class="small muted">Tâches ›</span></div>'); });
  froids.slice(0,8).forEach(function(e){ al.push('<div class="alert" data-act="fiche" data-id="'+esc(e.id)+'"><span class="feu Rouge"><i></i></span><div style="flex:1;min-width:0"><b>'+esc(e.nom)+'</b><div class="small muted">'+esc(APP().court(e.conseiller))+' · dernier contact '+(M[e.id]?fd(M[e.id]):"jamais")+'</div></div><span class="small muted">Fiche ›</span></div>'); });
  if(!al.length) h+='<p class="empty">Aucune alerte : l\'équipe est à jour.</p>'; else h+=al.join("");
  if(late.length>8) h+='<p class="small muted">… et '+(late.length-8)+' autre(s) tâche(s) en retard.</p>';
  if(froids.length>8) h+='<p class="small muted">… et '+(froids.length-8)+' autre(s) entreprise(s) sans contact.</p>';
  return h+'</section>';
}

/* ================= Écran : Accueil / caisse ================= */
function vCaisse(){
  var c=C.caisse, me=ME().email, voirTous=c.tous && (isMgr() || role()==="lecteur");
  var R=REAL.filter(function(r){ return r.date===c.date && num(r.montant)>0 && (voirTous || r.auteur===me); }).map(function(r){ return {h:r.creeLe, nat:r.type, ent:r.entrepriseNom, mode:r.modePaiement, recu:r.recu, mt:num(r.montant), a:r.auteur}; });
  var A=ADH.filter(function(x){ return !x.importe && x.date===c.date && x.statut!=="Annulée" && (voirTous || x.auteur===me); }).map(function(x){ return {h:x.creeLe, nat:"Carte · "+(x.nature||""), ent:x.entrepriseNom, mode:x.modePaiement, recu:x.recu, mt:num(x.montant), a:x.auteur}; });
  var Q=valides(PE).filter(function(x){ return !x.importe && x.date===c.date && (voirTous || x.auteur===me); }).map(function(x){ return {h:x.creeLe, nat:"PE · "+(x.prestationLib||""), ent:x.entrepriseNom, mode:x.modePaiement, recu:x.recu, mt:num(x.montant), a:x.auteur}; });
  var L=R.concat(A, Q).sort(function(a,b){ return (a.h||"")<(b.h||"")?-1:1; }), tot=L.reduce(function(s2,x){ return s2+x.mt; },0), parMode={};
  L.forEach(function(x){ var m=x.mode||"Non précisé"; parMode[m]=(parMode[m]||0)+x.mt; });
  var vis=REAL.filter(function(r){ return r.date===c.date && r.axe==="A1" && (voirTous || r.auteur===me); }).length;
  var bq=[];
  if(canSaisir()) bq.push('<button class="btn primary" style="padding:18px" data-act="c_qvisit">+ Enregistrer un visiteur</button>','<button class="btn primary" style="padding:18px" data-act="c_qcarte" data-r="caisse">+ Vendre ou renouveler une carte</button>');
  bq.push('<button class="btn primary" style="padding:18px" data-act="c_qpe" data-r="caisse">+ Recette Plateforme électronique (PE)</button>');
  if(isConsLike()) bq.push('<button class="btn primary" style="padding:18px" data-act="c_qpresta" data-r="caisse">+ Prestation CADE (BP, agrément, FRA)</button>');
  var h='<div class="grid g'+bq.length+'">'+bq.join("")+'</div>';
  h+=vJournalBloc();
  h+='<section class="card"><div class="row between"><h2>Arrêté de caisse</h2><div class="row"><input type="date" id="c_cdate" value="'+esc(c.date)+'" max="'+TODAY+'" style="width:auto">'+
    ((isMgr()||role()==="lecteur")?'<select id="c_ctous" style="width:auto"><option value="1"'+(c.tous?" selected":"")+'>Toute l\'équipe</option><option value="0"'+(!c.tous?" selected":"")+'>Mes encaissements</option></select>':'')+
    '<button class="btn sm ghost" data-act="c_cprint">Imprimer</button><button class="btn sm" data-act="c_cpdf">PDF</button><button class="btn sm" data-act="c_cdoc">Word</button></div></div>';
  h+='<div class="grid g3">'+kpiC(ent(tot),"FCFA encaissés le "+fd(c.date))+kpiC(L.length,"encaissement(s)")+kpiC(vis,"visiteur(s) et entretien(s) à l'accueil")+'</div>';
  if(Object.keys(parMode).length) h+='<div class="row">'+Object.keys(parMode).map(function(m){ return '<span class="tag">'+esc(m)+' : '+ent(parMode[m])+' FCFA</span>'; }).join("")+'</div>';
  if(!L.length) h+='<p class="empty">Aucun encaissement ce jour-là.</p>';
  else h+='<div class="tablewrap"><table><thead><tr><th>Heure</th><th>Nature</th><th>Entreprise</th><th class="hide-sm">Mode</th><th class="hide-sm">Reçu</th><th class="num">Montant</th>'+(voirTous?'<th class="hide-sm">Par</th>':'')+'</tr></thead><tbody>'+
    L.map(function(x){ return '<tr><td>'+esc(heure(x.h))+'</td><td>'+esc(x.nat)+'</td><td>'+esc(x.ent||"—")+'</td><td class="hide-sm">'+esc(x.mode||"—")+'</td><td class="hide-sm">'+esc(x.recu||"—")+'</td><td class="num"><b>'+ent(x.mt)+'</b></td>'+(voirTous?'<td class="hide-sm">'+esc(APP().court(x.a))+'</td>':'')+'</tr>'; }).join("")+
    '<tr><td colspan="5"><b>Total</b></td><td class="num"><b>'+ent(tot)+'</b></td>'+(voirTous?'<td class="hide-sm"></td>':'')+'</tr></tbody></table></div>';
  h+='</section>';
  C._caisse={L:L, tot:tot, parMode:parMode, vis:vis, tous:voirTous};
  return h;
}
function heure(iso){ if(!iso) return "—"; var d=new Date(iso); return isNaN(d) ? "—" : String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
function caissePrint(){
  var k=C._caisse; if(!k) return;
  var h='<div class="report"><p class="muted">CADE / CCIAK · Yokkute PME</p><h1>Arrêté de caisse du '+fd(C.caisse.date)+'</h1><p>'+(k.tous?"Toute l'équipe":"Encaissements de "+esc(APP().court(ME().email)))+' · édité le '+fd(TODAY)+'</p>'+
    '<table><thead><tr><th>Heure</th><th>Nature</th><th>Entreprise</th><th>Mode</th><th>Reçu</th><th>Montant (FCFA)</th><th>Par</th></tr></thead><tbody>'+
    k.L.map(function(x){ return '<tr><td>'+esc(heure(x.h))+'</td><td>'+esc(x.nat)+'</td><td>'+esc(x.ent||"")+'</td><td>'+esc(x.mode||"")+'</td><td>'+esc(x.recu||"")+'</td><td style="text-align:right">'+ent(x.mt)+'</td><td>'+esc(APP().court(x.a))+'</td></tr>'; }).join("")+
    '<tr><td colspan="5"><b>Total</b></td><td style="text-align:right"><b>'+ent(k.tot)+'</b></td><td></td></tr></tbody></table>'+
    '<h2>Par mode de paiement</h2><table><tbody>'+Object.keys(k.parMode).map(function(m){ return '<tr><td>'+esc(m)+'</td><td style="text-align:right">'+ent(k.parMode[m])+'</td></tr>'; }).join("")+'</tbody></table>'+
    '<div class="sign"><div>Établi par</div><div>Vérifié par</div><div>Visa du responsable gestion portefeuille des entreprises (programme Yokkute)</div></div></div>';
  APP().printHTML(h);
}

/* ================= Rapport CADE (PDF, Word, Excel) · version 1.5 ================= */
function barreExport(lib){
  return '<div class="row noexport" style="justify-content:flex-end"><span class="small muted">'+esc(lib)+'</span><button class="btn sm primary" data-act="c_rpdf">PDF</button><button class="btn sm" data-act="c_rdoc">Word</button><button class="btn sm" data-act="c_rxls">Excel</button></div>';
}
function donneesCade(){
  var per=C.per, K=calc(per), P=K.P, Pl=plan(per.annee), part=P.part, T=APP().TACHES, M=contacts(), E=APP().ENT;
  var inP=function(d){ d=String(d||"").slice(0,10); return d && d>=P.debut && d<=P.fin; };
  var fin=[["Recettes des cartes d'adhésion", K.cartes, cibleCartes(Pl)*part],["Recettes de la Plateforme électronique (PE)", K.pe, ciblePE(Pl)*part],["Recettes des prestations du CADE", K.presta, Pl.prestations*part],
    ["Total des recettes propres", K.cartes+K.pe+K.presta, (cibleCartes(Pl)+ciblePE(Pl)+Pl.prestations)*part],["Financements obtenus par les entreprises", K.financ, Pl.financements*part]]
    .map(function(x){ var t=pct(x[1],x[2]); return [x[0], ent(x[1]), ent(x[2]), t==null?"—":t+" %"]; });
  var ind=INDIC.map(function(i){ var r=K.ind[i.id], c=Math.round(Pl.cibles[i.id]*part*10)/10, t=pct(r,c); return [i.axe, i.lib+(i.src!=="real"?" (auto)":""), ent(r), nf(c), t==null?"—":t+" %"]; });
  var gens=APP().conseillers().concat(APP().MEMBRES.filter(function(m){ return m.actif && (m.role==="accueil" || m.role==="pe"); }));
  var eq=gens.map(function(g){ var em=g.email, to=T.filter(function(t){ return t.assigneA===em && t.statut!=="Fait" && t.statut!=="Annulée"; });
    var ra=K.R.filter(function(r){ return r.auteur===em; }), enc=ra.reduce(function(s2,r){ return s2+num(r.montant); },0)+somme(valides(ADH.concat(PE)).filter(function(x){ return x.auteur===em && inP(x.date); }));
    var es=E.filter(function(e){ return e.conseiller===em; }), froid=es.filter(function(e){ var j=sansContact(e,M); return e.pdiValide && (j==null || j>60); }).length;
    return [APP().membreNom(em), String(to.length), String(to.filter(APP().enRetard).length), String(T.filter(function(t){ return t.assigneA===em && t.statut==="Fait" && inP(t.dateFait); }).length), String(ra.length), ent(enc), String(es.length), String(froid)]; });
  var parAxe=AXES.map(function(a){ var L=K.R.filter(function(r){ return r.axe===a.code; }); return [a.code, a.lib, String(L.length), ent(L.reduce(function(s2,r){ return s2+num(r.montant); },0))]; });
  var jr=K.R.slice().sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(r){ return [fd(r.date), r.axe, r.type, r.entrepriseNom||"", r.participants!=null?String(r.participants):"", r.montant?ent(r.montant):"", APP().membreNom(r.auteur)]; });
  var ca=ADH.filter(function(x){ return inP(x.date); }).sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(x){ return [fd(x.date), x.entrepriseNom, x.categorieLib||x.categorie, x.nature, ent(num(x.montant)), x.statut]; });
  var rel=aRelancer().map(function(x){ return [fd(x.echeance), x.entrepriseNom, x.matricule||"", x.categorieLib||x.categorie]; });
  var VP=valides(PE).filter(function(x){ return inP(x.date); });
  var peP=Pl.pe.concat([PE_AUTRE]).map(function(c){ var L=VP.filter(function(x){ return x.prestation===c.code; }), m=somme(L), mv=num(c.tarif)*num(c.cible)*part, t=pct(m,mv);
    return (c.code==="AUTRE" && !L.length) ? null : [c.lib, String(L.reduce(function(s,x){ return s+(num(x.quantite)||1); },0)), ent(m), mv?ent(mv):"—", t==null?"—":t+" %"]; }).filter(Boolean);
  var pe=PE.filter(function(x){ return inP(x.date); }).sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(x){ return [fd(x.date), x.entrepriseNom, x.prestationLib||x.prestation, String(num(x.quantite)||1), ent(num(x.montant)), x.statutCommande||"", x.statut]; });
  return {P:P, Pl:Pl, K:K, fin:fin, ind:ind, eq:eq, parAxe:parAxe, jr:jr, ca:ca, rel:rel, peP:peP, pe:pe};
}
function tab(head, rows){ return '<table><thead><tr>'+head.map(function(h){ return '<th>'+esc(h)+'</th>'; }).join("")+'</tr></thead><tbody>'+(rows.length?rows.map(function(r){ return '<tr>'+r.map(function(c){ return '<td>'+esc(c)+'</td>'; }).join("")+'</tr>'; }).join(""):'<tr><td colspan="'+head.length+'">Aucune donnée sur la période.</td></tr>')+'</tbody></table>'; }
function rapportCadeHTML(D){
  var P=D.P, K=D.K;
  var h='<h1>Rapport d\'activités du CADE · '+esc(P.label)+'</h1><p>Du '+fd(P.debut)+' au '+fd(P.fin)+' · établi le '+fd(TODAY)+' par '+esc(APP().membreNom(ME().email))+'.</p>';
  h+='<p>Sur la période, l\'équipe a enregistré '+K.R.length+' activité(s) et '+K.cartesNb+' carte(s) d\'adhésion, et la Plateforme électronique '+K.peNb+' recette(s) ; les recettes propres (cartes, PE et prestations) atteignent '+ent(K.cartes+K.pe+K.presta)+' FCFA et les financements obtenus par les entreprises '+ent(K.financ)+' FCFA.</p>';
  if(!D.Pl.existe) h+='<p class="small">Les cibles sont des valeurs d\'exemple : le plan annuel '+C.per.annee+' n\'est pas encore enregistré.</p>';
  h+='<h2>Objectifs financiers</h2>'+tab(["Objectif","Réalisé (FCFA)","Cible de la période (FCFA)","Taux"], D.fin);
  h+='<h2>Prévu et réalisé par axe de la fiche de poste</h2>'+tab(["Axe","Indicateur","Réalisé","Cible","Taux"], D.ind);
  h+='<p class="small">« (auto) » : compté depuis les diagnostics, PDI et visites enregistrés dans Yokkute.</p>';
  h+='<h2>Activités et recettes par axe</h2>'+tab(["Axe","Libellé","Activités","Encaissé (FCFA)"], D.parAxe);
  h+='<h2>Charge et résultats de l\'équipe</h2>'+tab(["Membre","Tâches ouvertes","En retard","Terminées","Activités saisies","Encaissé (FCFA)","Entreprises","Sans contact > 60 j"], D.eq);
  h+='<h2>Cartes d\'adhésion de la période</h2>'+tab(["Date","Entreprise","Catégorie","Nature","Montant (FCFA)","Statut"], D.ca);
  h+='<h2>Cartes à relancer</h2>'+tab(["Échéance","Entreprise","Matricule","Catégorie"], D.rel);
  h+='<h2>Plateforme électronique (PE) : résultats par prestation</h2>'+tab(["Prestation","Commandes","Encaissé (FCFA)","Cible de la période (FCFA)","Taux"], D.peP);
  h+='<h2>Recettes PE de la période</h2>'+tab(["Date","Client","Prestation","Qté","Montant (FCFA)","Commande","Statut"], D.pe);
  h+='<h2>Journal des activités de la période</h2>'+tab(["Date","Axe","Type d\'action","Entreprise","Participants","Encaissé","Saisi par"], D.jr);
  return h;
}
function exportCade(kind){
  var D=donneesCade(), o={title:"Rapport d'activités du CADE · "+D.P.label, file:"Rapport_CADE_"+D.P.debut.slice(0,7)+"_"+C.per.type, org:APP().CFG.nomStructure+" · "+APP().CFG.nomApplication, pied:APP().CFG.nomStructure+" · Activités CADE · "+D.P.label};
  if(kind==="xls"){
    if(!window.XLSX){ toast("Export Excel indisponible sur cet appareil."); return; }
    var wb=XLSX.utils.book_new();
    function f(nom, head, rows){ XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head].concat(rows)), nom); }
    f("Objectifs", ["Objectif","Réalisé (FCFA)","Cible période (FCFA)","Taux"], D.fin);
    f("Par indicateur", ["Axe","Indicateur","Réalisé","Cible","Taux"], D.ind);
    f("Par axe", ["Axe","Libellé","Activités","Encaissé (FCFA)"], D.parAxe);
    f("Equipe", ["Membre","Tâches ouvertes","En retard","Terminées","Activités saisies","Encaissé (FCFA)","Entreprises","Sans contact > 60 j"], D.eq);
    f("Cartes", ["Date","Entreprise","Catégorie","Nature","Montant (FCFA)","Statut"], D.ca);
    f("A relancer", ["Échéance","Entreprise","Matricule","Catégorie"], D.rel);
    f("PE par prestation", ["Prestation","Commandes","Encaissé (FCFA)","Cible période (FCFA)","Taux"], D.peP);
    f("Recettes PE", ["Date","Client","Prestation","Qté","Montant (FCFA)","Commande","Statut"], D.pe);
    f("Journal", ["Date","Axe","Type d'action","Entreprise","Participants","Encaissé","Saisi par"], D.jr);
    XLSX.writeFile(wb, o.file+".xlsx"); toast("Rapport Excel téléchargé."); return;
  }
  var html=rapportCadeHTML(D);
  if(kind==="pdf") window.YKE.pdf(html, o); else window.YKE.word(html, o);
  toast(kind==="pdf"?"Rapport PDF téléchargé.":"Rapport Word téléchargé.");
}
function caisseExport(kind){
  var k=C._caisse; if(!k) return;
  var h='<h1>Arrêté de caisse du '+fd(C.caisse.date)+'</h1><p>'+(k.tous?"Toute l'équipe":"Encaissements de "+esc(APP().membreNom(ME().email)))+' · édité le '+fd(TODAY)+'</p>'+
    tab(["Heure","Nature","Entreprise","Mode","Reçu","Montant (FCFA)","Par"], k.L.map(function(x){ return [heure(x.h), x.nat, x.ent||"", x.mode||"", x.recu||"", ent(x.mt), APP().membreNom(x.a)]; }).concat([["","Total","","","",ent(k.tot),""]]))+
    '<h2>Par mode de paiement</h2>'+tab(["Mode","Montant (FCFA)"], Object.keys(k.parMode).map(function(m){ return [m, ent(k.parMode[m])]; }))+
    '<p>Établi par : ............................ · Vérifié par : ............................ · Visa du responsable : ............................</p>';
  var o={title:"Arrêté de caisse du "+fd(C.caisse.date), file:"Arrete_caisse_"+C.caisse.date, org:APP().CFG.nomStructure+" · "+APP().CFG.nomApplication, pied:APP().CFG.nomStructure+" · Arrêté de caisse"};
  if(kind==="pdf") window.YKE.pdf(h, o); else window.YKE.word(h, o);
}

/* ================= Point d'entrée ================= */
function view(){
  if(!C.tab0){ C.tab0=true; C.tab=isAccueil()?"caisse":isPE()?"pe":(role()==="conseiller"?"moi":"tableau"); C.caisse.tous=isMgr() || role()==="lecteur"; }
  if(!tabList().some(function(x){ return x[0]===C.tab; })) C.tab="tableau";
  var h='<div><p class="eyebrow">Fiche de poste du CADE · planification et suivi</p><h1>Activités CADE</h1></div>'+tabs();
  if(C.tab==="moi") return h+rulesWarn()+vMoi();
  if(C.tab==="caisse") return h+rulesWarn()+vCaisse();
  if(C.tab==="equipe") return h+rulesWarn()+vEquipe();
  if(C.tab==="journal") return h+vJournal();
  if(C.tab==="cartes") return h+vCartes();
  if(C.tab==="base") return h+rulesWarn()+vBase();
  if(C.tab==="pe") return h+vPE();
  if(C.tab==="plan") return h+vPlan();
  return h+rulesWarn()+vTableau();
}
function editing(){ return !!(C.form || C.adh || C.pe || C.planEdit || C.ntype || C.annuler || C.bimp || C.jimp); }

function click(t, a){
  var id=t.getAttribute("data-id");
  if(a==="c_tab"){ C.tab=t.getAttribute("data-v"); C.form=null; C.adh=null; C.pe=null; C.planEdit=null; C.ntype=null; C.annuler=null; APP().render(); window.scrollTo(0,0); return; }
  if(a==="c_fnew"){ C.form=nouvelleReal(); APP().render(); return; }
  if(a==="c_qreal"){ C.form=nouvelleReal(); C.form.retour=t.getAttribute("data-r"); C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_qpresta"){ C.form=nouvelleReal(); C.form.axe="A3"; C.form.type="Business plan"; C.form.retour=t.getAttribute("data-r")||"caisse"; C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_qvisit"){ C.form=nouvelleReal(); C.form.axe="A1"; C.form.type="Accueil d'un visiteur"; C.form.retour="caisse"; C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_qcarte"){ C.adh=nouvelleAdh(); C.adh.retour=t.getAttribute("data-r"); C.tab="cartes"; APP().go("cade"); return; }
  if(a==="c_bimpno"){ C.bimp=null; APP().render(); return; }
  if(a==="c_jimpno"){ C.jimp=null; APP().render(); return; }
  if(a==="c_jimpok"){ importerJournal(); return; }
  if(a==="c_bimpok"){ importerBase(); return; }
  if(a==="c_bins"){ inscrire([id]); return; }
  if(a==="c_binsel"){ inscrire(Object.keys(C.bsel||{}).filter(function(k){ return C.bsel[k]; })); return; }
  if(a==="c_bdepok"){ var dp=C.depasse; C.depasse=null; if(dp){ C.bcoh=dp.y; inscrire(dp.mats, true); } return; }
  if(a==="c_bdepno"){ C.depasse=null; APP().render(); return; }
  if(a==="c_bmore"){ C.bn=(C.bn||100)+100; APP().render(); return; }
  if(a==="c_bxls"){ xlsBase(); return; }
  if(a==="c_qpe"){ C.pe=nouvellePE(); C.pe.retour=t.getAttribute("data-r"); C.tab="pe"; APP().go("cade"); return; }
  if(a==="c_penew"){ C.pe=nouvellePE(); APP().render(); return; }
  if(a==="c_pecancel"){ var rp=C.pe && C.pe.retour; C.pe=null; if(rp) C.tab=rp; APP().render(); return; }
  if(a==="c_pesave"){ savePE(); return; }
  if(a==="c_xlspe"){ xlsPE(); return; }
  if(a==="c_peedit"){ var px=PE.filter(function(z){ return z.id===id; })[0]; if(!px) return;
    C.pe={id:px.id, date:px.date, entTxt:px.entrepriseId?(px.entrepriseNom+" · "+px.entrepriseId):"", nom:px.entrepriseId?"":px.entrepriseNom, tel:px.telephone||"", prestation:px.prestation, quantite:px.quantite||1, montant:px.montant,
      mode:px.modePaiement||"Espèces", recu:px.recu||"", description:px.description||"", statutCommande:px.statutCommande||"Livrée"};
    APP().render(); window.scrollTo(0,0); return; }
  if(a==="c_peliv"){ var pl=PE.filter(function(z){ return z.id===id; })[0]; if(!pl) return;
    var dl=JSON.parse(JSON.stringify(pl)); delete dl._id; dl.statutCommande="Livrée"; dl.livreLe=TODAY; dl.majLe=new Date().toISOString(); dl.majPar=ME().email; DB.save("recettes_pe", pl.id, dl);
    APP().journal("recette_pe", null, "Commande PE livrée · "+pl.prestationLib+" · "+pl.entrepriseNom); toast("Commande marquée comme livrée."); return; }
  if(a==="c_peannul"){ C.annuler=id; APP().render(); return; }
  if(a==="c_peannulok"){ var mp=String((document.getElementById("c_motif")||{}).value||"").trim(); if(!mp){ toast("Indiquez le motif de l'annulation."); return; }
    var py=PE.filter(function(z){ return z.id===id; })[0]; if(!py) return; var dp=JSON.parse(JSON.stringify(py)); delete dp._id;
    dp.statut="Annulée"; dp.motifAnnulation=mp; dp.annuleLe=TODAY; dp.annulePar=ME().email; dp.majLe=new Date().toISOString(); dp.majPar=ME().email; DB.save("recettes_pe", py.id, dp);
    APP().journal("recette_pe", null, "Recette PE annulée · "+py.entrepriseNom+" · "+money(py.montant)+" · motif : "+mp); C.annuler=null; toast("Recette PE annulée."); APP().render(); return; }
  if(a==="c_ppadd"){ C.planEdit.pe.push({code:"", lib:"", tarif:0, cible:0}); APP().render(); return; }
  if(a==="c_ppdel"){ C.planEdit.pe.splice(Number(t.getAttribute("data-i")),1); APP().render(); return; }
  if(a==="c_cprint"){ caissePrint(); return; }
  if(a==="c_cpdf"){ caisseExport("pdf"); return; }
  if(a==="c_cdoc"){ caisseExport("doc"); return; }
  if(a==="c_rpdf"){ exportCade("pdf"); return; }
  if(a==="c_rdoc"){ exportCade("doc"); return; }
  if(a==="c_rxls"){ exportCade("xls"); return; }
  if(a==="c_fromtask"){ var tk=APP().TACHES.filter(function(x){ return x.id===id; })[0]; if(!tk) return;
    var f=nouvelleReal(); if(tk.axe && axe(tk.axe) && (!isAccueil() || tk.axe==="A1")){ f.axe=tk.axe; f.type=tk.typeAction && typesOf(tk.axe).some(function(z){ return z.t===tk.typeAction; }) ? tk.typeAction : typesOf(tk.axe)[0].t; }
    if(tk.entrepriseId){ var e=APP().byId(tk.entrepriseId); if(e) f.entTxt=e.nom+" · "+e.id; }
    f.obs=tk.commentaire||""; f.taskId=tk.id; f.tacheTitre=tk.titre; f.retour=APP().S_view()==="taches"?"taches":C.tab; C.form=f; C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_fcancel"){ var rt=C.form && C.form.retour; C.form=null; if(rt==="taches"){ APP().go("taches"); return; } if(rt) C.tab=rt; APP().render(); return; }
  if(a==="c_fsave"){ saveForm(); return; }
  if(a==="c_fedit"){ var r=REAL.filter(function(x){ return x.id===id; })[0]; if(!r) return;
    C.form={id:r.id, date:r.date, axe:r.axe, type:r.type, entTxt:r.entrepriseId?(r.entrepriseNom+" · "+r.entrepriseId):(r.entrepriseNom||""), participants:r.participants==null?"":r.participants, femmes:r.femmes==null?"":r.femmes,
      montant:r.montant==null?"":r.montant, mode:r.modePaiement||"Espèces", recu:r.recu||"", institution:r.institution||INSTITUTIONS[0], montantDemande:r.montantDemande==null?"":r.montantDemande, montantObtenu:r.montantObtenu==null?"":r.montantObtenu, obs:r.obs||""};
    APP().render(); var ed=document.querySelector(".editor"); if(ed) ed.scrollIntoView({block:"start"}); return; }
  if(a==="c_fdel"){ if(C.delR!==id){ C.delR=id; APP().render(); return; } C.delR=null; DB.del("realisations", id); toast("Activité supprimée."); return; }
  if(a==="c_xlsj"){ xlsJournal(); return; }
  if(a==="c_xlsa"){ xlsAdh(); return; }
  if(a==="c_anew"){ C.adh=nouvelleAdh(); APP().render(); return; }
  if(a==="c_acancel"){ var ra=C.adh && C.adh.retour; C.adh=null; if(ra) C.tab=ra; APP().render(); return; }
  if(a==="c_asave"){ saveAdh(); return; }
  if(a==="c_aedit"){ var x=ADH.filter(function(z){ return z.id===id; })[0]; if(!x) return;
    C.adh={id:x.id, date:x.date, entTxt:x.entrepriseId?(x.entrepriseNom+" · "+x.entrepriseId):"", nom:x.entrepriseId?"":x.entrepriseNom, matricule:x.entrepriseId?"":x.matricule, categorie:x.categorie, montant:x.montant, nature:x.nature, echeance:x.echeance, mode:x.modePaiement||"Espèces", recu:x.recu||""};
    APP().render(); window.scrollTo(0,0); return; }
  if(a==="c_aannul"){ C.annuler=id; APP().render(); return; }
  if(a==="c_aannulno"){ C.annuler=null; APP().render(); return; }
  if(a==="c_aannulok"){ var mo=String((document.getElementById("c_motif")||{}).value||"").trim(); if(!mo){ toast("Indiquez le motif de l'annulation."); return; }
    var y=ADH.filter(function(z){ return z.id===id; })[0]; if(!y) return; var d=JSON.parse(JSON.stringify(y)); delete d._id;
    d.statut="Annulée"; d.motifAnnulation=mo; d.annuleLe=TODAY; d.annulePar=ME().email; DB.save("adhesions", y.id, d);
    APP().journal("adhesion", null, "Carte annulée · "+y.entrepriseNom+" · "+money(y.montant)+" · motif : "+mo); C.annuler=null; toast("Vente annulée."); APP().render(); return; }
  if(a==="c_pledit"){ var Pl=plan(C.planAnnee); C.planEdit={annee:C.planAnnee, cibles:JSON.parse(JSON.stringify(Pl.cibles)), cartes:JSON.parse(JSON.stringify(Pl.cartes)), pe:JSON.parse(JSON.stringify(Pl.pe)), prestations:Pl.prestations, financements:Pl.financements, places:Pl.places, gratuites:JSON.parse(JSON.stringify(Pl.gratuites))}; APP().render(); return; }
  if(a==="c_plcancel"){ C.planEdit=null; APP().render(); return; }
  if(a==="c_plsave"){ savePlan(); return; }
  if(a==="c_pcadd"){ C.planEdit.cartes.push({code:"", lib:"", tarif:0, cible:0}); APP().render(); return; }
  if(a==="c_pcdel"){ C.planEdit.cartes.splice(Number(t.getAttribute("data-i")),1); APP().render(); return; }
  if(a==="c_ntnew"){ C.ntype={axe:t.getAttribute("data-axe"), t:"", m:false, p:false}; APP().render(); return; }
  if(a==="c_ntcancel"){ C.ntype=null; APP().render(); return; }
  if(a==="c_ntsave"){ var nt=C.ntype, lib=String(nt.t||"").trim(); if(!lib){ toast("Donnez un nom au type d'action."); return; }
    if(typesOf(nt.axe).some(function(z){ return cle(z.t)===cle(lib); })){ toast("Ce type d'action existe déjà pour cet axe."); return; }
    var rd=JSON.parse(JSON.stringify(refDoc())); delete rd._id; rd.types=rd.types||{}; rd.types[nt.axe]=(rd.types[nt.axe]||[]).concat([{t:lib, m:nt.m?1:0, p:nt.p?1:0}]);
    DB.save("cade_param", "referentiel", rd); C.ntype=null; toast("Type d'action ajouté à l'axe "+nt.axe+"."); APP().render(); return; }
  if(a==="c_tdel"){ var ax=t.getAttribute("data-axe"), tt=t.getAttribute("data-t"), rd2=JSON.parse(JSON.stringify(refDoc())); delete rd2._id;
    rd2.types=rd2.types||{}; rd2.types[ax]=(rd2.types[ax]||[]).filter(function(z){ return z.t!==tt; }); DB.save("cade_param", "referentiel", rd2); toast("Type d'action retiré (les activités déjà saisies sont conservées)."); return; }
}
function setVal(id, v){ var n=document.getElementById(id); if(n) n.value=v; }
/* Retourne true si l'événement a été traité par le module. */
function change(t){
  var id=t.id||"";
  if(id==="c_ptype"){ C.per.type=t.value; C.per.idx=t.value==="mois"?Number(TODAY.slice(5,7)):t.value==="trimestre"?Math.ceil(Number(TODAY.slice(5,7))/3):t.value==="semestre"?(Number(TODAY.slice(5,7))<=6?1:2):1; APP().render(); return true; }
  if(id==="c_pidx"){ C.per.idx=Number(t.value); APP().render(); return true; }
  if(id==="c_jfile" && t.files && t.files[0]){ var jf=t.files[0], jr=new FileReader(); jr.onload=function(){ try{ lireJournal(new Uint8Array(jr.result), jf.name); }catch(err){ console.error(err); toast("Lecture du fichier impossible : "+err.message); } }; jr.readAsArrayBuffer(jf); t.value=""; return true; }
  if(id==="c_bfile" && t.files && t.files[0]){ var bf=t.files[0], rd=new FileReader(); rd.onload=function(){ try{ lireBase(new Uint8Array(rd.result), bf.name); }catch(err){ console.error(err); toast("Lecture du fichier impossible : "+err.message); } }; rd.readAsArrayBuffer(bf); t.value=""; return true; }
  if(id==="c_byear"){ C.baseAn=Number(t.value); C.bsel={}; C.bn=100; APP().render(); return true; }
  if(id==="c_bcoh"){ C.bcoh=t.value; APP().render(); return true; }
  if(t.hasAttribute("data-bsel")){ C.bsel=C.bsel||{}; C.bsel[t.getAttribute("data-bsel")]=t.checked; APP().render(); return true; }
  var bfm={c_bcom:"commune", c_bfor:"forme", c_bmois:"mois", c_bst:"statut", c_bpaie:"paie"}; if(bfm[id]){ baseFiltres()[bfm[id]]=t.value; C.bn=100; APP().render(); return true; }
  if(id==="c_pan"||id==="c_cyear"||id==="c_peyear"){ C.per.annee=Number(t.value); APP().render(); return true; }
  if(id==="c_plyear"){ C.planAnnee=Number(t.value); C.planEdit=null; APP().render(); return true; }
  if(id==="c_jaxe"){ C.jf.axe=t.value; APP().render(); return true; }
  if(id==="c_cdate"){ if(t.value) C.caisse.date=t.value; APP().render(); return true; }
  if(id==="c_ctous"){ C.caisse.tous=t.value==="1"; APP().render(); return true; }
  if(id==="c_jqui"){ C.jf.qui=t.value; APP().render(); return true; }
  var f=C.form;
  if(f && id==="cf_axe"){ f.axe=t.value; f.type=typesOf(f.axe)[0].t; APP().render(); return true; }
  if(f && id==="cf_type"){ f.type=t.value; APP().render(); return true; }
  if(f && id==="cf_mode"){ f.mode=t.value; return true; }
  if(f && id==="cf_inst"){ f.institution=t.value; return true; }
  if(f && id==="cf_date"){ f.date=t.value; return true; }
  var g=C.adh;
  if(g && id==="ca_cat"){ g.categorie=t.value; var c=plan(Number(String(g.date).slice(0,4))).cartes.filter(function(x){ return x.code===t.value; })[0]; if(c) g.montant=c.tarif; APP().render(); return true; }
  /* Champs texte : pas de nouveau rendu (un clic sur « Enregistrer » juste après la saisie serait perdu) ; on met à jour les champs liés directement. */
  if(g && id==="ca_ent"){ g.entTxt=t.value; var e=entFromText(t.value), b=e?null:baseFromText(t.value), mt=e?e.id:b?b.mat:"";
    if(mt){ g.nature=natureAuto(mt); setVal("ca_nat", g.nature); var fo=e?e.forme:b.forme; if(fo){ var cg=catDeForme(fo), cc=plan(Number(String(g.date).slice(0,4))).cartes.filter(function(x){ return x.code===cg; })[0]; if(cc){ g.categorie=cc.code; g.montant=cc.tarif; APP().render(); } } } return true; }
  if(g && id==="ca_mat"){ g.matricule=t.value; g.nature=natureAuto(String(t.value).trim()); setVal("ca_nat", g.nature); return true; }
  if(g && id==="ca_date"){ g.date=t.value; if(t.value){ g.echeance=addDur(t.value,12,"mois"); setVal("ca_ech", g.echeance); } return true; }
  if(g && id==="ca_nat"){ g.nature=t.value; return true; }
  if(g && id==="ca_ech"){ g.echeance=t.value; return true; }
  if(g && id==="ca_mode"){ g.mode=t.value; return true; }
  var q=C.pe;
  if(q && id==="pe_pres"){ q.prestation=t.value; var cp=peCatalogue(Number(String(q.date).slice(0,4))).filter(function(x){ return x.code===t.value; })[0]; if(cp && num(cp.tarif)) q.montant=num(cp.tarif)*(num(q.quantite)||1); APP().render(); return true; }
  if(q && id==="pe_qte"){ q.quantite=t.value; var cq=peCatalogue(Number(String(q.date).slice(0,4))).filter(function(x){ return x.code===q.prestation; })[0]; if(cq && num(cq.tarif) && !q.mtManuel){ q.montant=num(cq.tarif)*(num(t.value)||1); setVal("pe_mt", q.montant); } return true; }
  if(q && id==="pe_date"){ q.date=t.value; return true; }
  if(q && id==="pe_mode"){ q.mode=t.value; return true; }
  if(q && id==="pe_stc"){ q.statutCommande=t.value; return true; }
  if(q && id==="pe_ent"){ q.entTxt=t.value; var pe2=entFromText(t.value); if(pe2 && pe2.tel && !q.tel){ q.tel=pe2.tel; setVal("pe_tel", q.tel); } return true; }
  if(C.ntype && id==="c_ntm"){ C.ntype.m=t.checked; return true; }
  if(C.ntype && id==="c_ntp"){ C.ntype.p=t.checked; return true; }
  if(C.planEdit && (t.hasAttribute("data-cpi") || t.hasAttribute("data-cpc") || t.hasAttribute("data-cpe") || id==="c_ppres" || id==="c_pfin" || id==="c_pplaces" || id==="c_pgprog" || id==="c_pgcoach")){ input(t); return true; }
  return false;
}
function input(t){
  var id=t.id||"", f=C.form, g=C.adh, E=C.planEdit;
  if(id==="c_bq"){ baseFiltres().q=t.value; C.bn=100; var bp=t.selectionStart; APP().render(); var bn=document.getElementById("c_bq"); if(bn){ bn.focus(); try{ bn.setSelectionRange(bp,bp); }catch(e){} } return true; }
  if(id==="c_jq"){ C.jf.q=t.value; var pos=t.selectionStart; APP().render(); var n=document.getElementById("c_jq"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } return true; }
  if(f){ var mf={cf_ent:"entTxt", cf_part:"participants", cf_fem:"femmes", cf_mt:"montant", cf_recu:"recu", cf_dem:"montantDemande", cf_obt:"montantObtenu", cf_obs:"obs"}; if(mf[id]){ f[mf[id]]=t.value; return true; } }
  if(g){ var mg={ca_ent:"entTxt", ca_nom:"nom", ca_mat:"matricule", ca_mt:"montant", ca_recu:"recu"}; if(mg[id]){ g[mg[id]]=t.value; return true; } }
  if(C.pe){ var mq={pe_ent:"entTxt", pe_nom:"nom", pe_tel:"tel", pe_qte:"quantite", pe_mt:"montant", pe_recu:"recu", pe_desc:"description"}; if(mq[id]){ C.pe[mq[id]]=t.value; if(id==="pe_mt") C.pe.mtManuel=true; return true; } }
  if(C.ntype && id==="c_nt"){ C.ntype.t=t.value; return true; }
  if(E){
    if(t.hasAttribute("data-cpi")){ E.cibles[t.getAttribute("data-cpi")]=t.value; return true; }
    if(t.hasAttribute("data-cpe")){ E.pe[Number(t.getAttribute("data-cpe"))][t.getAttribute("data-f")]=t.value; return true; }
    if(t.hasAttribute("data-cpc")){ E.cartes[Number(t.getAttribute("data-cpc"))][t.getAttribute("data-f")]=t.value; return true; }
    if(id==="c_ppres"){ E.prestations=t.value; return true; }
    if(id==="c_pfin"){ E.financements=t.value; return true; }
    if(id==="c_pplaces"){ E.places=t.value; return true; }
    if(id==="c_pgprog"){ E.gratuites=E.gratuites||{}; E.gratuites.programme=t.value; return true; }
    if(id==="c_pgcoach"){ E.gratuites=E.gratuites||{}; E.gratuites.coachs=String(t.value).split(/\n/); return true; }
  }
  return false;
}

window.YK_CADE = {view:view, click:click, change:change, input:input, editing:editing, AXES:AXES, typesOf:typesOf};
})();
