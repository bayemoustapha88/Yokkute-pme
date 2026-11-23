/* Yokkute PME — module « Activités CADE » (version 1.3 : phases 1 et 2).
   Référentiel des 9 axes de la fiche de poste, plan annuel (objectifs), journal des réalisations,
   ventes de cartes d'adhésion et tableau de bord prévu / réalisé.
   Collections Firestore : realisations, adhesions, cade_param. */
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
  types:[{t:"Séance de conseil en gestion ou organisation"},{t:"Conseil en financement"},{t:"Business plan",m:1},{t:"Dossier de crédit",m:1},{t:"Appui à la formalisation",m:1},{t:"Conseil approfondi (forfait)",m:1}]},
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
var CARTES_DEF = [
 {code:"TPE", lib:"Entreprise individuelle / TPE", tarif:10000, cible:300},
 {code:"PME", lib:"PME", tarif:25000, cible:100},
 {code:"GE", lib:"Grande entreprise", tarif:100000, cible:10}
];
var PRESTA_DEF = 10100000, FINANC_DEF = 300000000;

/* ================= Données ================= */
var REAL = [], ADH = [], PARAM = {}, ERR = null;
function refresh(){ if(APP()) APP().refresh(); }
DB.listen("realisations", function(d){ REAL=d.map(function(x){ x.id=x.id||x._id; return x; }); ERR=null; refresh(); });
DB.listen("adhesions", function(d){ ADH=d.map(function(x){ x.id=x.id||x._id; return x; }); refresh(); });
DB.listen("cade_param", function(d){ PARAM={}; d.forEach(function(x){ PARAM[x._id]=x; }); refresh(); });
DB.listen("_error", function(col, err){ if(["realisations","adhesions","cade_param"].indexOf(col)>=0){ ERR=(err && err.code)||"erreur"; refresh(); } });

function refDoc(){ return PARAM.referentiel || {types:{}}; }
function axe(code){ for(var i=0;i<AXES.length;i++) if(AXES[i].code===code) return AXES[i]; return null; }
function typesOf(code){ var a=axe(code); if(!a) return []; return a.types.concat((refDoc().types||{})[code]||[]); }
function typeOf(code, t){ if(/^Masterclass \(MC1 à MC1\d\)$/.test(t||"")) t="Masterclass (MC1 à MC11)"; var L=typesOf(code); for(var i=0;i<L.length;i++) if(L[i].t===t) return L[i]; return {t:t}; }
function plan(annee){
  var p=PARAM["annee_"+annee], cib={};
  INDIC.forEach(function(i){ cib[i.id]=(p && p.cibles && p.cibles[i.id]!=null) ? Number(p.cibles[i.id]) : i.def; });
  return {annee:annee, existe:!!p, cibles:cib, cartes:(p && p.cartes) || JSON.parse(JSON.stringify(CARTES_DEF)),
    prestations:(p && p.prestations!=null) ? Number(p.prestations) : PRESTA_DEF, financements:(p && p.financements!=null) ? Number(p.financements) : FINANC_DEF,
    majLe:p && p.majLe, majPar:p && p.majPar};
}
function cibleCartes(P){ return P.cartes.reduce(function(s,c){ return s+num(c.tarif)*num(c.cible); },0); }

/* ================= Droits ================= */
function role(){ return ME() ? ME().role : ""; }
function isOwner(){ return role()==="proprietaire"; }
function isMgr(){ return role()==="proprietaire" || role()==="chef"; }
function isAccueil(){ return role()==="accueil"; }
function isConsLike(){ return role()==="proprietaire" || role()==="chef" || role()==="conseiller"; }
function canSaisir(){ return isConsLike() || isAccueil(); }
function canVoirEquipe(){ return isMgr() || role()==="lecteur"; }
function recent(x){ return x.creeMs && (Date.now()-x.creeMs) < SEPT_JOURS; }
function canEditDoc(x){ return isMgr() || (canSaisir() && x.auteur===ME().email && recent(x)); }
function axesSaisissables(){ return isAccueil() ? AXES.filter(function(a){ return a.code==="A1"; }) : AXES; }

/* ================= Périodes ================= */
/* Années proposées : de 2026 (mise en service) à l'année prochaine, plus toute année où des données existent. */
function annees(){
  var y=Number(TODAY.slice(0,4)), set={}; for(var a=2026; a<=y+1; a++) set[a]=1;
  REAL.concat(ADH).forEach(function(x){ var z=Number(String(x.date||"").slice(0,4)); if(z>2000) set[z]=1; });
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
    out.ind[i.id]=v;
  });
  var A=ADH.filter(function(x){ return x.statut!=="Annulée" && inP(x.date); });
  out.cartesNb=A.length; out.cartes=A.reduce(function(s,x){ return s+num(x.montant); },0);
  out.cartesNouv=A.filter(function(x){ return x.nature!=="Renouvellement"; }).length;
  out.presta=R.reduce(function(s,r){ return s+num(r.montant); },0);
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
  if(canSaisir()) T.push(["caisse","Accueil / caisse"]);
  T.push(["tableau","Tableau de bord"]);
  if(canVoirEquipe()) T.push(["equipe","Pilotage de l'équipe"]);
  T.push(["journal","Journal des activités"],["cartes","Cartes d'adhésion"],["plan","Plan annuel et référentiel"]);
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
  var per=C.per, K=calc(per), P=K.P, Pl=plan(per.annee), part=P.part, ec=ecoule(P), h=perSelect();
  if(!Pl.existe) h+='<p class="ro-banner">Les cibles affichées sont des <b>valeurs d\'exemple</b>. Le propriétaire ou le responsable portefeuille les remplace dans « Plan annuel et référentiel ».</p>';
  function fin(lib, real, cibleAn, sous){
    var cib=cibleAn*part, t=pct(real,cib), proj=ec>0 && ec<1 ? real/ec : null;
    return '<div class="card"><span class="small muted">'+lib+'</span><b class="num" style="font-family:var(--f-display);font-size:1.5rem">'+ent(real)+' <span class="small muted">FCFA</span></b>'+barre(t)+
      '<span class="small"><b style="color:'+couleur(t)+'">'+(t==null?"—":t+" %")+'</b> de la cible de la période ('+ent(cib)+' FCFA)</span>'+
      (sous?'<span class="small muted">'+sous+'</span>':'')+(proj!=null?'<span class="small muted">Projection fin de période au rythme actuel : '+ent(proj)+' FCFA</span>':'')+'</div>';
  }
  h+='<section class="card"><div class="row between"><h2>Objectifs financiers · '+esc(P.label)+'</h2><span class="small muted">Période écoulée : '+Math.round(ec*100)+' %</span></div><div class="grid g3">'+
    fin("Recettes des cartes d'adhésion", K.cartes, cibleCartes(Pl), K.cartesNb+" carte(s), dont "+K.cartesNouv+" nouvelle(s) adhésion(s)")+
    fin("Recettes des prestations du CADE", K.presta, Pl.prestations, "Montants encaissés saisis dans le journal")+
    fin("Financements obtenus par les entreprises", K.financ, Pl.financements, "Montant demandé : "+ent(K.demande)+" FCFA")+'</div>'+
    '<p class="small muted">Total des recettes propres (cartes + prestations) : <b>'+ent(K.cartes+K.presta)+' FCFA</b> sur une cible de '+ent((cibleCartes(Pl)+Pl.prestations)*part)+' FCFA pour la période.</p></section>';

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
    .concat(ADH.map(function(x){ return {d:x.creeLe||x.date, txt:'<span class="tag">Carte</span> '+esc(x.nature||"")+' · '+esc(x.entrepriseNom)+' · '+ent(num(x.montant))+' FCFA', a:x.auteur, j:x.date}; }))
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
  if(a.ent!=="non") h+='<label class="f full">Entreprise concernée'+(a.ent==="oui"?' (obligatoire)':' (facultatif)')+'<input type="text" id="cf_ent" list="c_ents" value="'+esc(f.entTxt)+'" placeholder="Tapez le nom ou le matricule, puis choisissez dans la liste" autocomplete="off"></label>'+entList();
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
  if(a.ent==="oui" && !e){ toast("Choisissez l'entreprise dans la liste proposée (axe "+a.code+")."); return; }
  if(ty.p && num(f.femmes)>num(f.participants)){ toast("Le nombre de femmes dépasse le nombre de participants."); return; }
  if(ty.f && num(f.montantObtenu)>0 && num(f.montantDemande)>0 && num(f.montantObtenu)>num(f.montantDemande)){ toast("Le montant obtenu dépasse le montant demandé : vérifiez."); return; }
  var old=f.id ? REAL.filter(function(r){ return r.id===f.id; })[0] : null;
  var doc={date:f.date, axe:f.axe, type:f.type, entrepriseId:e?e.id:"", entrepriseNom:e?e.nom:(a.ent==="option"?String(f.entTxt||"").trim():""),
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
    '<label class="f full">Entreprise inscrite dans la base<input type="text" id="ca_ent" list="c_ents" value="'+esc(f.entTxt)+'" placeholder="Nom ou matricule, puis choisissez dans la liste" autocomplete="off"></label>'+entList()+
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
  var f=C.adh, e=String(f.entTxt||"").trim() ? entFromText(f.entTxt) : null;
  var nom=e?e.nom:String(f.nom||"").trim(), mat=e?e.id:String(f.matricule||"").trim();
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
    return '<tr><td class="'+(x.echeance<TODAY?"ko":"")+'"><b>'+fd(x.echeance)+'</b></td><td>'+esc(x.entrepriseNom)+' <span class="small muted">'+esc(x.matricule||"")+'</span></td><td class="hide-sm">'+esc(x.categorieLib||x.categorie)+'</td><td class="hide-sm">'+esc(e&&e.tel||"—")+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='</section>';

  h+='<section class="card"><div class="row between"><h2>Ventes enregistrées en '+y+' ('+A.length+')</h2><button class="btn sm ghost" data-act="c_xlsa">Exporter en Excel</button></div>';
  if(!A.length) h+='<p class="empty">Aucune carte enregistrée pour cette année.</p>';
  else { h+='<div class="tablewrap"><table><thead><tr><th>Date</th><th>Entreprise</th><th class="hide-sm">Catégorie</th><th class="num">Montant</th><th class="hide-sm">Reçu</th><th class="hide-sm">Valable jusqu\'au</th><th></th></tr></thead><tbody>';
    A.sort(function(a,b){ return a.date<b.date?1:-1; }).forEach(function(x){ var an=x.statut==="Annulée";
      h+='<tr style="'+(an?"opacity:.55;text-decoration:line-through":"")+'"><td>'+fd(x.date)+'</td><td>'+esc(x.entrepriseNom)+'<div class="small muted">'+esc(x.nature)+(x.matricule?' · '+esc(x.matricule):'')+' · '+esc(APP().court(x.auteur))+(an?' · annulée : '+esc(x.motifAnnulation||""):'')+'</div></td><td class="hide-sm">'+esc(x.categorieLib||x.categorie)+'</td><td class="num">'+ent(num(x.montant))+'</td><td class="hide-sm">'+esc(x.recu||"—")+'</td><td class="hide-sm">'+fd(x.echeance)+'</td><td>'+
        (!an && canEditDoc(x)?'<button class="btn sm ghost" data-act="c_aedit" data-id="'+esc(x.id)+'">Modifier</button>':'')+(!an && isMgr()?'<button class="btn sm ghost danger" data-act="c_aannul" data-id="'+esc(x.id)+'">Annuler</button>':'')+'</td></tr>';
      if(C.annuler===x.id) h+='<tr><td colspan="7"><div class="confirm"><label class="f">Motif de l\'annulation (obligatoire)<input type="text" id="c_motif" placeholder="Ex. : erreur de saisie, doublon, remboursement"></label><div class="row"><button class="btn sm ghost" data-act="c_aannulno">Retour</button><button class="btn sm danger" data-act="c_aannulok" data-id="'+esc(x.id)+'">Confirmer l\'annulation</button></div></div></td></tr>'; });
    h+='</tbody></table></div><p class="small muted">Une recette ne se supprime pas : le propriétaire ou le responsable portefeuille l\'annule avec un motif, et la ligne reste visible pour la traçabilité.</p>'; }
  return h+'</section>';
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
  h+='<tr><td colspan="3"><b>Total cartes d\'adhésion</b></td><td class="num"><b>'+ent(cibleCartes(src))+'</b></td>'+(E?'<td><button class="btn sm ghost" data-act="c_pcadd">+ Catégorie</button></td>':'')+'</tr></tbody></table></div>';
  h+='<h3>Autres objectifs financiers</h3><div class="grid g2">'+
    '<label class="f">Recettes des prestations du CADE (FCFA)<input type="number" min="0" step="10000" id="c_ppres" value="'+esc(src.prestations)+'"'+dis+'></label>'+
    '<label class="f">Financements à obtenir pour les entreprises (FCFA)<input type="number" min="0" step="100000" id="c_pfin" value="'+esc(src.financements)+'"'+dis+'></label></div>'+
    '<p class="small">Recettes propres visées (cartes + prestations) : <b>'+ent(cibleCartes(src)+num(src.prestations))+' FCFA</b>.</p>';
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
  var codes={}; E.cartes.forEach(function(c,i){ if(!c.code){ c.code="C"+Date.now().toString(36)+i; } codes[c.code]=1; });
  var doc={annee:E.annee, cibles:{}, cartes:E.cartes.map(function(c){ return {code:c.code, lib:String(c.lib).trim(), tarif:num(c.tarif), cible:num(c.cible)}; }),
    prestations:num(E.prestations), financements:num(E.financements), majLe:TODAY, majPar:ME().email};
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
    "Nature":x.nature, "Montant":x.montant, "Mode de paiement":x.modePaiement||"", "Reçu":x.recu||"", "Valable jusqu'au":x.echeance, "Statut":x.statut, "Motif d'annulation":x.motifAnnulation||"", "Saisi par":x.auteur}; }));
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
    '<button class="btn primary" data-act="c_qreal" data-r="moi">+ Saisir une activité</button><button class="btn" data-act="c_qcarte" data-r="moi">+ Vendre une carte</button></div></div>';
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
  var enc=R.reduce(function(s2,r){ return s2+num(r.montant); },0)+ADH.filter(function(x){ return x.auteur===me && x.statut!=="Annulée" && String(x.date).slice(0,7)===y; }).reduce(function(s2,x){ return s2+num(x.montant); },0);
  var tot=REAL.filter(function(r){ return String(r.date).slice(0,7)===y; }).length;
  h+='<section class="card"><h2>Mes résultats · '+MOISN[Number(y.slice(5))-1]+' '+y.slice(0,4)+'</h2><p class="small">'+R.length+' activité(s) saisie(s)'+(tot?' ('+Math.round(R.length/tot*100)+' % de l\'équipe)':'')+' · <b>'+ent(enc)+' FCFA</b> encaissés (prestations et cartes).</p>';
  if(R.length) h+='<div class="row">'+AXES.filter(function(a){ return parAxe[a.code]; }).map(function(a){ return '<span class="tag" title="'+esc(a.lib)+'">'+a.code+' · '+parAxe[a.code]+'</span>'; }).join("")+'</div>';
  return h+'</section>';
}
function kpiC(v,l,col){ return '<div class="card kpi"><span class="v num"'+(col?' style="color:'+col+'"':'')+'>'+v+'</span><span class="l">'+l+'</span></div>'; }

/* ================= Écran : Pilotage de l'équipe (responsable portefeuille, propriétaire, lecteur) ================= */
function vEquipe(){
  var K=calc(C.per), P=K.P, inP=function(d){ d=String(d||"").slice(0,10); return d && d>=P.debut && d<=P.fin; }, T=APP().TACHES, M=contacts(), E=APP().ENT;
  var h=perSelect();
  var gens=APP().conseillers().concat(APP().MEMBRES.filter(function(m){ return m.actif && m.role==="accueil"; }));
  h+='<section class="card"><h2>Charge et résultats de l\'équipe · '+esc(P.label)+'</h2><div class="tablewrap"><table><thead><tr><th>Membre</th><th class="num">Tâches ouvertes</th><th class="num">En retard</th><th class="num">Terminées</th><th class="num">Activités saisies</th><th class="num hide-sm">Encaissé (FCFA)</th><th class="num hide-sm">Entreprises</th><th class="num hide-sm">Sans contact &gt; 60 j</th></tr></thead><tbody>';
  gens.forEach(function(g){ var em=g.email, to=T.filter(function(t){ return t.assigneA===em && t.statut!=="Fait" && t.statut!=="Annulée"; }), lr=to.filter(APP().enRetard).length,
      tf=T.filter(function(t){ return t.assigneA===em && t.statut==="Fait" && inP(t.dateFait); }).length, ra=K.R.filter(function(r){ return r.auteur===em; }),
      enc=ra.reduce(function(s2,r){ return s2+num(r.montant); },0)+ADH.filter(function(x){ return x.auteur===em && x.statut!=="Annulée" && inP(x.date); }).reduce(function(s2,x){ return s2+num(x.montant); },0),
      es=E.filter(function(e){ return e.conseiller===em; }), froid=es.filter(function(e){ var j=sansContact(e,M); return e.pdiValide && (j==null || j>60); }).length;
    h+='<tr><td><b>'+esc(APP().court(em))+'</b><div class="small muted">'+esc(g.role==="accueil"?"Accueil / caisse":g.role==="chef"?"Responsable portefeuille":em===APP().OWNER?"Propriétaire":"Conseiller")+'</div></td><td class="num">'+to.length+'</td><td class="num '+(lr?"ko":"")+'"><b>'+lr+'</b></td><td class="num">'+tf+'</td><td class="num"><b>'+ra.length+'</b></td><td class="num hide-sm">'+ent(enc)+'</td><td class="num hide-sm">'+es.length+'</td><td class="num hide-sm '+(froid?"ko":"")+'">'+froid+'</td></tr>'; });
  h+='</tbody></table></div><p class="small muted">« Sans contact » : entreprises en suivi (PDI validé) sans visite, diagnostic ni activité enregistrés depuis plus de 60 jours.</p></section>';

  var late=T.filter(APP().enRetard).sort(function(a,b){ return a.echeance<b.echeance?-1:1; });
  var froids=E.filter(function(e){ var j=sansContact(e,M); return e.pdiValide && (j==null || j>60); }).sort(function(a,b){ return (M[a.id]||"")<(M[b.id]||"")?-1:1; });
  var rel=aRelancer(), y=Number(TODAY.slice(0,4));
  h+='<section class="card"><h2>Alertes</h2>';
  var al=[];
  if(!plan(y).existe) al.push('<div class="alert" data-act="c_tab" data-v="plan"><span class="feu Orange"><i></i></span><div style="flex:1"><b>Le plan '+y+' n\'est pas enregistré</b><div class="small muted">Les cibles affichées sont des exemples.</div></div><span class="small muted">Ouvrir ›</span></div>');
  if(!plan(y+1).existe && TODAY.slice(5)>="10-01") al.push('<div class="alert" data-act="c_tab" data-v="plan"><span class="feu Orange"><i></i></span><div style="flex:1"><b>Préparer le plan '+(y+1)+'</b><div class="small muted">À enregistrer avant le 1er janvier.</div></div><span class="small muted">Ouvrir ›</span></div>');
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
  var A=ADH.filter(function(x){ return x.date===c.date && x.statut!=="Annulée" && (voirTous || x.auteur===me); }).map(function(x){ return {h:x.creeLe, nat:"Carte · "+(x.nature||""), ent:x.entrepriseNom, mode:x.modePaiement, recu:x.recu, mt:num(x.montant), a:x.auteur}; });
  var L=R.concat(A).sort(function(a,b){ return (a.h||"")<(b.h||"")?-1:1; }), tot=L.reduce(function(s2,x){ return s2+x.mt; },0), parMode={};
  L.forEach(function(x){ var m=x.mode||"Non précisé"; parMode[m]=(parMode[m]||0)+x.mt; });
  var vis=REAL.filter(function(r){ return r.date===c.date && r.axe==="A1" && (voirTous || r.auteur===me); }).length;
  var h='<div class="grid g2"><button class="btn primary" style="padding:18px" data-act="c_qvisit">+ Enregistrer un visiteur</button><button class="btn primary" style="padding:18px" data-act="c_qcarte" data-r="caisse">+ Vendre ou renouveler une carte</button></div>';
  h+='<section class="card"><div class="row between"><h2>Arrêté de caisse</h2><div class="row"><input type="date" id="c_cdate" value="'+esc(c.date)+'" max="'+TODAY+'" style="width:auto">'+
    ((isMgr()||role()==="lecteur")?'<select id="c_ctous" style="width:auto"><option value="1"'+(c.tous?" selected":"")+'>Toute l\'équipe</option><option value="0"'+(!c.tous?" selected":"")+'>Mes encaissements</option></select>':'')+
    '<button class="btn sm ghost" data-act="c_cprint">Imprimer</button></div></div>';
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

/* ================= Point d'entrée ================= */
function view(){
  if(!C.tab0){ C.tab0=true; C.tab=isAccueil()?"caisse":(role()==="conseiller"?"moi":"tableau"); C.caisse.tous=isMgr() || role()==="lecteur"; }
  if(!tabList().some(function(x){ return x[0]===C.tab; })) C.tab="tableau";
  var h='<div><p class="eyebrow">Fiche de poste du CADE · planification et suivi</p><h1>Activités CADE</h1></div>'+tabs();
  if(C.tab==="moi") return h+rulesWarn()+vMoi();
  if(C.tab==="caisse") return h+rulesWarn()+vCaisse();
  if(C.tab==="equipe") return h+rulesWarn()+vEquipe();
  if(C.tab==="journal") return h+vJournal();
  if(C.tab==="cartes") return h+vCartes();
  if(C.tab==="plan") return h+vPlan();
  return h+rulesWarn()+vTableau();
}
function editing(){ return !!(C.form || C.adh || C.planEdit || C.ntype || C.annuler); }

function click(t, a){
  var id=t.getAttribute("data-id");
  if(a==="c_tab"){ C.tab=t.getAttribute("data-v"); C.form=null; C.adh=null; C.planEdit=null; C.ntype=null; C.annuler=null; APP().render(); window.scrollTo(0,0); return; }
  if(a==="c_fnew"){ C.form=nouvelleReal(); APP().render(); return; }
  if(a==="c_qreal"){ C.form=nouvelleReal(); C.form.retour=t.getAttribute("data-r"); C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_qvisit"){ C.form=nouvelleReal(); C.form.axe="A1"; C.form.type="Accueil d'un visiteur"; C.form.retour="caisse"; C.tab="journal"; APP().go("cade"); return; }
  if(a==="c_qcarte"){ C.adh=nouvelleAdh(); C.adh.retour=t.getAttribute("data-r"); C.tab="cartes"; APP().go("cade"); return; }
  if(a==="c_cprint"){ caissePrint(); return; }
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
  if(a==="c_pledit"){ var Pl=plan(C.planAnnee); C.planEdit={annee:C.planAnnee, cibles:JSON.parse(JSON.stringify(Pl.cibles)), cartes:JSON.parse(JSON.stringify(Pl.cartes)), prestations:Pl.prestations, financements:Pl.financements}; APP().render(); return; }
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
  if(id==="c_pan"||id==="c_cyear"){ C.per.annee=Number(t.value); APP().render(); return true; }
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
  if(g && id==="ca_ent"){ g.entTxt=t.value; var e=entFromText(t.value); if(e){ g.nature=natureAuto(e.id); setVal("ca_nat", g.nature); } return true; }
  if(g && id==="ca_mat"){ g.matricule=t.value; g.nature=natureAuto(String(t.value).trim()); setVal("ca_nat", g.nature); return true; }
  if(g && id==="ca_date"){ g.date=t.value; if(t.value){ g.echeance=addDur(t.value,12,"mois"); setVal("ca_ech", g.echeance); } return true; }
  if(g && id==="ca_nat"){ g.nature=t.value; return true; }
  if(g && id==="ca_ech"){ g.echeance=t.value; return true; }
  if(g && id==="ca_mode"){ g.mode=t.value; return true; }
  if(C.ntype && id==="c_ntm"){ C.ntype.m=t.checked; return true; }
  if(C.ntype && id==="c_ntp"){ C.ntype.p=t.checked; return true; }
  if(C.planEdit && (t.hasAttribute("data-cpi") || t.hasAttribute("data-cpc") || id==="c_ppres" || id==="c_pfin")){ input(t); return true; }
  return false;
}
function input(t){
  var id=t.id||"", f=C.form, g=C.adh, E=C.planEdit;
  if(id==="c_jq"){ C.jf.q=t.value; var pos=t.selectionStart; APP().render(); var n=document.getElementById("c_jq"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } return true; }
  if(f){ var mf={cf_ent:"entTxt", cf_part:"participants", cf_fem:"femmes", cf_mt:"montant", cf_recu:"recu", cf_dem:"montantDemande", cf_obt:"montantObtenu", cf_obs:"obs"}; if(mf[id]){ f[mf[id]]=t.value; return true; } }
  if(g){ var mg={ca_ent:"entTxt", ca_nom:"nom", ca_mat:"matricule", ca_mt:"montant", ca_recu:"recu"}; if(mg[id]){ g[mg[id]]=t.value; return true; } }
  if(C.ntype && id==="c_nt"){ C.ntype.t=t.value; return true; }
  if(E){
    if(t.hasAttribute("data-cpi")){ E.cibles[t.getAttribute("data-cpi")]=t.value; return true; }
    if(t.hasAttribute("data-cpc")){ E.cartes[Number(t.getAttribute("data-cpc"))][t.getAttribute("data-f")]=t.value; return true; }
    if(id==="c_ppres"){ E.prestations=t.value; return true; }
    if(id==="c_pfin"){ E.financements=t.value; return true; }
  }
  return false;
}

window.YK_CADE = {view:view, click:click, change:change, input:input, editing:editing, AXES:AXES, typesOf:typesOf};
})();
