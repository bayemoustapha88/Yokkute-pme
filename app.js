/* Yokkute PME — application (écrans, droits, rapports). */
"use strict";
(function(){
var DB = window.YK_DB, CFG = window.YK_CONFIG, OWNER = String(CFG.ownerEmail).toLowerCase();
var ENT = [], MEMBRES = [], TACHES = [], JOURNAL = [];
var ME = null;               /* {email, nom, role} */
var LOADED = {};
var EDIT_VIEWS = ["diag","newent","pdi","visite","tachenew"];
var S = {view:"tableau", id:null, diag:null, f:{q:"",seg:"",feu:"",cons:""}, open:{}, bseg:"", bnat:"", addFor:null, edit:null,
         newEnt:null, editId:null, dup:null, imp:null, conf:null, newTask:null, tf:{statut:"ouvertes", qui:""},
         rap:{type:"mois", annee:Number(TODAY.slice(0,4)), idx:Number(TODAY.slice(5,7))}, stale:false, menu:false};

/* ================= Outils ================= */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function fd(d){ if(!d) return "—"; d=String(d).slice(0,10); var m=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."]; return Number(d.slice(8))+" "+m[Number(d.slice(5,7))-1]+" "+d.slice(0,4); }
function days(a,b){ return Math.round((Date.parse(b)-Date.parse(a))/864e5); }
function norm(s){ return cle(s).replace(/\b(ETS|ETABLISSEMENTS?|GIE|SARL|SUARL|SA|ENTREPRISE|BOUTIQUE|ATELIER)\b/g,"").replace(/[^A-Z0-9]/g,""); }
function now(){ return new Date().toISOString(); }
var tt; function toast(m){ var t=document.getElementById("toast"); t.textContent=m; t.hidden=false; clearTimeout(tt); tt=setTimeout(function(){t.hidden=true;},4200); }
window.ykToast = toast;
function byId(id){ for(var i=0;i<ENT.length;i++) if(ENT[i].id===id) return ENT[i]; return null; }
function libById(id){ for(var i=0;i<LIB.length;i++) if(LIB[i].id===id) return LIB[i]; return null; }
function membreNom(email){ if(!email) return "—"; if(email===OWNER) return "Propriétaire ("+email+")"; var m=MEMBRES.filter(function(x){return x.email===email;})[0]; return m&&m.nom ? m.nom : email; }
function court(email){ if(!email) return "—"; if(email===ME.email) return "moi"; var m=MEMBRES.filter(function(x){return x.email===email;})[0]; return m&&m.nom ? m.nom : email.split("@")[0]; }
window.segOf = function(e){ return e.notes ? (e.override || segment(e.notes, e.projet)) : null; };
function lastVisit(e){ var v=e.visites||[]; return v.length ? v[v.length-1].date : null; }

/* ================= Droits ================= */
function isOwner(){ return ME && ME.role==="proprietaire"; }
function isCons(){ return ME && ME.role==="conseiller"; }
function canCreate(){ return isOwner() || isCons(); }
function canEdit(e){ return isOwner() || (isCons() && e && e.conseiller===ME.email); }
function conseillers(){ return [{email:OWNER, nom:"Moi (propriétaire)"}].concat(MEMBRES.filter(function(m){ return m.actif && m.role==="conseiller"; })); }

/* ================= Persistance ================= */
function strip(o){ var c=JSON.parse(JSON.stringify(o)); delete c._id; return c; }
function saveEnt(e){ e.updatedAt=now(); e.updatedBy=ME.email; DB.save("entreprises", e.id, strip(e)); }
function journal(type, e, texte){ DB.add("journal", {date:now(), jour:TODAY, auteur:ME.email, type:type, entrepriseId:e?e.id:"", entrepriseNom:e?e.nom:"", texte:texte}); }
function draftKey(id){ return "yokkute_brouillon_"+id; }
function saveDraft(){ if(!S.diag) return; try{ localStorage.setItem(draftKey(S.diag.id), JSON.stringify(S.diag)); }catch(e){} }
function getDraft(id){ try{ return JSON.parse(localStorage.getItem(draftKey(id))||"null"); }catch(e){ return null; } }
function dropDraft(id){ try{ localStorage.removeItem(draftKey(id)); }catch(e){} }
function nouvelleEnt(x){
  return Object.assign({id:"", nom:"", org:"", prenom:"", nomP:"", prom:"", tel:"", adresse:"", commune:"", dept:"", activite:"", coach:"", dateIns:"",
    secteur:"", genre:"", age:"", forme:"", ninea:"", rccm:"", effP:null, effT:null, programme:"", vague:"", conseiller:ME.email,
    notes:null, projet:false, volets:null, freins:[0,0,0,0,0], att:{}, rep:{}, fin:null, override:null, feu:null, pdi:null, pdiValide:null, objectif:"",
    visites:[], diags:[], diagDate:null, hist:[], createdAt:now(), createdBy:ME.email}, x||{});
}

/* ================= Icônes et navigation ================= */
var IC = {
 tableau:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
 entreprises:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>',
 diag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="M9 12l2 2 4-4"/></svg>',
 taches:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
 rapports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 biblio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/></svg>',
 equipe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c3 0 5 2 5 5"/></svg>'
};
function navItems(){
  var n=[["tableau","Tableau de bord","Accueil"],["entreprises","Entreprises","Entreprises"]];
  if(canCreate()) n.push(["diag","Diagnostic","Diagnostic"],["taches","Tâches","Tâches"]);
  n.push(["rapports","Rapports d'activités","Rapports"],["biblio","Bibliothèque d'actions","Actions"],["equipe", isOwner()?"Équipe et partage":"Équipe et exports","Équipe"]);
  return n;
}
function mesTachesOuvertes(){ return TACHES.filter(function(t){ return t.assigneA===ME.email && t.statut!=="Fait"; }); }

/* ================= Composants ================= */
function segChip(s){ return s ? '<span class="seg '+s+'">'+s+' · '+SEGLAB[s]+'</span>' : '<span class="seg none">À diagnostiquer</span>'; }
function feuChip(f){ return '<span class="feu '+(f||"none")+'"><i></i>'+(f||"Pas encore suivi")+'</span>'; }
function stat(s){ return '<span class="status '+(s==="Fait"?"Fait":s==="En cours"?"En":"A")+'">'+s+'</span>'; }
function typeTag(t){ return '<span class="tag '+(t==="rapide"?"quick":t==="essentiel"?"ess":"")+'">'+(TYPES[t]||t)+'</span>'; }
function natTag(n){ return n ? '<span class="tag">'+NATURES[n]+'</span>' : ''; }
function modShort(code){ if(!code||code==="CI") return "Coaching"; if(code==="U0") return "FVE intro"; return code.charAt(0)==="U" ? "FVE U"+code.slice(1) : "TAXAWU "+code; }
function kpi(v,l){ return '<div class="card kpi"><span class="v num">'+v+'</span><span class="l">'+l+'</span></div>'; }
function inf(l,v){ return '<div><span>'+l+'</span>'+esc(v)+'</div>'; }
function radar(n){
  var W=460,H=300,cx=230,cy=150,R=100, pts=[], axes="", rings="", labels="";
  for(var r=1;r<=5;r++){ var ring=[]; for(var i=0;i<8;i++){ var a=-Math.PI/2+i*Math.PI/4; ring.push((cx+R*r/5*Math.cos(a)).toFixed(1)+","+(cy+R*r/5*Math.sin(a)).toFixed(1)); }
    rings+='<polygon points="'+ring.join(" ")+'" fill="none" stroke="var(--line)" stroke-width="1"/>'; }
  for(var j=0;j<8;j++){ var a2=-Math.PI/2+j*Math.PI/4, x=cx+R*Math.cos(a2), y=cy+R*Math.sin(a2);
    axes+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/>';
    var lx=cx+(R+16)*Math.cos(a2), ly=cy+(R+16)*Math.sin(a2), anc=Math.abs(Math.cos(a2))<0.2?"middle":(Math.cos(a2)>0?"start":"end");
    labels+='<text x="'+lx.toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" text-anchor="'+anc+'">'+DIMS[j].court+(n&&n[j]?" ("+n[j]+")":"")+'</text>';
    if(n&&n[j]) pts.push((cx+R*n[j]/5*Math.cos(a2)).toFixed(1)+","+(cy+R*n[j]/5*Math.sin(a2)).toFixed(1)); }
  var poly=(n && pts.length===8)?'<polygon points="'+pts.join(" ")+'" fill="var(--accent)" fill-opacity="0.22" stroke="var(--accent)" stroke-width="2"/>':"";
  return '<svg class="radar" viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:420px" role="img" aria-label="Profil de maturité sur 8 dimensions">'+rings+axes+poly+labels+'</svg>';
}

/* ================= Écrans : accès ================= */
function vLogin(){
  return '<div class="login"><div class="card"><span class="brand">'+esc(CFG.nomApplication)+'</span><p class="muted">Diagnostic et accompagnement des entreprises · '+esc(CFG.nomStructure)+'</p>'+
    '<button class="btn primary" data-act="signin" style="justify-content:center">Se connecter avec Google</button>'+
    '<p class="small muted">Utilisez le compte Google que le propriétaire a autorisé. Après une première connexion avec internet, l\'application fonctionne aussi sans connexion.</p></div></div>';
}
function vRefus(m){
  return '<div class="login"><div class="card"><span class="brand">'+esc(CFG.nomApplication)+'</span>'+
    (m && m.erreur ? '<p>Impossible de vérifier vos droits pour le moment ('+esc(m.erreur)+'). Si c\'est votre première connexion, connectez-vous avec internet.</p>' :
     '<p>Le compte <b>'+esc(DB.user.email)+'</b> n\'a pas encore accès à l\'application.</p><p class="small muted">Demandez au propriétaire de vous ajouter dans « Équipe et partage » avec cette adresse, puis reconnectez-vous.</p>')+
    '<button class="btn" data-act="signout">Changer de compte</button></div></div>';
}

/* ================= Tableau de bord ================= */
function vTableau(){
  var L=ENT, diag=L.filter(function(e){return e.notes;}), pdi=L.filter(function(e){return e.pdiValide;});
  var vm=0; L.forEach(function(e){ (e.visites||[]).forEach(function(v){ if(v.date.slice(0,7)===TODAY.slice(0,7)) vm++; }); });
  var seg={A:0,B:0,C:0}; diag.forEach(function(e){ seg[segOf(e)]++; });
  var feux={Vert:0,Orange:0,Rouge:0}; L.forEach(function(e){ if(e.feu) feux[e.feu]++; });
  var need={}; L.forEach(function(e){ if(!e.pdi) return; var seen={}; e.pdi.forEach(function(p){ if(p.module && p.module!=="CI" && p.statut!=="Fait" && !seen[p.module]){ seen[p.module]=1; need[p.module]=(need[p.module]||0)+1; } }); });
  var needs=Object.keys(need).sort(function(a,b){ return need[b]-need[a]; });
  var vol=VOLETS.map(function(){ return {o:0,app:0}; });
  diag.forEach(function(e){ (e.volets||[]).forEach(function(s,i){ if(s!=="Non applicable"){ vol[i].app++; if(s==="Obtenu") vol[i].o++; } }); });
  var alerts=[];
  L.forEach(function(e){
    if(!e.notes) return;
    if(e.feu==="Rouge") alerts.push([e,"Rouge","Feu rouge au dernier suivi"]);
    var lv=lastVisit(e); if(!lv || days(lv,TODAY)>45) alerts.push([e,"Orange","Aucune visite depuis "+(lv?days(lv,TODAY)+" jours":"le diagnostic")]);
    if(e.pdi){ var late=e.pdi.filter(function(p){return p.statut!=="Fait" && p.echeance<TODAY;}).length; if(late) alerts.push([e,"Orange",late+" action(s) du PDI en retard"]); } });
  var aDiag=L.length-diag.length, maxs=Math.max(1,seg.A,seg.B,seg.C), maxn=needs.length?need[needs[0]]:1;
  var mt=mesTachesOuvertes().sort(function(a,b){ return (a.echeance||"9")<(b.echeance||"9")?-1:1; });
  var h='<div class="row between"><div><p class="eyebrow">'+(isOwner()?"Mon portefeuille":"Portefeuille "+esc(CFG.nomStructure))+'</p><h1>Tableau de bord</h1></div><button class="btn primary" data-act="go" data-v="entreprises">Voir les entreprises</button></div>';
  if(!L.length && canCreate()) h+='<section class="card"><h2>Bienvenue</h2><p>Aucune entreprise pour l\'instant. Commencez par importer l\'export « Liste des adhérents » de la plateforme CCIAK, ou enregistrez une entreprise.</p><div class="row"><button class="btn primary" data-act="go" data-v="entreprises">Importer ou enregistrer des entreprises</button></div></section>';
  h+='<div class="grid g4">'+kpi(L.length,"entreprises suivies")+kpi(diag.length+" / "+L.length,"diagnostics réalisés")+kpi(pdi.length,"PDI validés")+kpi(vm,"visites ce mois-ci")+'</div>';
  if(canCreate()){
    h+='<section class="card"><div class="row between"><h2>Mes tâches en cours</h2><button class="btn ghost sm" data-act="go" data-v="taches">Toutes les tâches ›</button></div>';
    if(!mt.length) h+='<p class="empty">Aucune tâche ouverte qui vous est attribuée.</p>';
    mt.slice(0,6).forEach(function(t){ var late=t.echeance && t.echeance<TODAY; h+='<div class="alert" data-act="go" data-v="taches" role="button" tabindex="0">'+feuChip(late?"Rouge":t.statut==="En cours"?"Orange":"Vert").replace(/<\/i>[^<]*<\/span>/,"</i></span>")+'<div style="flex:1;min-width:0"><b>'+esc(t.titre)+'</b><div class="small muted">'+esc(t.type)+(t.entrepriseNom?" · "+esc(t.entrepriseNom):"")+' · échéance '+fd(t.echeance)+(late?' <b class="ko">en retard</b>':'')+'</div></div><span class="small muted">'+esc(t.statut)+'</span></div>'; });
    h+='</section>';
  }
  h+='<div class="grid g2"><section class="card"><div class="row between"><h2>Besoins de formation du portefeuille</h2><span class="small muted">actions non terminées</span></div>';
  if(!needs.length) h+='<p class="empty">Aucun besoin de formation en cours.</p>';
  needs.forEach(function(c){ h+='<div style="display:flex;flex-direction:column;gap:4px"><div class="row between" style="flex-wrap:nowrap"><span class="small" style="min-width:0">'+esc(MOD[c])+'</span><b class="num">'+need[c]+'</b></div><div class="bar"><span style="width:'+(need[c]/maxn*100)+'%;background:var(--accent)"></span></div></div>'; });
  h+='</section><section class="card"><h2>Formalisation · six volets FVE</h2>';
  VOLETS.forEach(function(V,i){ var r=vol[i].app?vol[i].o/vol[i].app:0; h+='<div style="display:flex;flex-direction:column;gap:4px"><div class="row between"><span class="small">'+V.nom+' <span class="muted">('+modShort(V.u)+')</span></span><b class="num small">'+vol[i].o+' / '+vol[i].app+'</b></div><div class="bar"><span style="width:'+(r*100)+'%;background:var(--good)"></span></div></div>'; });
  h+='</section></div><div class="grid g2"><section class="card"><h2>Segments d\'encadrement</h2>';
  ["A","B","C"].forEach(function(s){ h+='<div style="display:flex;flex-direction:column;gap:4px"><div class="row between"><span>'+segChip(s)+'</span><b class="num">'+seg[s]+'</b></div><div class="bar"><span style="width:'+(seg[s]/maxs*100)+'%;background:var(--seg'+s+')"></span></div></div>'; });
  h+='<p class="small muted">'+aDiag+' entreprise(s) encore à diagnostiquer.</p></section><section class="card"><h2>Suivi trimestriel</h2>';
  ["Vert","Orange","Rouge"].forEach(function(f){ h+='<div class="row between">'+feuChip(f)+'<b class="num">'+feux[f]+'</b></div>'; });
  h+='<p class="small muted">Vert : dans les temps · Orange : retard rattrapable · Rouge : blocage.</p></section></div>';
  h+='<section class="card"><div class="row between"><h2>À traiter en priorité</h2><span class="small muted">'+alerts.length+' point(s)</span></div>';
  if(!alerts.length) h+='<p class="empty">Rien d\'urgent pour le moment.</p>';
  alerts.slice(0,10).forEach(function(a){ h+='<div class="alert" data-act="fiche" data-id="'+esc(a[0].id)+'" role="button" tabindex="0"><span class="feu '+a[1]+'"><i></i></span><div style="flex:1;min-width:0"><b>'+esc(a[0].nom)+'</b><div class="small muted">'+a[2]+(isOwner()&&a[0].conseiller!==OWNER?" · "+esc(court(a[0].conseiller)):"")+'</div></div><span class="small muted">Ouvrir ›</span></div>'; });
  h+='</section>';
  if(isOwner() && MEMBRES.length){
    h+='<section class="card"><h2>Charge par conseiller</h2><div class="tablewrap"><table><thead><tr><th>Conseiller</th><th>Entreprises</th><th>Diagnostiquées</th><th>Tâches ouvertes</th><th class="hide-sm">Tâches en retard</th></tr></thead><tbody>';
    conseillers().forEach(function(c){ var l=ENT.filter(function(e){return e.conseiller===c.email;}), tk=TACHES.filter(function(t){return t.assigneA===c.email && t.statut!=="Fait";});
      h+='<tr><td><b>'+esc(c.email===OWNER?"Moi":(c.nom||c.email))+'</b></td><td class="num">'+l.length+'</td><td class="num">'+l.filter(function(e){return e.notes;}).length+'</td><td class="num">'+tk.length+'</td><td class="hide-sm num">'+tk.filter(function(t){return t.echeance&&t.echeance<TODAY;}).length+'</td></tr>'; });
    h+='</tbody></table></div></section>';
  }
  return h;
}

/* ================= Entreprises ================= */
function vEntreprises(){
  var L=ENT.filter(function(e){
    var q=cle(S.f.q); if(q && cle(e.nom+" "+e.org+" "+e.prom+" "+e.id+" "+e.commune+" "+e.activite).indexOf(q)<0) return false;
    if(S.f.seg && S.f.seg!==(segOf(e)||"none")) return false;
    if(S.f.feu && (e.feu||"none")!==S.f.feu) return false;
    if(S.f.cons && e.conseiller!==S.f.cons) return false; return true; }).sort(function(a,b){ return a.nom<b.nom?-1:1; });
  var h='<div class="row between"><div><p class="eyebrow">'+ENT.length+' entreprise(s)</p><h1>Entreprises</h1></div><div class="row">'+
    '<button class="btn" data-act="modele">Modèle Excel</button>'+
    (isOwner()?'<label class="btn file-btn">Importer l\'export CCIAK<input type="file" id="fimport" accept=".xls,.xlsx,.csv,.htm,.html"></label>':'')+
    (canCreate()?'<button class="btn primary" data-act="newent">+ Nouvelle entreprise</button>':'')+'</div></div>';
  if(S.imp) h+=vImport();
  h+='<div class="card"><div class="filters" style="grid-template-columns:2fr 1fr 1fr'+(MEMBRES.length?' 1fr':'')+'"><label class="f s">Rechercher<input type="search" id="fq" value="'+esc(S.f.q)+'" placeholder="Nom, promoteur, matricule, commune, activité"></label>'+
    '<label class="f">Segment<select id="fseg"><option value="">Tous</option><option value="A">A · Structuration</option><option value="B">B · Consolidation</option><option value="C">C · Croissance</option><option value="none">À diagnostiquer</option></select></label>'+
    '<label class="f">Feu<select id="ffeu"><option value="">Tous</option><option>Vert</option><option>Orange</option><option>Rouge</option><option value="none">Pas encore suivi</option></select></label>'+
    (MEMBRES.length?'<label class="f">Conseiller<select id="fcons"><option value="">Tous</option>'+conseillers().map(function(c){return '<option value="'+esc(c.email)+'">'+esc(c.email===OWNER?"Propriétaire":(c.nom||c.email))+'</option>';}).join("")+'</select></label>':'')+'</div></div>';
  h+='<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Entreprise</th><th>Segment</th><th>Feu</th><th class="hide-sm">Activité</th><th class="hide-sm">Commune</th>'+(MEMBRES.length?'<th class="hide-sm">Conseiller</th>':'')+'<th class="hide-sm">Dernière visite</th></tr></thead><tbody>';
  if(!L.length) h+='<tr><td colspan="7" class="empty">'+(ENT.length?"Aucune entreprise ne correspond à ces filtres.":"Aucune entreprise enregistrée.")+'</td></tr>';
  L.forEach(function(e){ h+='<tr class="click" data-act="fiche" data-id="'+esc(e.id)+'" tabindex="0"><td><b>'+esc(e.nom)+'</b><div class="small muted">'+esc(e.prom)+' · '+esc(e.id)+'</div></td><td>'+segChip(segOf(e))+'</td><td>'+feuChip(e.feu)+'</td><td class="hide-sm">'+esc(e.activite||e.secteur)+'</td><td class="hide-sm">'+esc(e.commune)+'</td>'+(MEMBRES.length?'<td class="hide-sm">'+esc(court(e.conseiller))+'</td>':'')+'<td class="hide-sm">'+fd(lastVisit(e))+'</td></tr>'; });
  return h+'</tbody></table></div></div>';
}

/* ---- Import ---- */
var CHAMPS_EXPORT = [["dateIns","date d'inscription"],["prenom","prénom"],["nomP","nom"],["tel","téléphone"],["adresse","adresse"],["commune","commune"],["activite","activité"],["nom","raison sociale"],["org","organisation"],["coach","coach"]];
function preparerImport(res){
  var R={nouveaux:[], maj:[], conflits:[], inchanges:0, erreurs:res.erreurs||[], partages:[]};
  var seen={};
  res.lignes.forEach(function(x){
    if(seen[x.id]){ R.erreurs.push({ligne:"—", nom:x.nom, probleme:"matricule présent deux fois dans le fichier"}); return; } seen[x.id]=1;
    var e=byId(x.id);
    if(!e){ R.nouveaux.push(x); return; }
    var chg=[], conf=[];
    CHAMPS_EXPORT.forEach(function(c){ var k=c[0], nv=x[k]||"", ov=e[k]||"";
      if(String(nv)===String(ov) || !nv) return;
      if(!ov || (e.imp && String(e.imp[k]||"")===String(ov))) chg.push(k); else conf.push({k:k, lab:c[1], app:ov, exp:nv}); });
    var compAdd=Object.keys(x.comp||{}).filter(function(k){ return e[k]==null || e[k]===""; });
    if(chg.length || compAdd.length) R.maj.push({x:x, champs:chg, comp:compAdd});
    else if(!conf.length) R.inchanges++;
    conf.forEach(function(c){ R.conflits.push({id:x.id, nom:e.nom, k:c.k, lab:c.lab, app:c.app, exp:c.exp, choix:"app"}); });
  });
  var tels={}; ENT.concat(R.nouveaux).forEach(function(e){ var k=telCle(e.tel); if(k.length===9){ (tels[k]=tels[k]||[]).push(e.id); } });
  Object.keys(tels).forEach(function(k){ var ids=tels[k].filter(function(v,i,a){return a.indexOf(v)===i;}); if(ids.length>1) R.partages.push(ids); });
  return R;
}
function vImport(){
  var R=S.imp;
  var h='<section class="card"><div class="row between"><h2>Import · '+esc(R.fichier)+'</h2><button class="btn ghost sm" data-act="closeimp">Annuler</button></div>'+
    '<div class="grid g4">'+kpi(R.nouveaux.length,"nouvelles entreprises")+kpi(R.maj.length,"fiches à compléter ou mettre à jour")+kpi(R.inchanges,"déjà à jour")+kpi(R.conflits.length,"différences à arbitrer")+'</div>'+
    '<p class="small muted">Le matricule sert de clé : aucune fiche n\'est créée en double. Diagnostics, PDI, visites et informations complémentaires déjà saisies ne sont jamais écrasés.</p>';
  if(R.conflits.length){ h+='<h3>Différences entre l\'application et le fichier</h3>';
    R.conflits.forEach(function(c,i){ h+='<div class="rule row between"><span><b>'+esc(c.nom)+'</b> · '+c.lab+' : application « '+esc(c.app)+' », fichier « '+esc(c.exp)+' »</span><span class="choice"><label><input type="radio" name="cf'+i+'" data-conf="'+i+'" value="app"'+(c.choix==="app"?" checked":"")+'>Garder l\'application</label><label><input type="radio" name="cf'+i+'" data-conf="'+i+'" value="exp"'+(c.choix==="exp"?" checked":"")+'>Prendre le fichier</label></span></div>'; }); }
  if(R.partages.length) h+='<p class="small"><b>Téléphones partagés par plusieurs fiches :</b> '+R.partages.map(function(g){return g.join(", ");}).join(" ; ")+'. Vérifiez s\'il s\'agit du même promoteur.</p>';
  if(R.erreurs.length) h+='<p class="small"><b>Lignes à vérifier :</b> '+R.erreurs.map(function(e){ return "ligne "+e.ligne+" ("+esc(e.nom)+") : "+e.probleme; }).join(" ; ")+'.</p>';
  h+='<div class="row between"><span class="small muted">Les nouvelles entreprises vous sont attribuées ; vous pourrez les réattribuer à un conseiller.</span><button class="btn primary" data-act="doimport">Confirmer l\'import</button></div></section>';
  return h;
}
function appliquerImport(){
  var R=S.imp, n=0, m=0, c=0;
  R.nouveaux.forEach(function(x){
    var e=nouvelleEnt({id:x.id});
    CHAMPS_EXPORT.forEach(function(k){ e[k[0]]=x[k[0]]||""; }); e.prom=x.prom;
    e.dept=x.comp.dept||deptDe(x.commune); e.secteur=x.comp.secteur||filiereDe(x.activite); e.forme=x.comp.forme||formeDe(x.nom,x.org);
    Object.keys(x.comp).forEach(function(k){ if(e[k]==null || e[k]==="") e[k]=x.comp[k]; });
    e.imp={}; CHAMPS_EXPORT.forEach(function(k){ e.imp[k[0]]=x[k[0]]||""; }); e.imp.date=TODAY;
    e.hist=[{date:TODAY, auteur:ME.email, champs:["Créée par import ("+R.fichier+")"]}];
    saveEnt(e); n++; });
  R.maj.forEach(function(u){ var e=byId(u.x.id); u.champs.forEach(function(k){ e[k]=u.x[k]; }); u.comp.forEach(function(k){ e[k]=u.x.comp[k]; });
    if(u.champs.indexOf("prenom")>=0||u.champs.indexOf("nomP")>=0) e.prom=(e.prenom+" "+e.nomP).trim();
    if(!e.dept) e.dept=deptDe(e.commune);
    e.imp=e.imp||{}; CHAMPS_EXPORT.forEach(function(k){ e.imp[k[0]]=u.x[k[0]]||""; }); e.imp.date=TODAY;
    e.hist=(e.hist||[]).concat([{date:TODAY, auteur:ME.email, champs:u.champs.map(function(k){ return k; }).concat(u.comp).concat(["(import)"])}]); saveEnt(e); m++; });
  R.conflits.forEach(function(cf){ var e=byId(cf.id); e.imp=e.imp||{}; e.imp[cf.k]=cf.exp;
    if(cf.choix==="exp"){ e[cf.k]=cf.exp; if(cf.k==="prenom"||cf.k==="nomP") e.prom=(e.prenom+" "+e.nomP).trim(); e.hist=(e.hist||[]).concat([{date:TODAY, auteur:ME.email, champs:[cf.lab+" (repris du fichier)"]}]); c++; }
    saveEnt(e); });
  journal("import", null, "Import « "+R.fichier+" » : "+n+" nouvelle(s), "+m+" mise(s) à jour, "+c+" valeur(s) reprise(s) du fichier");
  S.imp=null; toast("Import terminé : "+n+" nouvelle(s) entreprise(s), "+m+" fiche(s) mise(s) à jour."); render();
}

/* ---- Formulaire entreprise ---- */
var ENT_FIELDS=[["id","Matricule CCIAK","text","Ex. : AG2026030068 (vide si inconnu)"],["dateIns","Date d'inscription","date"],["nom","Raison sociale *","text"],["org","Organisation (nom usuel ou sigle)","text"],
  ["prenom","Prénom du promoteur *","text"],["nomP","Nom du promoteur *","text"],["tel","Téléphone","text","+221 77 000 00 00"],["adresse","Adresse","text"],["commune","Commune","text"],
  ["dept","Département","sel",DEPTS],["activite","Activité (libellé CCIAK)","text"],["secteur","Filière normalisée","sel",FILIERES],
  ["genre","Genre du promoteur","sel",[["F","Femme"],["H","Homme"]]],["age","Tranche d'âge","sel",[["-35","Moins de 35 ans"],["35-50","35 à 50 ans"],["50+","Plus de 50 ans"]]],
  ["forme","Forme juridique","sel",FORMES],["ninea","NINEA","text"],["rccm","RCCM","sel",["Oui","Non","En cours"]],["effP","Effectif permanent","number"],["effT","Effectif temporaire / apprentis","number"],
  ["programme","Programme d'origine","text"],["vague","Vague","text"]];
function vEntForm(){
  var n=S.newEnt, ed=!!S.editId;
  var h='<button class="linkbtn" data-act="'+(ed?'fiche" data-id="'+esc(S.editId):'go" data-v="entreprises')+'">‹ '+(ed?"Retour à la fiche":"Retour aux entreprises")+'</button><div><p class="eyebrow">'+(ed?"Modification":"Enregistrement direct")+'</p><h1>'+(ed?"Modifier l'identification":"Nouvelle entreprise")+'</h1></div>';
  if(S.dup){ h+='<div class="warnbox"><b>Cette entreprise existe peut-être déjà</b>';
    S.dup.forEach(function(d){ h+='<div class="row between"><span>'+esc(d.e.nom)+' · '+esc(d.e.id)+' <span class="muted small">('+d.why+')</span></span><button class="btn sm" data-act="fiche" data-id="'+esc(d.e.id)+'">Ouvrir cette fiche</button></div>'; });
    h+='<div class="row"><button class="btn" data-act="savent" data-force="1">Enregistrer quand même</button></div></div>'; }
  h+='<section class="card"><p class="small muted">Les premiers champs reprennent les colonnes de l\'export CCIAK ; les suivants sont les informations complémentaires du CADE.</p><div class="grid g3">';
  ENT_FIELDS.forEach(function(f){ var id=f[0], v=n[id]==null?"":n[id];
    if(ed && id==="id") { h+='<label class="f">'+f[1]+'<input type="text" id="ne_id" value="'+esc(v)+'" disabled></label>'; return; }
    if(f[2]==="sel") h+='<label class="f">'+f[1]+'<select id="ne_'+id+'"><option value="">Choisir…</option>'+f[3].map(function(o){ var val=Array.isArray(o)?o[0]:o, tx=Array.isArray(o)?o[1]:o; return '<option value="'+esc(val)+'"'+(String(v)===val?" selected":"")+'>'+esc(tx)+'</option>'; }).join("")+'</select></label>';
    else h+='<label class="f">'+f[1]+'<input type="'+f[2]+'" id="ne_'+id+'" value="'+esc(v)+'"'+(f[3]?' placeholder="'+f[3]+'"':'')+'></label>'; });
  h+='</div><p class="small muted">'+(ed?"Le matricule ne se modifie pas : c'est la clé qui relie la fiche aux exports CCIAK. Chaque modification est datée dans l'historique.":"L'application vérifie qu'aucune fiche n'a le même matricule, le même NINEA, le même téléphone ou un nom très proche. Sans matricule, l'entreprise reçoit un identifiant provisoire ; vous pourrez la fusionner au prochain import.")+'</p>'+
    '<div class="row between"><span></span><button class="btn primary" data-act="savent">'+(ed?"Enregistrer les modifications":"Enregistrer l'entreprise")+'</button></div></section>';
  return h;
}
function saveEntForm(force){
  var n=S.newEnt;
  ["nom","prenom","nomP"].forEach(function(k){ n[k]=String(n[k]||"").trim(); });
  if(!n.nom || !(n.prenom||n.nomP)){ toast("Renseignez au moins la raison sociale et le nom du promoteur."); return; }
  if(n.id) n.id=String(n.id).trim().toUpperCase();
  if(!force){
    var dups=[]; ENT.forEach(function(e){ if(e.id===S.editId) return; var why=null;
      if(n.id && e.id===n.id) why="même matricule";
      else if(n.ninea && e.ninea && String(n.ninea).replace(/\s/g,"")===String(e.ninea).replace(/\s/g,"")) why="même NINEA";
      else if(n.tel && telCle(n.tel).length===9 && telCle(n.tel)===telCle(e.tel)) why="même téléphone";
      else if(!S.editId){ var a1=norm(n.nom), b1=norm(e.nom); if(a1.length>3 && b1.length>3 && (a1.indexOf(b1)>=0 || b1.indexOf(a1)>=0)) why="nom très proche"; }
      if(why) dups.push({e:e,why:why}); });
    if(S.editId===null && n.id && byId(n.id)){ toast("Ce matricule existe déjà."); }
    if(dups.length){ S.dup=dups; render(); window.scrollTo(0,0); return; } }
  if(!S.editId && n.id && byId(n.id)){ toast("Ce matricule existe déjà : ouvrez la fiche existante."); return; }
  n.tel=telNorm(n.tel); n.prom=((n.prenom||"")+" "+(n.nomP||"")).trim();
  if(!n.dept && n.commune) n.dept=deptDe(n.commune);
  if(S.editId){
    var e=byId(S.editId), ch=[];
    ENT_FIELDS.concat([["prom","Promoteur"]]).forEach(function(f){ var k=f[0]; if(k==="id") return; var nv=n[k]; if(f[2]==="number") nv=(nv===""||nv==null)?null:Number(nv);
      if(String(e[k]==null?"":e[k])!==String(nv==null?"":nv)){ if(k!=="prom") ch.push(f[1].replace(" *","")); e[k]=nv; } });
    if(ch.length){ e.hist=(e.hist||[]).concat([{date:TODAY, auteur:ME.email, champs:ch}]); saveEnt(e); journal("entreprise_modifiee", e, "Identification modifiée : "+ch.join(", ")); }
    var id=e.id; S.editId=null; S.newEnt=null; S.dup=null; toast(ch.length?"Identification mise à jour.":"Aucune modification."); go("fiche", id); return;
  }
  var id2 = n.id || ("PROV-"+Date.now().toString(36).toUpperCase());
  var ne = nouvelleEnt({id:id2});
  ENT_FIELDS.forEach(function(f){ var k=f[0]; if(n[k]!=null && n[k]!=="") ne[k]= f[2]==="number"?Number(n[k]):n[k]; });
  ne.id=id2; ne.prom=n.prom; if(!ne.secteur && ne.activite) ne.secteur=filiereDe(ne.activite); if(!ne.forme) ne.forme=formeDe(ne.nom, ne.org);
  ne.hist=[{date:TODAY, auteur:ME.email, champs:["Créée dans l'application"]}];
  saveEnt(ne); journal("entreprise_creee", ne, "Entreprise enregistrée");
  ENT.push(ne); S.newEnt=null; S.dup=null; toast("Entreprise enregistrée ("+id2+")."); go("fiche", id2);
}

/* ================= Fiche entreprise ================= */
function vFiche(){
  var e=byId(S.id); if(!e) return '<button class="linkbtn" data-act="go" data-v="entreprises">‹ Retour aux entreprises</button><p>Entreprise introuvable.</p>';
  var s=segOf(e), ce=canEdit(e);
  var h='<button class="linkbtn" data-act="go" data-v="entreprises">‹ Retour aux entreprises</button>';
  h+='<div class="row between"><div><p class="eyebrow">'+esc(e.id)+'</p><h1>'+esc(e.nom)+'</h1><div class="row" style="margin-top:6px">'+segChip(s)+feuChip(e.feu)+'</div></div><div class="row">'+
    (ce?'<button class="btn primary" data-act="newdiag" data-id="'+esc(e.id)+'">'+(e.notes?"Refaire le diagnostic":"Démarrer le diagnostic")+'</button>':'')+
    (e.pdi?'<button class="btn" data-act="pdi" data-id="'+esc(e.id)+'">'+(ce?"Voir le PDI":"Consulter le PDI")+'</button>':'')+
    (e.pdi&&ce?'<button class="btn" data-act="visite" data-id="'+esc(e.id)+'">Nouvelle visite</button>':'')+'</div></div>';
  if(!ce && canCreate()) h+='<p class="ro-banner">Cette entreprise est suivie par '+esc(membreNom(e.conseiller))+'. Vous pouvez la consulter ; pour la modifier, le propriétaire doit vous l\'attribuer.</p>';
  var hl=(e.hist||[]).length?e.hist[e.hist.length-1]:null;
  h+='<section class="card"><div class="row between"><h2>Identification</h2>'+(ce?'<button class="btn sm" data-act="editent" data-id="'+esc(e.id)+'">Modifier l\'identification</button>':'')+'</div><div class="info">'+
    inf("Matricule CCIAK",e.id)+inf("Date d'inscription",fd(e.dateIns))+inf("Organisation",e.org||"—")+
    inf("Promoteur",e.prom+(e.genre||e.age?" ("+[e.genre==="F"?"femme":e.genre==="H"?"homme":"",AGES[e.age]?AGES[e.age].toLowerCase():""].filter(Boolean).join(", ")+")":""))+
    inf("Téléphone",e.tel||"—")+inf("Adresse",e.adresse||"—")+inf("Commune · département",(e.commune||"—")+" · "+(e.dept||"—"))+inf("Activité",e.activite||"—")+inf("Filière",e.secteur||"—")+
    inf("Forme juridique",e.forme||"—")+inf("NINEA · RCCM",(e.ninea||"—")+" · "+(e.rccm||"—"))+inf("Effectifs (permanents · temporaires)",(e.effP==null?"—":e.effP)+" · "+(e.effT==null?"—":e.effT))+'</div>';
  if(isOwner()) h+='<label class="f" style="max-width:360px">Conseiller référent<select id="reassign">'+conseillers().map(function(c){ return '<option value="'+esc(c.email)+'"'+(c.email===e.conseiller?" selected":"")+'>'+esc(c.email===OWNER?"Moi (propriétaire)":(c.nom||c.email))+'</option>'; }).join("")+'</select></label>';
  else h+='<p class="small muted">Conseiller référent : '+esc(membreNom(e.conseiller))+'</p>';
  if(hl) h+='<p class="small muted">Dernière modification le '+fd(hl.date)+(hl.auteur?" par "+esc(court(hl.auteur)):"")+(hl.champs&&hl.champs.length?" : "+esc(hl.champs.join(", ")):"")+'.</p>';
  h+='</section>';
  if(e.fin && (e.fin.caMois!=null || e.fin.tranche)){ var lastCA=null; (e.visites||[]).forEach(function(v){ if(v.ca) lastCA=v; });
    h+='<section class="card"><div class="row between"><h2>Chiffres clés déclarés</h2><span class="small muted">Situation de référence · '+esc(e.fin.source||"")+'</span></div><div class="info">'+
      inf("Chiffre d'affaires mensuel",money(e.fin.caMois))+inf("Chiffre d'affaires sur 12 mois",e.fin.tranche||"—")+inf("Charges mensuelles",money(e.fin.charges))+inf("Bénéfice mensuel estimé",money(benef(e.fin)))+
      (lastCA?inf("Dernier CA mensuel relevé ("+fd(lastCA.date)+")",money(lastCA.ca)+(e.fin.caMois?" · "+(lastCA.ca>=e.fin.caMois?"+":"")+Math.round((lastCA.ca/e.fin.caMois-1)*100)+" %":"")):"")+'</div></section>'; }
  var tk=TACHES.filter(function(t){ return t.entrepriseId===e.id && t.statut!=="Fait"; });
  if(tk.length){ h+='<section class="card"><h2>Tâches en cours sur cette entreprise</h2>'; tk.forEach(function(t){ h+='<div class="row between"><span><b>'+esc(t.titre)+'</b> <span class="small muted">· '+esc(court(t.assigneA))+' · échéance '+fd(t.echeance)+'</span></span>'+stat(t.statut)+'</div>'; }); h+='</section>'; }
  if(!e.notes){ h+='<section class="card"><h2>Profil de maturité</h2><p class="empty">Pas encore de diagnostic. Il se fait sur site et fonctionne sans connexion.</p></section>'; return h+vHistDiag(e)+vDelete(e); }
  h+='<div class="grid g2"><section class="card"><div class="row between"><h2>Profil de maturité</h2><span class="small muted">Diagnostic du '+fd(e.diagDate)+'</span></div>'+radar(e.notes)+
    '<p class="small">Moyenne <b class="num">'+nf(moyenne(e.notes))+' / 5</b>. '+segReason(e.notes,e.projet)+(e.override?' Segment retenu par le conseiller : '+e.override+'.':'')+'</p></section>';
  h+='<section class="card"><h2>Formalisation · volets FVE</h2>';
  (e.volets||[]).forEach(function(st,i){ var c=st==="Obtenu"?"Fait":st==="En cours"?"En":"A"; h+='<div class="row between" style="flex-wrap:nowrap"><span class="small">'+VOLETS[i].nom+' <span class="muted">('+modShort(VOLETS[i].u)+')</span></span><span class="status '+c+'">'+st+'</span></div>'; });
  var fr=FREINS.filter(function(_,i){return (e.freins||[])[i];}); if(fr.length) h+='<p class="small"><b>Freins exprimés :</b> '+fr.join(" ; ")+'.</p>';
  var at=Object.keys(ATT).filter(function(k){return (e.att||{})[k];}).map(function(k){return ATT[k];}); if(at.length) h+='<p class="small"><b>Points d\'attention :</b> '+at.join(" ; ")+'.</p>';
  h+='</section></div>';
  var rk=Object.keys(e.rep||{}).filter(function(k){ return repText(e.rep[k], qForm(Number(k.split("-")[0]),Number(k.split("-")[1]))); });
  if(rk.length){ h+='<section class="card"><h2>Réponses de l\'entretien</h2>';
    DIMS.forEach(function(D,di){ var lines=[]; D.q.forEach(function(q,k){ var tx=repText(e.rep[di+"-"+k], qForm(di,k)); if(tx) lines.push('<p class="small"><span class="muted">'+esc(q[0])+'</span><br>'+esc(tx)+'</p>'); });
      if(lines.length) h+='<div style="display:flex;flex-direction:column;gap:6px;padding:8px 0;border-bottom:1px solid var(--line)"><b>'+D.nom+'</b>'+lines.join("")+'</div>'; });
    h+='</section>'; }
  var done=(e.pdi||[]).filter(function(p){return p.statut==="Fait";}).length;
  h+='<section class="card"><div class="row between"><h2>Plan de Développement Individuel</h2><span class="small muted num">'+done+' / '+(e.pdi||[]).length+' réalisées'+(e.pdiValide?' · validé le '+fd(e.pdiValide):' · non validé')+'</span></div><div class="bar"><span style="width:'+(done/Math.max(1,(e.pdi||[]).length)*100)+'%;background:var(--good)"></span></div>';
  (e.pdi||[]).forEach(function(p){ var late=p.statut!=="Fait"&&p.echeance<TODAY; h+='<div class="row between" style="flex-wrap:nowrap;align-items:flex-start;padding:4px 0"><div style="min-width:0"><b>'+esc(p.reco)+'</b><div class="small">'+esc(p.action)+'</div>'+(p.outil?'<div class="small">Outil ou modèle : '+esc(p.outil)+'</div>':'')+'<div class="small muted">'+DIMS[p.dim].court+' · du '+fd(p.debut)+' au '+fd(p.echeance)+' · '+esc(p.partenaire)+(late?' · <b class="ko">en retard</b>':'')+'</div></div>'+stat(p.statut)+'</div>'; });
  h+='</section><section class="card"><div class="row between"><h2>Historique des visites</h2>'+(ce?'<button class="btn ghost" data-act="visite" data-id="'+esc(e.id)+'">+ Nouvelle visite</button>':'')+'</div><div class="timeline">';
  if(!(e.visites||[]).length) h+='<p class="empty">Aucune visite de suivi enregistrée.</p>';
  (e.visites||[]).slice().reverse().forEach(function(v){ h+='<div class="ev"><div><b>'+fd(v.date)+'</b><div>'+feuChip(v.feu)+'</div></div><div><p>'+esc(v.obs)+'</p>'+(v.ca?'<p class="small muted">CA du mois relevé : '+money(v.ca)+'</p>':'')+'<p class="small muted">'+esc(court(v.auteur))+(v.prochaine?" · prochaine visite prévue le "+fd(v.prochaine):"")+'</p></div></div>'; });
  h+='</div></section>';
  return h+vHistDiag(e)+vDelete(e);
}
function vHistDiag(e){
  if(!(e.diags||[]).length) return "";
  var h='<section class="card"><h2>Diagnostics successifs</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Moyenne</th><th>Segment</th><th class="hide-sm">Réalisé par</th></tr></thead><tbody>';
  e.diags.slice().reverse().forEach(function(d,i,a){ var prev=a[i+1]; var m=moyenne(d.notes); h+='<tr><td>'+fd(d.date)+'</td><td class="num">'+nf(m)+(prev?' <span class="small '+(m>=moyenne(prev.notes)?"ok":"ko")+'">('+(m>=moyenne(prev.notes)?"+":"")+nf(Math.round((m-moyenne(prev.notes))*100)/100)+')</span>':'')+'</td><td>'+segChip(d.segment)+'</td><td class="hide-sm">'+esc(court(d.auteur))+'</td></tr>'; });
  return h+'</tbody></table></div></section>';
}
function vDelete(e){
  if(!isOwner()) return "";
  if(S.confirmDel===e.id) return '<div class="confirm"><b>Supprimer définitivement « '+esc(e.nom)+' » ?</b><p class="small">Le diagnostic, le PDI et les visites de cette entreprise seront perdus. Cette action ne peut pas être annulée.</p><div class="row"><button class="btn danger" data-act="delent" data-id="'+esc(e.id)+'">Oui, supprimer</button><button class="btn" data-act="canceldel">Annuler</button></div></div>';
  return '<div class="row"><button class="btn ghost danger sm" data-act="askdel" data-id="'+esc(e.id)+'">Supprimer cette entreprise</button></div>';
}

/* ================= Diagnostic ================= */
function vDiagPick(){
  var L=ENT.filter(function(e){ return canEdit(e); });
  var h='<div><p class="eyebrow">Diagnostic 360°</p><h1>Choisir l\'entreprise à diagnostiquer</h1></div><p class="muted">Le diagnostic se fait sur site, en une demi-journée. Il fonctionne sans connexion et se garde en brouillon sur l\'appareil jusqu\'à l\'enregistrement.</p>';
  h+='<div class="filters" style="grid-template-columns:1fr"><label class="f">Rechercher<input type="search" id="fq" value="'+esc(S.f.q)+'" placeholder="Nom, promoteur, matricule"></label></div>';
  var q=cle(S.f.q); L=L.filter(function(e){ return !q || cle(e.nom+" "+e.prom+" "+e.id).indexOf(q)>=0; }).sort(function(a,b){ return (a.notes?1:0)-(b.notes?1:0) || (a.nom<b.nom?-1:1); });
  if(!L.length) h+='<p class="empty">Aucune entreprise ne vous est attribuée pour le moment.</p>';
  h+='<div class="grid g3">';
  L.slice(0,60).forEach(function(e){ var dr=getDraft(e.id); h+='<button class="card" style="cursor:pointer;text-align:left" data-act="newdiag" data-id="'+esc(e.id)+'"><div class="row between">'+segChip(segOf(e))+'<span class="small muted">'+esc(e.id)+'</span></div><b>'+esc(e.nom)+'</b><span class="small muted">'+esc(e.prom)+' · '+esc(e.commune)+'</span><span class="small" style="color:var(--accent);font-weight:700">'+(dr?"Reprendre le brouillon ›":e.notes?"Refaire le diagnostic ›":"Démarrer ›")+'</span></button>'; });
  return h+'</div>';
}
function dProp(d,st){ return DIMS[st].volets ? propFromVolets(d.volets) : propFromChecks(st, d.checks[st]); }
function qHTML(d, st, k, q){
  var key=st+"-"+k, op=S.open[key], qf=qForm(st,k), r=d.rep[key]||{}, h='<div class="q"><p><b>'+(k+1)+'.</b> '+q[0]+'</p>';
  if(qf.type==="choix") h+='<div class="choice">'+qf.opts.map(function(o,i){ return '<label><input type="radio" name="q_'+key+'" value="'+i+'" data-q="'+key+'"'+(String(r.v)===String(i)?" checked":"")+'>'+esc(o)+'</label>'; }).join("")+'</div>';
  else if(qf.type==="multi") h+='<div class="choice">'+qf.opts.map(function(o,i){ return '<label><input type="checkbox" data-qm="'+key+'" value="'+i+'"'+((r.v||[]).indexOf(i)>=0?" checked":"")+'>'+esc(o)+'</label>'; }).join("")+'</div>';
  else if(qf.type==="info") h+='<p class="small muted">'+qf.msg+'</p>';
  if(qf.type==="texte") h+='<textarea data-qt="'+key+'" placeholder="Réponse du promoteur" aria-label="Réponse">'+esc(r.v||"")+'</textarea>';
  else if(qf.type!=="info") h+='<input type="text" data-qp="'+key+'" value="'+esc(r.p||"")+'" placeholder="Précisions (mots du promoteur)" aria-label="Précisions">';
  if(qf.lie && !DIMS[st].volets) h+='<p class="small muted">Certaines réponses cochent le repère correspondant ci-dessous ; décochez-le s\'il n\'est pas vérifié sur pièce.</p>';
  h+='<button class="linkbtn" data-act="wo" data-k="'+key+'" aria-expanded="'+(op?"true":"false")+'">'+(op?"Masquer le repère wolof":"Repère en wolof")+'</button>'+(op?'<p class="wo"><b>Wolof · à valider</b>'+q[1]+'</p>':'');
  return h+'</div>';
}
function vDiag(){
  var d=S.diag, e=byId(d.id), st=d.step;
  if(!e) return '<p>Entreprise introuvable.</p>';
  var h='<div class="row between"><button class="linkbtn" data-act="fiche" data-id="'+esc(e.id)+'">‹ Quitter (brouillon conservé sur l\'appareil)</button><button class="btn ghost sm" data-act="resetdiag">Recommencer à zéro</button></div><div><p class="eyebrow">Diagnostic 360° · '+esc(e.id)+'</p><h1>'+esc(e.nom)+'</h1></div><div class="steps">';
  for(var i=0;i<9;i++){ var ok=i<8 && d.notes[i]; h+='<button data-act="step" data-s="'+i+'" class="'+(ok?"done":"")+'"'+(i===st?' aria-current="step"':'')+'><span class="n">'+(i<8?(ok?d.notes[i]:"D"+(i+1)):"✓")+'</span>'+(i<8?DIMS[i].court:"Synthèse")+'</button>'; }
  h+='</div>';
  if(st<8){
    var D=DIMS[st], prop=dProp(d,st);
    h+='<section class="card"><p class="eyebrow">Dimension '+(st+1)+' sur 8</p><h2>'+D.nom+'</h2><p class="muted">'+D.but+'</p><div class="row">'+D.mods.map(function(m){return '<span class="tag">'+esc(MOD[m])+'</span>';}).join("")+'</div></section>';
    h+='<section class="card"><h3>Questions et réponses</h3><p class="small muted">Cochez la réponse du promoteur ou écrivez-la ; notez ses mots dans les précisions.</p>';
    D.q.forEach(function(q,k){ h+=qHTML(d, st, k, q); });
    h+='</section>';
    if(D.volets){
      h+='<section class="card"><h3>Les six volets de la formalisation (module FVE)</h3><p class="small muted">Statut vérifié sur pièces. Le volet 1 est un critère bloquant ; les volets 1 et 3 sont obligatoires dans le PDI des segments A et B tant qu\'ils ne sont pas obtenus.</p>';
      VOLETS.forEach(function(V,k){ h+='<div class="volet"><div><b>'+(k+1)+'. '+V.nom+'</b> <span class="tag">'+modShort(V.u)+'</span>'+(V.bloq?'<span class="bloq">bloquant</span>':'')+'<div class="small muted">'+V.preuve+'</div></div><select data-volet="'+k+'" aria-label="Statut du volet '+(k+1)+'">'+STATUTS.map(function(s){return '<option'+(d.volets[k]===s?" selected":"")+'>'+s+'</option>';}).join("")+'</select></div>'; });
      h+='</section><section class="card"><h3>Freins exprimés par le promoteur</h3><div class="checks">';
      FREINS.forEach(function(f,k){ h+='<label for="fr'+k+'"><input type="checkbox" id="fr'+k+'" data-frein="'+k+'"'+(d.freins[k]?" checked":"")+'><span>'+f+'</span></label>'; });
      h+='</div><p class="small muted">Un frein coché ajoute au PDI la séance d\'introduction FVE avant les démarches.</p></section>';
    } else {
      h+='<section class="card"><h3>Repères observés</h3><p class="small muted">Cochez ce que vous avez vérifié sur place. Les repères A sont les fondations, B et C s\'y ajoutent.</p><div class="levels">';
      ["A","B","C"].forEach(function(l){ h+='<div class="level '+l+'"><h4>'+l+' · '+SEGLAB[l]+'</h4><div class="checks">';
        D.c[l].forEach(function(c,k){ var id="ck"+st+l+k, b=D.bloq&&D.bloq[l]&&D.bloq[l].indexOf(k)>=0; h+='<label for="'+id+'"><input type="checkbox" id="'+id+'" data-ck="'+l+k+'"'+(d.checks[st]&&d.checks[st][l+k]?" checked":"")+'><span>'+c+(b?'<span class="bloq">bloquant</span>':'')+'</span></label>'; });
        h+='</div></div>'; });
      h+='</div></section>';
    }
    if(D.fin){ var F=d.fin;
      h+='<section class="card"><h3>Chiffres clés déclarés</h3><p class="small muted">Ils servent de situation de référence pour mesurer les progrès du PDI. Si le promoteur préfère, notez seulement la tranche annuelle.</p><div class="grid g3">'+
        '<label class="f">Chiffre d\'affaires mensuel moyen (FCFA)<input type="number" min="0" step="1000" id="fin_caMois" value="'+(F.caMois==null?"":F.caMois)+'"></label>'+
        '<label class="f">Chiffre d\'affaires des 12 derniers mois<select id="fin_tranche"><option value="">Choisir une tranche…</option>'+TRANCHES.map(function(t){return '<option'+(F.tranche===t?" selected":"")+'>'+t+'</option>';}).join("")+'</select></label>'+
        '<label class="f">Charges mensuelles moyennes (FCFA)<input type="number" min="0" step="1000" id="fin_charges" value="'+(F.charges==null?"":F.charges)+'"></label>'+
        '<div class="f"><span class="small muted" style="font-weight:600">Bénéfice mensuel estimé</span><b class="num" id="fin_benef" style="font-size:1.15rem">'+money(benef(F))+'</b></div>'+
        '<label class="f">Source de l\'information<select id="fin_source">'+["Déclaration orale","Cahier de caisse vérifié"].map(function(t){return '<option'+(F.source===t?" selected":"")+'>'+t+'</option>';}).join("")+'</select></label></div></section>'; }
    h+='<section class="card"><h3>Note de la dimension</h3><div class="propose"><span>Note proposée d\'après '+(D.volets?"les volets":"les repères cochés")+' :</span><b class="num">'+prop+'</b><span class="small muted">'+D.g[prop-1]+'</span><button class="btn sm" data-act="useprop" data-n="'+prop+'">Retenir cette note</button></div>'+
      '<p class="small muted">Vous pouvez aussi noter librement en vous référant à la grille ci-dessous.</p><div class="scale" role="radiogroup" aria-label="Note de 1 à 5">';
    D.g.forEach(function(g,k){ var id="n"+st+"_"+(k+1); h+='<label for="'+id+'"><input type="radio" name="note'+st+'" id="'+id+'" value="'+(k+1)+'"'+(d.notes[st]===k+1?" checked":"")+'><b>'+(k+1)+'</b><span>'+g+'</span>'+(prop===k+1?'<span class="prop">proposée</span>':'')+'</label>'; });
    h+='</div>'+(d.notes[st] && d.notes[st]!==prop ? '<p class="small" style="color:var(--warn)">Note libre différente de la note proposée : précisez pourquoi dans les observations.</p>' : '')+
      '<label class="f">Observations<textarea id="obs" data-obs="'+st+'" placeholder="Points forts, points faibles, mots du promoteur…">'+esc(d.obs[st]||"")+'</textarea></label></section>';
    h+='<div class="row between">'+(st>0?'<button class="btn" data-act="step" data-s="'+(st-1)+'">‹ Précédent</button>':'<span></span>')+'<button class="btn primary" data-act="step" data-s="'+(st+1)+'">'+(st===7?"Voir la synthèse ›":"Dimension suivante ›")+'</button></div>';
    return h;
  }
  var miss=[]; d.notes.forEach(function(n,i){ if(!n) miss.push(DIMS[i].court); });
  h+='<section class="card"><h2>Synthèse</h2>';
  if(miss.length) return h+'<p class="rule">Il manque la note de : <b>'+miss.join(", ")+'</b>. Complétez ces dimensions pour obtenir le segment.</p>'+radar(d.notes)+'</section>';
  var bl=[], ck=d.checks[IDX_GESTION]||{}; if(!ck.A0) bl.push("Journal de caisse tenu chaque jour"); if(!ck.A1) bl.push("Caisse de l'entreprise séparée de celle du ménage"); if(d.volets[0]!=="Obtenu") bl.push("Enregistrement de l'entreprise (NINEA, RCCM)");
  var sug=segment(d.notes,d.projet);
  h+='<div class="grid g2" style="align-items:center"><div>'+radar(d.notes)+'</div><div style="display:flex;flex-direction:column;gap:12px"><p>Moyenne : <b class="num" style="font-size:1.4rem">'+nf(moyenne(d.notes))+' / 5</b></p>'+
    (bl.length?'<div class="rule"><b class="ko">Critères bloquants non remplis :</b> '+bl.join(" ; ")+'. Ils passeront en tête du PDI.</div>':'<p class="small ok">Tous les critères bloquants sont remplis.</p>')+
    '<div><p class="small muted" style="margin-bottom:6px">Projet d\'investissement chiffré (devis ou montant précis) ?</p><div class="choice"><label><input type="radio" name="projet" value="1"'+(d.projet?" checked":"")+'>Oui</label><label><input type="radio" name="projet" value="0"'+(!d.projet?" checked":"")+'>Non</label></div></div>'+
    '<p>Segment suggéré : '+segChip(sug)+'</p><p class="rule">'+segReason(d.notes,d.projet)+'</p>'+
    '<label class="f">Segment retenu par le conseiller (si différent)<select id="override"><option value="">Garder le segment suggéré</option>'+["A","B","C"].map(function(s){return '<option value="'+s+'"'+(d.override===s?" selected":"")+'>'+s+' · '+SEGLAB[s]+'</option>';}).join("")+'</select></label>'+
    (d.override && d.override!==sug ? '<label class="f">Justification du segment retenu<input type="text" id="overj" value="'+esc(d.overj||"")+'"></label>':'')+'</div></div></section>';
  h+='<section class="card"><h3>Points d\'attention propres au contexte local</h3><div class="checks">';
  Object.keys(ATT).forEach(function(k){ h+='<label for="at_'+k+'"><input type="checkbox" id="at_'+k+'" data-att="'+k+'"'+(d.att[k]?" checked":"")+'><span>'+ATT[k]+'</span></label>'; });
  h+='</div></section>';
  return h+'<div class="row between"><button class="btn" data-act="step" data-s="7">‹ Revenir aux dimensions</button><button class="btn primary" data-act="savediag">Enregistrer et générer le PDI ›</button></div>';
}
function startDiag(id){
  var e=byId(id); if(!e || !canEdit(e)){ toast("Cette entreprise ne vous est pas attribuée."); return; }
  var dr=getDraft(id);
  if(dr){ S.diag=dr; toast("Brouillon repris là où vous l'aviez laissé."); }
  else S.diag={id:e.id, step:0, notes:[0,0,0,0,0,0,0,0], checks:{}, volets:e.volets?e.volets.slice():VOLETS.map(function(){return "Non engagé";}),
    freins:(e.freins||[0,0,0,0,0]).slice(), att:Object.assign({},e.att||{}), obs:{}, projet:!!e.projet, override:null, overj:"", fin:Object.assign({source:"Déclaration orale"},e.fin||{}), rep:{}};
  S.id=e.id; go("diag");
}
function saveDiag(){
  var d=S.diag, e=byId(d.id), sug=segment(d.notes,d.projet);
  e.notes=d.notes.slice(); e.projet=d.projet; e.fin=Object.assign({},d.fin); e.rep=JSON.parse(JSON.stringify(d.rep));
  e.volets=d.volets.slice(); e.freins=d.freins.slice(); e.att=Object.assign({},d.att);
  e.override=(d.override&&d.override!==sug)?d.override:null; e.overj=e.override?d.overj:""; e.diagDate=TODAY;
  e.obs=d.obs; e.checks=d.checks;
  e.diags=(e.diags||[]).concat([{date:TODAY, auteur:ME.email, notes:e.notes.slice(), segment:segOf(e), volets:e.volets.slice(), ca:e.fin&&e.fin.caMois!=null?e.fin.caMois:null}]);
  e.pdi=genPDI(e, segOf(e)); e.pdiValide=null; e.objectif="";
  saveEnt(e); dropDraft(d.id);
  journal("diagnostic", e, "Diagnostic 360° réalisé · moyenne "+nf(moyenne(e.notes))+" · segment "+segOf(e)+" · PDI de "+e.pdi.length+" action(s) généré");
  S.diag=null; toast("Diagnostic enregistré, PDI généré."); go("pdi", e.id);
}

/* ================= PDI ================= */
function adder(key, dim){
  if(S.addFor!==key) return '<button class="btn ghost sm" data-act="openadd" data-k="'+key+'">+ Ajouter une action pour cette dimension</button>';
  var opts=LIB.filter(function(l){return l.actif && l.dim===dim;});
  return '<div class="rule" style="display:flex;flex-direction:column;gap:8px"><b>Ajouter une action · '+DIMS[dim].nom+'</b>'+
    '<select id="addsel" aria-label="Action de la bibliothèque">'+opts.map(function(l){return '<option value="'+esc(l.id)+'">'+NATURES[l.nature]+' · '+modShort(l.module)+' · '+esc(l.action)+'</option>';}).join("")+'</select>'+
    '<div class="row"><button class="btn sm primary" data-act="addfrom" data-dim="'+dim+'" data-k="'+key+'">Ajouter cette action</button><button class="btn sm" data-act="addfree" data-dim="'+dim+'" data-k="'+key+'">Saisir une action libre</button><button class="btn sm ghost" data-act="closeadd">Annuler</button></div></div>';
}
function vPDI(){
  var e=byId(S.id); if(!e||!e.pdi) return '<p>PDI introuvable.</p>';
  var s=segOf(e), rd=!canEdit(e), dis=rd?" disabled":"";
  var h='<button class="linkbtn" data-act="fiche" data-id="'+esc(e.id)+'">‹ Retour à la fiche</button>';
  h+='<div class="row between"><div><p class="eyebrow">Plan de Développement Individuel · '+esc(e.id)+'</p><h1>'+esc(e.nom)+'</h1><div class="row" style="margin-top:6px">'+segChip(s)+'<span class="small muted">'+(e.pdiValide?"Validé le "+fd(e.pdiValide):"Brouillon généré à partir du diagnostic du "+fd(e.diagDate))+'</span></div></div>'+
    '<div class="row"><button class="btn" data-act="printpdi">Imprimer / PDF</button>'+(e.pdiValide||rd?'':'<button class="btn primary" data-act="validpdi">Valider le PDI</button>')+'</div></div>';
  h+='<section class="card"><label class="f">Objectif général à 12 mois<input type="text" id="obj" value="'+esc(e.objectif)+'" placeholder="Une phrase, dans les mots du promoteur"'+dis+'></label>'+
    '<p class="small muted">Les actions viennent de la bibliothèque : critères bloquants d\'abord, puis dimensions les plus faibles, avec au moins une action à effet rapide. Les dates et durées sont libres.</p></section>';
  e.pdi.forEach(function(p,i){
    h+='<div class="pdi-item"><div class="head"><div class="row"><span class="tag">'+DIMS[p.dim].nom+' · note '+e.notes[p.dim]+'</span>'+natTag(p.nature)+typeTag(p.type)+'</div>'+(rd?'':'<button class="btn ghost danger sm" data-act="delpdi" data-i="'+i+'">Retirer</button>')+'</div>'+
      '<label class="f full">Formation recommandée<select data-p="'+i+'" data-k="module"'+dis+'>'+Object.keys(MOD).map(function(k){return '<option value="'+k+'"'+(p.module===k?" selected":"")+'>'+esc(MOD[k])+'</option>';}).join("")+'</select></label>'+
      '<div class="reco">'+esc(p.reco)+'</div>'+
      '<label class="f full">Action pratique<textarea data-p="'+i+'" data-k="action"'+dis+'>'+esc(p.action)+'</textarea></label>'+
      '<label class="f full">Outil ou modèle fourni<input type="text" data-p="'+i+'" data-k="outil" value="'+esc(p.outil||"")+'" placeholder="Ex. : journal de caisse (modèle TAXAWU M1)"'+dis+'></label>'+
      '<label class="f">Modalité<input type="text" data-p="'+i+'" data-k="modalite" value="'+esc(p.modalite)+'"'+dis+'></label>'+
      '<label class="f">Partenaire<input type="text" data-p="'+i+'" data-k="partenaire" value="'+esc(p.partenaire)+'"'+dis+'></label>'+
      '<label class="f">Début<input type="date" data-p="'+i+'" data-k="debut" value="'+p.debut+'"'+dis+'></label>'+
      '<div class="f"><span>Durée</span><div class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" min="1" style="width:80px" aria-label="Durée" data-p="'+i+'" data-k="duree" value="'+p.duree+'"'+dis+'><select aria-label="Unité" data-p="'+i+'" data-k="unite"'+dis+'>'+UNITES.map(function(u){return '<option'+(u===p.unite?" selected":"")+'>'+u+'</option>';}).join("")+'</select></div></div>'+
      '<label class="f">Échéance<input type="date" data-p="'+i+'" data-k="echeance" value="'+p.echeance+'"'+dis+'></label>'+
      '<label class="f">Statut<select data-p="'+i+'" data-k="statut"'+dis+'>'+["À faire","En cours","Fait"].map(function(x){return '<option'+(x===p.statut?" selected":"")+'>'+x+'</option>';}).join("")+'</select></label>'+
      '<label class="f full">Livrable vérifiable<input type="text" data-p="'+i+'" data-k="livrable" value="'+esc(p.livrable)+'"'+dis+'></label>'+
      (rd?'':'<div class="full">'+adder("i"+i, p.dim)+'</div>')+'</div>'; });
  if(!rd){ var present={}; e.pdi.forEach(function(p){present[p.dim]=1;});
    h+='<section class="card"><h3>Ajouter une action pour une autre dimension</h3><div style="display:flex;flex-direction:column;gap:8px">';
    DIMS.forEach(function(D,i){ if(present[i]) return; h+='<div style="border-bottom:1px solid var(--line);padding:6px 0"><b>'+D.nom+'</b> <span class="small muted">note '+e.notes[i]+'</span></div>'+adder("d"+i, i); });
    h+='</div></section>'; }
  return h+'<section class="card"><h3>Engagements et signatures</h3><p class="small">L\'entreprise suit les formations recommandées, met en place les outils prévus, reçoit la visite mensuelle et partage ses chiffres. Le CADE assure le coaching, les formations et la mise en relation, et respecte la confidentialité. Le document imprimé comporte les cases de signature du promoteur, du conseiller et du chef de service.</p></section>';
}
function pdiPrintHTML(e){
  var h='<div class="report"><p class="muted">'+esc(CFG.nomStructure)+' · '+esc(CFG.nomApplication)+'</p><h1>Plan de Développement Individuel</h1>'+
    '<p><b>'+esc(e.nom)+'</b> · matricule '+esc(e.id)+' · promoteur : '+esc(e.prom)+' · '+esc(e.commune)+'</p>'+
    '<p>Segment : '+(segOf(e)||"—")+' · '+(SEGLAB[segOf(e)]||"")+' · diagnostic du '+fd(e.diagDate)+' (moyenne '+nf(moyenne(e.notes))+' / 5) · conseiller : '+esc(membreNom(e.conseiller))+'</p>'+
    '<p><b>Objectif général à 12 mois :</b> '+esc(e.objectif||"…………………………………………")+'</p>'+
    '<table><thead><tr><th>N°</th><th>Formation recommandée et action</th><th>Outil ou modèle</th><th>Livrable</th><th>Partenaire</th><th>Début</th><th>Échéance</th></tr></thead><tbody>';
  e.pdi.forEach(function(p,i){ h+='<tr><td>'+(i+1)+'</td><td><b>'+esc(p.reco)+'</b><br>'+esc(p.action)+'</td><td>'+esc(p.outil||"")+'</td><td>'+esc(p.livrable)+'</td><td>'+esc(p.partenaire)+'</td><td>'+fd(p.debut)+'</td><td>'+fd(p.echeance)+'</td></tr>'; });
  h+='</tbody></table><h2>Engagements réciproques</h2><p>L\'entreprise s\'engage à suivre les formations recommandées, mettre en place les outils prévus, recevoir la visite mensuelle du conseiller et partager ses chiffres d\'activité. La CCIAK s\'engage à assurer le coaching, les formations prévues et la mise en relation avec les partenaires, et à respecter la confidentialité des informations communiquées.</p>'+
    '<div class="sign"><div>Le promoteur<br>Nom, date et signature</div><div>Le conseiller référent<br>Nom, date et signature</div><div>Visa du chef de service</div></div></div>';
  return h;
}
function printHTML(html){ var p=document.getElementById("print"); p.innerHTML=html; document.body.classList.add("printing"); setTimeout(function(){ window.print(); setTimeout(function(){ document.body.classList.remove("printing"); },500); },100); }

/* ================= Visite ================= */
function vVisite(){
  var e=byId(S.id), d=S.vis;
  var h='<button class="linkbtn" data-act="fiche" data-id="'+esc(e.id)+'">‹ Retour à la fiche</button><div><p class="eyebrow">Visite de suivi · '+esc(e.id)+'</p><h1>'+esc(e.nom)+'</h1></div>';
  h+='<section class="card"><div class="grid g3"><label class="f">Date de la visite<input type="date" id="vdate" value="'+d.date+'"></label><label class="f">Prochaine visite prévue<input type="date" id="vnext" value="'+d.next+'"></label>'+
    '<label class="f">Chiffre d\'affaires du mois écoulé (FCFA, si donné)<input type="number" min="0" step="1000" id="vca" value="'+(d.ca||"")+'"></label></div>'+
    (e.fin&&e.fin.caMois?'<p class="small muted">Référence au diagnostic : '+money(e.fin.caMois)+' par mois.</p>':'')+'</section>';
  h+='<section class="card"><h3>Avancement des actions du PDI</h3><p class="small muted">Vérifiez chaque livrable sur place avant de changer son statut.</p>';
  (e.pdi||[]).forEach(function(p,i){ h+='<div class="row between" style="flex-wrap:nowrap;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line)"><div style="min-width:0"><b>'+esc(p.action)+'</b><div class="small muted">'+(p.nature?NATURES[p.nature]+' · ':'')+modShort(p.module)+' · livrable : '+esc(p.livrable)+' · échéance '+fd(p.echeance)+(p.statut!=="Fait"&&p.echeance<TODAY?' <b class="ko">(en retard)</b>':'')+'</div></div><select data-vs="'+i+'" style="width:auto;flex:none" aria-label="Statut">'+["À faire","En cours","Fait"].map(function(x){return '<option'+(x===d.statuts[i]?" selected":"")+'>'+x+'</option>';}).join("")+'</select></div>'; });
  h+='</section><section class="card"><h3>Appréciation globale</h3><div class="choice">'+["Vert","Orange","Rouge"].map(function(f){return '<label><input type="radio" name="vfeu" value="'+f+'"'+(d.feu===f?" checked":"")+'>'+feuChip(f)+'</label>';}).join("")+'</div>'+
    '<p class="small muted">Vert : dans les temps · Orange : retard rattrapable · Rouge : blocage.</p><label class="f">Observations et obstacles rencontrés<textarea id="vobs" placeholder="Ce qui a avancé, ce qui bloque, ce que le promoteur demande…">'+esc(d.obs)+'</textarea></label></section>';
  return h+'<div class="row between"><span></span><button class="btn primary" data-act="savevisite">Enregistrer la visite</button></div>';
}

/* ================= Tâches ================= */
function vTaches(){
  var L=TACHES.slice();
  if(!isOwner()) L=L.filter(function(t){ return t.assigneA===ME.email || t.creePar===ME.email; });
  if(S.tf.statut==="ouvertes") L=L.filter(function(t){return t.statut!=="Fait";}); else if(S.tf.statut==="faites") L=L.filter(function(t){return t.statut==="Fait";});
  if(S.tf.qui) L=L.filter(function(t){return t.assigneA===S.tf.qui;});
  L.sort(function(a,b){ return (a.statut==="Fait")-(b.statut==="Fait") || ((a.echeance||"9")<(b.echeance||"9")?-1:1); });
  var h='<div class="row between"><div><p class="eyebrow">'+(isOwner()?"Attribution et suivi":"Mes tâches")+'</p><h1>Tâches</h1></div>'+(isOwner()?'<button class="btn primary" data-act="newtask">+ Nouvelle tâche</button>':'')+'</div>';
  if(S.newTask) h+=vTaskForm();
  h+='<div class="card"><div class="filters" style="grid-template-columns:1fr 1fr"><label class="f">Afficher<select id="tfst"><option value="ouvertes"'+(S.tf.statut==="ouvertes"?" selected":"")+'>Tâches ouvertes</option><option value="faites"'+(S.tf.statut==="faites"?" selected":"")+'>Tâches terminées</option><option value=""'+(!S.tf.statut?" selected":"")+'>Toutes</option></select></label>'+
    (isOwner()?'<label class="f">Attribuée à<select id="tfqui"><option value="">Tout le monde</option>'+conseillers().map(function(c){return '<option value="'+esc(c.email)+'"'+(S.tf.qui===c.email?" selected":"")+'>'+esc(c.email===OWNER?"Moi":(c.nom||c.email))+'</option>';}).join("")+'</select></label>':'<div></div>')+'</div></div>';
  if(!L.length) h+='<p class="empty">Aucune tâche à afficher.</p>';
  L.forEach(function(t){ var late=t.statut!=="Fait" && t.echeance && t.echeance<TODAY, mine=t.assigneA===ME.email||isOwner();
    h+='<div class="task'+(late?" late":"")+(t.statut==="Fait"?" done":"")+'"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><b>'+esc(t.titre)+'</b><div class="small muted">'+esc(t.type)+(t.entrepriseNom?' · <a href="#" data-act="fiche" data-id="'+esc(t.entrepriseId)+'">'+esc(t.entrepriseNom)+'</a>':'')+' · attribuée à '+esc(court(t.assigneA))+' par '+esc(court(t.creePar))+' · échéance '+fd(t.echeance)+(late?' <b class="ko">en retard</b>':'')+'</div>'+(t.description?'<p class="small">'+esc(t.description)+'</p>':'')+'</div>'+
      (mine?'<select data-tst="'+esc(t.id)+'" style="width:auto" aria-label="Statut">'+["À faire","En cours","Fait"].map(function(x){return '<option'+(x===t.statut?" selected":"")+'>'+x+'</option>';}).join("")+'</select>':stat(t.statut))+'</div>'+
      (mine?'<input type="text" data-tcom="'+esc(t.id)+'" value="'+esc(t.commentaire||"")+'" placeholder="Commentaire ou compte rendu (enregistré en quittant le champ)">':(t.commentaire?'<p class="small">'+esc(t.commentaire)+'</p>':''))+
      (t.dateFait?'<p class="small muted">Terminée le '+fd(t.dateFait)+'</p>':'')+
      (isOwner()?'<div class="row"><button class="btn ghost danger sm" data-act="deltask" data-id="'+esc(t.id)+'">Supprimer la tâche</button></div>':'')+'</div>'; });
  return h;
}
function vTaskForm(){
  var t=S.newTask;
  var ents=ENT.slice().sort(function(a,b){return a.nom<b.nom?-1:1;});
  return '<section class="editor"><h3 class="full">Nouvelle tâche</h3>'+
    '<label class="f full">Titre<input type="text" id="tk_titre" value="'+esc(t.titre)+'" placeholder="Ex. : Réaliser le diagnostic 360°"></label>'+
    '<label class="f">Type<select id="tk_type">'+TYPES_TACHE.map(function(x){return '<option'+(t.type===x?" selected":"")+'>'+x+'</option>';}).join("")+'</select></label>'+
    '<label class="f">Attribuée à<select id="tk_qui">'+conseillers().map(function(c){return '<option value="'+esc(c.email)+'"'+(t.assigneA===c.email?" selected":"")+'>'+esc(c.email===OWNER?"Moi":(c.nom||c.email))+'</option>';}).join("")+'</select></label>'+
    '<label class="f">Échéance<input type="date" id="tk_ech" value="'+esc(t.echeance)+'"></label>'+
    '<label class="f full">Entreprise concernée (facultatif)<select id="tk_ent"><option value="">Aucune</option>'+ents.map(function(e){return '<option value="'+esc(e.id)+'"'+(t.entrepriseId===e.id?" selected":"")+'>'+esc(e.nom)+' · '+esc(e.id)+'</option>';}).join("")+'</select></label>'+
    '<label class="full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="tk_attr"'+(t.attribuer?" checked":"")+'> Attribuer aussi l\'entreprise à ce conseiller (il pourra la diagnostiquer et suivre son PDI)</label>'+
    '<label class="f full">Consignes<textarea id="tk_desc">'+esc(t.description)+'</textarea></label>'+
    '<div class="full row between"><button class="btn ghost" data-act="canceltask">Annuler</button><button class="btn primary" data-act="savetask">Attribuer la tâche</button></div></section>';
}

/* ================= Rapports ================= */
var MOISN=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
function periode(r){
  var y=r.annee, a, b, lab, f;
  function fin(yy,mm){ return new Date(Date.UTC(yy,mm,0)).toISOString().slice(0,10); }
  if(r.type==="mois"){ a=y+"-"+String(r.idx).padStart(2,"0")+"-01"; b=fin(y,r.idx); lab=MOISN[r.idx-1]+" "+y+" (rapport mensuel)"; f=y+"-"+String(r.idx).padStart(2,"0"); }
  else if(r.type==="trimestre"){ var m0=(r.idx-1)*3+1; a=y+"-"+String(m0).padStart(2,"0")+"-01"; b=fin(y,m0+2); lab=["1er","2e","3e","4e"][r.idx-1]+" trimestre "+y+" (rapport trimestriel)"; f=y+"-T"+r.idx; }
  else if(r.type==="semestre"){ var s0=r.idx===1?1:7; a=y+"-"+String(s0).padStart(2,"0")+"-01"; b=fin(y,s0+5); lab=(r.idx===1?"1er":"2e")+" semestre "+y+" (rapport semestriel)"; f=y+"-S"+r.idx; }
  else { a=y+"-01-01"; b=y+"-12-31"; lab="Année "+y+" (rapport annuel)"; f=String(y); }
  return {debut:a, fin:b, label:lab, fichier:f};
}
var JTYPES={entreprise_creee:"Nouvelle entreprise", entreprise_modifiee:"Fiche modifiée", import:"Import", diagnostic:"Diagnostic", pdi_valide:"PDI validé", action_faite:"Action réalisée", visite:"Visite de suivi", tache_creee:"Tâche attribuée", tache_faite:"Tâche terminée", membre:"Équipe", attribution:"Attribution"};
function calcRapport(){
  var P=periode(S.rap), inP=function(d){ return d && String(d).slice(0,10)>=P.debut && String(d).slice(0,10)<=P.fin; };
  var R={P:P, nouv:0, diags:[], pdiVal:0, actFaites:0, actRetard:0, actEnCours:0, visites:0, feux:{Vert:0,Orange:0,Rouge:0}, caVar:[], tCrees:0, tFaites:0, tRetard:0, besoins:{}, cons:{}, seg:{A:0,B:0,C:0}, volets:VOLETS.map(function(){return {o:0,app:0};}), formalisees:0};
  function C(em){ return R.cons[em]=R.cons[em]||{d:0,v:0,a:0,t:0}; }
  ENT.forEach(function(e){
    if(inP(e.dateIns)) R.nouv++;
    (e.diags||[]).forEach(function(d){ if(inP(d.date)){ R.diags.push({e:e,d:d}); C(d.auteur).d++; } });
    if(inP(e.pdiValide)) R.pdiVal++;
    var dv=null; (e.visites||[]).forEach(function(v){ if(inP(v.date)){ R.visites++; C(v.auteur).v++; dv=v; if(v.ca && e.fin && e.fin.caMois) R.caVar.push((v.ca/e.fin.caMois-1)*100); } });
    if(dv) R.feux[dv.feu]=(R.feux[dv.feu]||0)+1;
    (e.pdi||[]).forEach(function(p){
      if(p.statut==="Fait" && inP(p.dateFait)){ R.actFaites++; C(p.faitPar||e.conseiller).a++; }
      if(p.statut!=="Fait" && p.echeance<=P.fin && p.echeance<TODAY) R.actRetard++;
      if(p.statut!=="Fait" && p.debut<=P.fin){ R.actEnCours++; if(p.module && p.module!=="CI") R.besoins[p.module]=(R.besoins[p.module]||0)+1; }
    });
    if(e.notes){ R.seg[segOf(e)]++; (e.volets||[]).forEach(function(s,i){ if(s!=="Non applicable"){ R.volets[i].app++; if(s==="Obtenu") R.volets[i].o++; } }); }
  });
  TACHES.forEach(function(t){ if(inP(t.dateCreation)) R.tCrees++; if(t.statut==="Fait" && inP(t.dateFait)){ R.tFaites++; C(t.assigneA).t++; } if(t.statut!=="Fait" && t.echeance && t.echeance<=P.fin && t.echeance<TODAY) R.tRetard++; });
  R.journal=JOURNAL.filter(function(j){ return inP(j.jour); }).sort(function(a,b){ return a.date<b.date?-1:1; }).map(function(j){ j.typeLabel=JTYPES[j.type]||j.type; return j; });
  R.entDiag={}; R.diags.forEach(function(x){ R.entDiag[x.e.id]=1; });
  var caMoy=R.caVar.length? Math.round(R.caVar.reduce(function(a,b){return a+b;},0)/R.caVar.length) : null;
  R.caMoy=caMoy;
  R.indicateurs=[["Entreprises du portefeuille",ENT.length],["Nouvelles entreprises inscrites sur la période",R.nouv],["Diagnostics 360° réalisés",R.diags.length],["Entreprises diagnostiquées (distinctes)",Object.keys(R.entDiag).length],
    ["PDI validés",R.pdiVal],["Visites de suivi réalisées",R.visites],["Actions du PDI réalisées",R.actFaites],["Actions du PDI en cours",R.actEnCours],["Actions du PDI en retard",R.actRetard],
    ["Évolution moyenne du CA mensuel relevé (%)",caMoy==null?"—":caMoy],["Tâches attribuées",R.tCrees],["Tâches terminées",R.tFaites],["Tâches en retard",R.tRetard]];
  R.besoinsL=Object.keys(R.besoins).sort(function(a,b){return R.besoins[b]-R.besoins[a];}).map(function(k){ return [MOD[k], R.besoins[k]]; });
  R.besoins=R.besoinsL;
  R.parConseiller=Object.keys(R.cons).filter(Boolean).map(function(k){ var c=R.cons[k]; return [membreNom(k), c.d, c.v, c.a, c.t]; });
  R.fichier=P.fichier;
  return R;
}
function rapportHTML(R, impression){
  var P=R.P, h='<div class="report">';
  if(impression) h+='<p class="muted">'+esc(CFG.nomStructure)+' · '+esc(CFG.nomApplication)+'</p><h1>Rapport d\'activités d\'accompagnement</h1>';
  h+='<p><b>'+esc(P.label)+'</b> · du '+fd(P.debut)+' au '+fd(P.fin)+' · établi le '+fd(TODAY)+' par '+esc(membreNom(ME.email))+'</p>';
  var fm=[];
  fm.push(R.diags.length+" diagnostic(s) 360° réalisé(s) sur "+Object.keys(R.entDiag).length+" entreprise(s)");
  fm.push(R.visites+" visite(s) de suivi");
  fm.push(R.actFaites+" action(s) du PDI réalisée(s), "+R.actRetard+" en retard");
  if(R.pdiVal) fm.push(R.pdiVal+" PDI validé(s)");
  if(R.caMoy!=null) fm.push("évolution moyenne du chiffre d'affaires mensuel relevé : "+(R.caMoy>=0?"+":"")+R.caMoy+" % par rapport au diagnostic");
  if(R.tCrees||R.tFaites) fm.push(R.tFaites+" tâche(s) terminée(s) sur "+R.tCrees+" attribuée(s)");
  h+='<h2>Faits marquants</h2><p>Sur la période, l\'accompagnement a porté sur '+fm.join(" ; ")+'.</p>';
  h+='<h2>Indicateurs de la période</h2><div class="'+(impression?"kpis":"grid g4")+'">'+R.indicateurs.slice(1,9).map(function(i){ return impression?'<div><b>'+i[1]+'</b><br>'+esc(i[0])+'</div>':kpi(i[1],i[0]); }).join("")+'</div>';
  h+='<div class="tablewrap"><table><thead><tr><th>Indicateur</th><th class="num">Valeur</th></tr></thead><tbody>'+R.indicateurs.map(function(i){ return '<tr><td>'+esc(i[0])+'</td><td class="num">'+esc(i[1])+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='<h2>Situation du portefeuille en fin de période</h2><div class="tablewrap"><table><thead><tr><th>Segment</th><th class="num">Entreprises</th></tr></thead><tbody>'+["A","B","C"].map(function(s){ return '<tr><td>'+s+' · '+SEGLAB[s]+'</td><td class="num">'+R.seg[s]+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='<div class="tablewrap"><table><thead><tr><th>Formalisation (volets FVE)</th><th class="num">Obtenu / concernées</th></tr></thead><tbody>'+VOLETS.map(function(V,i){ return '<tr><td>'+V.nom+'</td><td class="num">'+R.volets[i].o+' / '+R.volets[i].app+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='<div class="tablewrap"><table><thead><tr><th>Appréciation à la dernière visite de la période</th><th class="num">Entreprises</th></tr></thead><tbody>'+["Vert","Orange","Rouge"].map(function(f){ return '<tr><td>'+f+'</td><td class="num">'+(R.feux[f]||0)+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='<h2>Besoins de formation identifiés</h2>'+(R.besoins.length?'<div class="tablewrap"><table><thead><tr><th>Formation recommandée</th><th class="num">Entreprises</th></tr></thead><tbody>'+R.besoins.map(function(b){ return '<tr><td>'+esc(b[0])+'</td><td class="num">'+b[1]+'</td></tr>'; }).join("")+'</tbody></table></div>':'<p class="muted">Aucun besoin en cours.</p>');
  if(R.parConseiller.length>1 || MEMBRES.length) h+='<h2>Activités par conseiller</h2><div class="tablewrap"><table><thead><tr><th>Conseiller</th><th class="num">Diagnostics</th><th class="num">Visites</th><th class="num">Actions réalisées</th><th class="num">Tâches terminées</th></tr></thead><tbody>'+R.parConseiller.map(function(r){ return '<tr><td>'+esc(r[0])+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td></tr>'; }).join("")+'</tbody></table></div>';
  h+='<h2>Diagnostics réalisés</h2>'+(R.diags.length?'<div class="tablewrap"><table><thead><tr><th>Date</th><th>Entreprise</th><th class="num">Moyenne</th><th>Segment</th></tr></thead><tbody>'+R.diags.map(function(x){ return '<tr><td>'+fd(x.d.date)+'</td><td>'+esc(x.e.nom)+'</td><td class="num">'+nf(moyenne(x.d.notes))+'</td><td>'+(x.d.segment||"")+'</td></tr>'; }).join("")+'</tbody></table></div>':'<p class="muted">Aucun diagnostic sur la période.</p>');
  h+='<h2>Journal des activités</h2>'+(R.journal.length?'<div class="tablewrap"><table><thead><tr><th>Date</th><th>Activité</th><th>Entreprise</th><th>Détail</th><th>Par</th></tr></thead><tbody>'+R.journal.map(function(j){ return '<tr><td>'+fd(j.jour)+'</td><td>'+esc(j.typeLabel)+'</td><td>'+esc(j.entrepriseNom||"")+'</td><td>'+esc(j.texte)+'</td><td>'+esc(court(j.auteur))+'</td></tr>'; }).join("")+'</tbody></table></div>':'<p class="muted">Aucune activité enregistrée sur la période.</p>');
  return h+'</div>';
}
function vRapports(){
  var r=S.rap, ys=[]; for(var y=Number(TODAY.slice(0,4)); y>=2024; y--) ys.push(y);
  var idxOpts = r.type==="mois" ? MOISN.map(function(m,i){ return [i+1,m]; }) : r.type==="trimestre" ? [[1,"1er trimestre"],[2,"2e trimestre"],[3,"3e trimestre"],[4,"4e trimestre"]] : r.type==="semestre" ? [[1,"1er semestre"],[2,"2e semestre"]] : [];
  var h='<div class="row between"><div><p class="eyebrow">Accompagnement et suivi</p><h1>Rapports d\'activités</h1></div><div class="row"><button class="btn" data-act="raprint">Imprimer / PDF</button><button class="btn" data-act="rapxls">Exporter en Excel</button></div></div>';
  h+='<div class="card"><div class="filters" style="grid-template-columns:1fr 1fr 1fr"><label class="f">Périodicité<select id="rtype">'+[["mois","Mensuel"],["trimestre","Trimestriel"],["semestre","Semestriel"],["annee","Annuel"]].map(function(o){ return '<option value="'+o[0]+'"'+(r.type===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></label>'+
    (idxOpts.length?'<label class="f">Période<select id="ridx">'+idxOpts.map(function(o){ return '<option value="'+o[0]+'"'+(r.idx===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></label>':'<div></div>')+
    '<label class="f">Année<select id="ran">'+ys.map(function(y){ return '<option'+(r.annee===y?" selected":"")+'>'+y+'</option>'; }).join("")+'</select></label></div></div>';
  return h+'<section class="card">'+rapportHTML(calcRapport(), false)+'</section>';
}

/* ================= Bibliothèque ================= */
function vBiblio(){
  var own=isOwner(), list=LIB.filter(function(l){ return (!S.bseg || l.segs.indexOf(S.bseg)>=0) && (!S.bnat || l.nature===S.bnat); });
  var h='<div class="row between"><div><p class="eyebrow">Référentiel '+(own?"modifiable":"en consultation")+'</p><h1>Bibliothèque d\'actions</h1></div></div>';
  h+='<p class="muted" style="max-width:75ch">L\'application puise ici pour générer chaque PDI. Chaque action est rattachée à un module TAXAWU PME ou à une unité FVE, précise sa nature et se déclenche selon la note, un volet de formalisation non obtenu, un frein ou un point d\'attention.'+(own?" Vos modifications s'appliquent aux PDI générés ensuite.":"")+'</p>';
  h+='<div class="card"><div class="filters"><label class="f">Nature d\'action<select id="bnat"><option value="">Toutes</option>'+Object.keys(NATURES).map(function(k){return '<option value="'+k+'"'+(S.bnat===k?" selected":"")+'>'+NATURES[k]+'</option>';}).join("")+'</select></label>'+
    '<label class="f">Segment<select id="bseg"><option value="">Tous</option>'+["A","B","C"].map(function(s){return '<option value="'+s+'"'+(S.bseg===s?" selected":"")+'>'+s+' · '+SEGLAB[s]+'</option>';}).join("")+'</select></label><div class="small muted" style="align-self:end">'+list.length+' action(s) · '+LIB.filter(function(l){return l.actif;}).length+' active(s)</div></div></div>';
  DIMS.forEach(function(D,di){
    var rows=list.filter(function(l){return l.dim===di;});
    h+='<section class="card"><div class="row between"><div><h2>'+D.nom+'</h2><div class="row" style="margin-top:4px">'+D.mods.map(function(m){return '<span class="tag">'+modShort(m)+'</span>';}).join("")+'</div></div>'+(own?'<button class="btn sm primary" data-act="libnew" data-dim="'+di+'">+ Ajouter une action</button>':'')+'</div>';
    if(S.edit && S.edit.dim===di) h+=libEditor();
    if(!rows.length) h+='<p class="empty">Aucune action pour ces filtres.</p>';
    rows.forEach(function(l){
      h+='<div class="lib-row'+(l.actif?"":" inactive")+'"><div class="row between" style="align-items:flex-start"><div class="row">'+natTag(l.nature)+typeTag(l.type)+l.segs.map(function(s){return '<span class="seg '+s+'">'+s+'</span>';}).join("")+(l.actif?'':'<span class="tag off">désactivée</span>')+'</div>'+
        (own?'<div class="row"><button class="btn sm" data-act="libedit" data-id="'+esc(l.id)+'">Modifier</button><button class="btn sm ghost" data-act="libdup" data-id="'+esc(l.id)+'">Dupliquer</button><button class="btn sm ghost" data-act="libtog" data-id="'+esc(l.id)+'">'+(l.actif?"Désactiver":"Activer")+'</button></div>':'')+'</div>'+
        '<b>'+esc(recoText(l.module))+'</b><span>'+esc(l.action)+'</span>'+(l.outil?'<span class="small">Outil ou modèle : '+esc(l.outil)+'</span>':'')+
        '<span class="small muted">Se déclenche si : '+trigText(l)+' · Livrable : '+esc(l.livrable)+' · '+esc(l.modalite)+' · '+esc(l.partenaire)+' · durée indicative '+l.mois+' '+(l.unite||"mois")+'</span></div>'; });
    h+='</section>'; });
  return h;
}
function libEditor(){
  var l=S.edit, t=l.t;
  var h='<div class="editor"><h3 class="full">'+(libById(l.id)?"Modifier l'action":"Nouvelle action · "+DIMS[l.dim].nom)+'</h3>';
  h+='<label class="f">Dimension<select data-le="dim">'+DIMS.map(function(D,i){return '<option value="'+i+'"'+(l.dim===i?" selected":"")+'>'+D.nom+'</option>';}).join("")+'</select></label>';
  h+='<label class="f">Nature de l\'action<select data-le="nature">'+Object.keys(NATURES).map(function(k){return '<option value="'+k+'"'+(l.nature===k?" selected":"")+'>'+NATURES[k]+'</option>';}).join("")+'</select></label>';
  h+='<label class="f">Caractère<select data-le="type">'+Object.keys(TYPES).map(function(k){return '<option value="'+k+'"'+(l.type===k?" selected":"")+'>'+TYPES[k]+'</option>';}).join("")+'</select></label>';
  h+='<label class="f full">Formation recommandée<select data-le="module">'+Object.keys(MOD).map(function(k){return '<option value="'+k+'"'+(l.module===k?" selected":"")+'>'+esc(MOD[k])+'</option>';}).join("")+'</select></label>';
  h+='<div class="f full"><span class="small muted" style="font-weight:600">Segments visés</span><div class="choice">'+["A","B","C"].map(function(s){return '<label><input type="checkbox" data-leseg="'+s+'"'+(l.segs.indexOf(s)>=0?" checked":"")+'>'+s+' · '+SEGLAB[s]+'</label>';}).join("")+'</div></div>';
  h+='<label class="f">Se déclenche si la note est ≤<select data-le="tn"><option value="">(pas de condition de note)</option>'+[1,2,3,4].map(function(n){return '<option value="'+n+'"'+(t.n===n?" selected":"")+'>'+n+'</option>';}).join("")+'</select></label>';
  h+='<label class="f">ou si ce volet FVE n\'est pas obtenu<select data-le="tv"><option value="">(aucun)</option>'+VOLETS.map(function(V,i){return '<option value="'+i+'"'+(t.v===i?" selected":"")+'>'+V.nom+'</option>';}).join("")+'</select></label>';
  h+='<label class="f">ou si ce point d\'attention est coché<select data-le="ta"><option value="">(aucun)</option>'+Object.keys(ATT).map(function(k){return '<option value="'+k+'"'+(t.att===k?" selected":"")+'>'+ATT[k]+'</option>';}).join("")+'<option value="frein"'+(t.frein?" selected":"")+'>Un frein à la formalisation exprimé</option></select></label>';
  h+='<label class="f full">Action pratique<textarea data-le="action">'+esc(l.action)+'</textarea></label>';
  h+='<label class="f full">Outil ou modèle fourni<input type="text" data-le="outil" value="'+esc(l.outil||"")+'" placeholder="Ex. : plan de trésorerie sur 6 mois (modèle TAXAWU M4)"></label>';
  h+='<label class="f">Livrable vérifiable<input type="text" data-le="livrable" value="'+esc(l.livrable)+'"></label>';
  h+='<label class="f">Modalité<input type="text" data-le="modalite" value="'+esc(l.modalite)+'"></label>';
  h+='<label class="f">Partenaire<input type="text" data-le="partenaire" value="'+esc(l.partenaire)+'"></label>';
  h+='<div class="f"><span>Durée indicative (modifiable dans chaque PDI)</span><div class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" min="1" style="width:80px" aria-label="Durée" data-le="mois" value="'+l.mois+'"><select aria-label="Unité" data-le="unite">'+UNITES.map(function(u){return '<option'+(u===(l.unite||"mois")?" selected":"")+'>'+u+'</option>';}).join("")+'</select></div></div>';
  h+='<p class="full rule"><b>Aperçu dans le PDI :</b> '+esc(recoText(l.module))+'</p>';
  return h+'<div class="full row between"><button class="btn ghost" data-act="libcancel">Annuler</button><button class="btn primary" data-act="libsave">Enregistrer l\'action</button></div></div>';
}

/* ================= Équipe et partage ================= */
function vEquipe(){
  var h='<div><p class="eyebrow">'+(isOwner()?"Droits d'accès":"Votre accès")+'</p><h1>'+(isOwner()?"Équipe et partage":"Équipe et exports")+'</h1></div>';
  h+='<section class="card"><h2>Membres</h2><p class="muted">Chaque membre se connecte avec son compte Google. Un <b>conseiller</b> peut réaliser les diagnostics, suivre les PDI et faire les visites des entreprises qui lui sont attribuées, et recevoir des tâches. Un <b>lecteur</b> consulte tout sans rien modifier (hiérarchie, partenaires internes).</p>';
  h+='<div class="tablewrap"><table><thead><tr><th>Membre</th><th>Rôle</th><th class="hide-sm">Entreprises</th><th>Accès</th>'+(isOwner()?'<th></th>':'')+'</tr></thead><tbody>';
  h+='<tr><td><b>'+esc(OWNER)+'</b></td><td>Propriétaire</td><td class="hide-sm num">'+ENT.filter(function(e){return e.conseiller===OWNER;}).length+'</td><td><span class="ok">Actif</span></td>'+(isOwner()?'<td></td>':'')+'</tr>';
  MEMBRES.slice().sort(function(a,b){return a.email<b.email?-1:1;}).forEach(function(m){
    h+='<tr><td><b>'+esc(m.nom||m.email)+'</b><div class="small muted">'+esc(m.email)+'</div></td><td>'+(isOwner()?'<select data-mrole="'+esc(m.email)+'" style="width:auto"><option value="conseiller"'+(m.role==="conseiller"?" selected":"")+'>Conseiller</option><option value="lecteur"'+(m.role==="lecteur"?" selected":"")+'>Lecteur</option></select>':(m.role==="conseiller"?"Conseiller":"Lecteur"))+'</td>'+
      '<td class="hide-sm num">'+ENT.filter(function(e){return e.conseiller===m.email;}).length+'</td><td>'+(m.actif?'<span class="ok">Actif</span>':'<span class="ko">Suspendu</span>')+'</td>'+
      (isOwner()?'<td><div class="row"><button class="btn sm ghost" data-act="mtog" data-id="'+esc(m.email)+'">'+(m.actif?"Suspendre":"Réactiver")+'</button><button class="btn sm ghost danger" data-act="mdel" data-id="'+esc(m.email)+'">Retirer</button></div></td>':'')+'</tr>'; });
  h+='</tbody></table></div>';
  if(isOwner()) h+='<div class="grid g4" style="align-items:end"><label class="f">Nom<input type="text" id="m_nom" placeholder="Prénom et nom"></label><label class="f">Adresse Gmail<input type="email" id="m_mail" placeholder="nom@gmail.com"></label><label class="f">Rôle<select id="m_role"><option value="conseiller">Conseiller</option><option value="lecteur">Lecteur</option></select></label><div><button class="btn primary" data-act="madd">Ajouter le membre</button></div></div>'+
    '<p class="small muted">Retirer un membre ne supprime pas son travail : ses entreprises restent dans la base et peuvent être réattribuées.</p>';
  h+='</section>';
  h+='<section class="card"><h2>Exports</h2><div class="grid g3">'+
    '<div class="card" style="background:var(--surface-2)"><b>Export complet (Excel)</b><p class="small muted">Entreprises, diagnostics, PDI, visites, tâches, bibliothèque et équipe, une feuille par type. À faire chaque mois pour l\'archive du CADE.</p><button class="btn sm" data-act="exportall">Télécharger</button></div>'+
    '<div class="card" style="background:var(--surface-2)"><b>Modèle Excel</b><p class="small muted">Les 11 colonnes de l\'export CCIAK suivies des colonnes du CADE, pour enregistrer des entreprises en série.</p><button class="btn sm" data-act="modele">Télécharger</button></div>'+
    '<div class="card" style="background:var(--surface-2)"><b>Rapport d\'activités</b><p class="small muted">Mensuel, trimestriel, semestriel ou annuel, à imprimer en PDF ou exporter en Excel.</p><button class="btn sm" data-act="go" data-v="rapports">Ouvrir les rapports</button></div></div></section>';
  h+='<section class="card"><h2>Mon compte</h2><p class="small">Connecté avec <b>'+esc(ME.email)+'</b> · rôle : '+({proprietaire:"propriétaire",conseiller:"conseiller",lecteur:"lecteur"}[ME.role])+(DB.mode==="local"?" · <b>mode local</b> (les données restent sur cet appareil ; renseignez js/config.js pour activer la base en ligne)":"")+'.</p><div class="row"><button class="btn" data-act="signout">Se déconnecter</button></div></section>';
  return h;
}

/* ================= Rendu ================= */
function render(){
  var app=document.getElementById("app"), shell=document.getElementById("shell"), out=document.getElementById("outside");
  if(DB.mode==="firebase" && !DB.user){ shell.hidden=true; out.hidden=false; out.innerHTML=vLogin(); return; }
  if(!ME){ shell.hidden=true; out.hidden=false; out.innerHTML='<div class="login"><div class="card"><p>Chargement…</p></div></div>'; return; }
  if(ME.role==="aucun"){ shell.hidden=true; out.hidden=false; out.innerHTML=vRefus(ME.m); return; }
  shell.hidden=false; out.hidden=true; out.innerHTML="";
  var v=S.view, html;
  try{
    if(v==="tableau") html=vTableau(); else if(v==="entreprises") html=vEntreprises(); else if(v==="newent") html=vEntForm(); else if(v==="fiche") html=vFiche();
    else if(v==="diag") html=S.diag?vDiag():vDiagPick(); else if(v==="pdi") html=vPDI(); else if(v==="visite") html=vVisite(); else if(v==="taches") html=vTaches();
    else if(v==="rapports") html=vRapports(); else if(v==="biblio") html=vBiblio(); else html=vEquipe();
  }catch(err){ console.error(err); html='<section class="card"><h2>Erreur d\'affichage</h2><p class="small">'+esc(err.message)+'</p><button class="btn" data-act="go" data-v="tableau">Retour au tableau de bord</button></section>'; }
  if(ME.role==="lecteur") html='<p class="ro-banner">Accès en lecture seule : vous consultez le portefeuille sans pouvoir le modifier.</p>'+html;
  app.innerHTML=html;
  var top={fiche:"entreprises",pdi:"entreprises",visite:"entreprises",newent:"entreprises"}[v]||v, nb=mesTachesOuvertes().length;
  var items=navItems().map(function(n){ return '<button data-act="go" data-v="'+n[0]+'"'+(top===n[0]?' aria-current="page"':'')+'>'+IC[n[0]]+'<span>'+n[1]+'</span>'+(n[0]==="taches"&&nb?'<span class="badge">'+nb+'</span>':'')+'</button>'; }).join("");
  document.getElementById("nav").innerHTML=items;
  document.getElementById("tabbar").innerHTML=navItems().map(function(n){ return '<button data-act="go" data-v="'+n[0]+'"'+(top===n[0]?' aria-current="page"':'')+'>'+IC[n[0]]+'<span>'+n[2]+(n[0]==="taches"&&nb?" ("+nb+")":"")+'</span></button>'; }).join("");
  document.getElementById("userbox").innerHTML='<b>'+esc(ME.nom||ME.email)+'</b><span class="role">'+({proprietaire:"Propriétaire",conseiller:"Conseiller",lecteur:"Lecteur"}[ME.role])+'</span>';
  if(v==="entreprises"){ var a=document.getElementById("fseg"); if(a) a.value=S.f.seg; a=document.getElementById("ffeu"); if(a) a.value=S.f.feu; a=document.getElementById("fcons"); if(a) a.value=S.f.cons; }
  status(); S.stale=false;
}
function status(){
  var sy=document.getElementById("sync"); if(!sy) return;
  var txt, off=false;
  if(DB.mode==="local"){ txt="Mode local · données sur cet appareil"; off=true; }
  else if(!DB.online){ txt="Hors ligne · enregistré sur l'appareil"; off=true; }
  else if(DB.pending){ txt="Envoi des modifications…"; off=true; }
  else txt="En ligne · synchronisé";
  sy.className="pill sync"+(off?" off":""); sy.querySelector("span").textContent=txt;
}
function go(v,id){ S.addFor=null; S.confirmDel=null; S.view=v; if(id) S.id=id; render(); window.scrollTo(0,0); }

/* ================= Données : écoute ================= */
function refresh(){ if(EDIT_VIEWS.indexOf(S.view)>=0 || (S.view==="biblio"&&S.edit) || (S.view==="taches"&&S.newTask) || (S.view==="entreprises"&&S.imp) || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))){ S.stale=true; status(); return; } render(); }
DB.listen("entreprises", function(docs){ ENT=docs.map(function(d){ d.id=d.id||d._id; return d; }); LOADED.entreprises=true; refresh(); });
DB.listen("membres", function(docs){ MEMBRES=docs.map(function(d){ d.email=d.email||d._id; return d; }); LOADED.membres=true; if(ME && ME.role!=="proprietaire"){ var m=MEMBRES.filter(function(x){return x.email===ME.email;})[0]; if(m){ ME.role=m.actif?m.role:"aucun"; ME.nom=m.nom||ME.nom; } } refresh(); });
DB.listen("taches", function(docs){ TACHES=docs.map(function(d){ d.id=d.id||d._id; return d; }); refresh(); });
DB.listen("journal", function(docs){ JOURNAL=docs; refresh(); });
DB.listen("bibliotheque", function(docs){
  if(!docs.length){ LIB=JSON.parse(JSON.stringify(LIB_DEFAUT)); if(isOwner() && !LOADED.seeded){ LOADED.seeded=true; LIB.forEach(function(l){ DB.save("bibliotheque", l.id, l); }); } }
  else LIB=docs.map(function(d){ d.id=d.id||d._id; delete d._id; return d; }).sort(function(a,b){ return (a.ordre||0)-(b.ordre||0) || (a.id<b.id?-1:1); });
  refresh(); });
DB.onStatus(status);
DB.onUser(function(u, m){
  if(!u){ ME=null; render(); return; }
  var role = (m && m.role==="proprietaire") ? "proprietaire" : (m && m.actif ? m.role : "aucun");
  ME={email:u.email, nom:(m&&m.nom)||u.nom, role:role, m:m};
  render();
});

/* ================= Événements ================= */
document.addEventListener("click", function(ev){
  var t=ev.target.closest("[data-act]"); if(!t) return;
  var a=t.getAttribute("data-act"); if(t.tagName==="A") ev.preventDefault();
  if(a==="signin"){ DB.signIn().catch(function(e){ toast("Connexion impossible : "+(e&&e.message||e)); }); return; }
  if(a==="signout"){ DB.signOut(); return; }
  if(a==="go"){ if(t.getAttribute("data-v")==="diag") S.diag=null; S.edit=null; S.newTask=null; go(t.getAttribute("data-v")); }
  else if(a==="fiche"){ S.dup=null; go("fiche", t.getAttribute("data-id")); }
  else if(a==="modele"){ YKX.modeleVierge(); }
  else if(a==="exportall"){ YKX.exportTout(ENT, TACHES, LIB, MEMBRES); }
  else if(a==="closeimp"){ S.imp=null; render(); }
  else if(a==="doimport"){ appliquerImport(); }
  else if(a==="newent"){ S.newEnt={}; S.editId=null; S.dup=null; go("newent"); }
  else if(a==="editent"){ var ee=byId(t.getAttribute("data-id")); S.editId=ee.id; S.newEnt={}; ENT_FIELDS.forEach(function(f){ S.newEnt[f[0]]=ee[f[0]]; }); S.dup=null; go("newent"); }
  else if(a==="savent"){ saveEntForm(!!t.getAttribute("data-force")); }
  else if(a==="askdel"){ S.confirmDel=t.getAttribute("data-id"); render(); }
  else if(a==="canceldel"){ S.confirmDel=null; render(); }
  else if(a==="delent"){ var de=byId(t.getAttribute("data-id")); DB.del("entreprises", de.id); journal("entreprise_modifiee", de, "Entreprise supprimée"); ENT=ENT.filter(function(x){return x.id!==de.id;}); toast("Entreprise supprimée."); go("entreprises"); }
  else if(a==="newdiag"){ startDiag(t.getAttribute("data-id")); }
  else if(a==="resetdiag"){ var rid=S.diag.id; dropDraft(rid); startDiag(rid); }
  else if(a==="step"){ S.diag.step=Number(t.getAttribute("data-s")); saveDraft(); render(); window.scrollTo(0,0); }
  else if(a==="wo"){ var k=t.getAttribute("data-k"); S.open[k]=!S.open[k]; render(); }
  else if(a==="useprop"){ S.diag.notes[S.diag.step]=Number(t.getAttribute("data-n")); saveDraft(); render(); }
  else if(a==="savediag"){ saveDiag(); }
  else if(a==="pdi"){ go("pdi", t.getAttribute("data-id")); }
  else if(a==="printpdi"){ printHTML(pdiPrintHTML(byId(S.id))); }
  else if(a==="delpdi"){ var e1=byId(S.id); e1.pdi.splice(Number(t.getAttribute("data-i")),1); saveEnt(e1); render(); }
  else if(a==="openadd"){ S.addFor=t.getAttribute("data-k"); render(); }
  else if(a==="closeadd"){ S.addFor=null; render(); }
  else if(a==="addfrom"||a==="addfree"){ var e3=byId(S.id), k2=t.getAttribute("data-k"), dim=Number(t.getAttribute("data-dim")), item;
    if(a==="addfrom"){ var sel=document.getElementById("addsel"); if(!sel||!sel.value){ toast("Aucune action dans la bibliothèque pour cette dimension : saisissez une action libre."); return; } item=libToItem(libById(sel.value), TODAY); }
    else item={lib:null, dim:dim, module:"CI", reco:recoText("CI"), action:"", livrable:"", modalite:"Coaching sur site", partenaire:"CADE", debut:TODAY, duree:3, unite:"mois", echeance:addDur(TODAY,3,"mois"), type:"complementaire", nature:"coaching", outil:"", statut:"À faire"};
    var pos=k2.charAt(0)==="i"?Number(k2.slice(1))+1:e3.pdi.length; e3.pdi.splice(pos,0,item); S.addFor=null; saveEnt(e3); render(); toast(a==="addfree"?"Action libre ajoutée : complétez-la.":"Action ajoutée au PDI."); }
  else if(a==="validpdi"){ var e4=byId(S.id); e4.pdiValide=TODAY; saveEnt(e4); journal("pdi_valide", e4, "PDI validé ("+e4.pdi.length+" actions)"); toast("PDI validé."); render(); }
  else if(a==="visite"){ var e5=byId(t.getAttribute("data-id")); S.vis={date:TODAY, next:addDur(TODAY,1,"mois"), feu:e5.feu||"Vert", obs:"", ca:null, statuts:(e5.pdi||[]).map(function(p){return p.statut;})}; go("visite", e5.id); }
  else if(a==="savevisite"){ var e6=byId(S.id), v=S.vis, faites=0;
    e6.visites=(e6.visites||[]).concat([{date:v.date, feu:v.feu, obs:v.obs||"Visite de suivi.", ca:v.ca||null, auteur:ME.email, prochaine:v.next}]).sort(function(x,y){return x.date<y.date?-1:1;});
    e6.feu=v.feu; v.statuts.forEach(function(s,i){ var p=e6.pdi[i]; if(!p) return; if(s==="Fait" && p.statut!=="Fait"){ p.dateFait=v.date; p.faitPar=ME.email; faites++; } if(s!=="Fait"){ p.dateFait=null; } p.statut=s; });
    saveEnt(e6); journal("visite", e6, "Visite de suivi · feu "+v.feu+(faites?" · "+faites+" action(s) réalisée(s)":"")+(v.ca?" · CA du mois "+money(v.ca):""));
    toast("Visite enregistrée."); go("fiche", e6.id); }
  else if(a==="newtask"){ S.newTask={titre:"", type:"Diagnostic", assigneA:OWNER, echeance:addDur(TODAY,2,"semaines"), entrepriseId:"", description:"", attribuer:true}; render(); }
  else if(a==="canceltask"){ S.newTask=null; render(); }
  else if(a==="savetask"){ var nt=S.newTask; if(!nt.titre.trim()){ toast("Donnez un titre à la tâche."); return; }
    var te=nt.entrepriseId?byId(nt.entrepriseId):null;
    var tk={titre:nt.titre.trim(), type:nt.type, assigneA:nt.assigneA, creePar:ME.email, echeance:nt.echeance, entrepriseId:te?te.id:"", entrepriseNom:te?te.nom:"", description:nt.description, statut:"À faire", dateCreation:now(), commentaire:""};
    DB.add("taches", tk);
    if(te && nt.attribuer && te.conseiller!==nt.assigneA){ te.conseiller=nt.assigneA; te.hist=(te.hist||[]).concat([{date:TODAY, auteur:ME.email, champs:["Attribuée à "+membreNom(nt.assigneA)]}]); saveEnt(te); journal("attribution", te, "Entreprise attribuée à "+membreNom(nt.assigneA)); }
    journal("tache_creee", te, "Tâche « "+tk.titre+" » attribuée à "+membreNom(nt.assigneA)+" (échéance "+fd(nt.echeance)+")");
    S.newTask=null; toast("Tâche attribuée."); render(); }
  else if(a==="deltask"){ DB.del("taches", t.getAttribute("data-id")); toast("Tâche supprimée."); }
  else if(a==="raprint"){ printHTML(rapportHTML(calcRapport(), true)); }
  else if(a==="rapxls"){ YKX.exportRapport(calcRapport()); }
  else if(a==="libnew"){ var dd=Number(t.getAttribute("data-dim")||0); S.edit={id:"new", dim:dd, segs:["A","B"], t:{n:2}, module:DIMS[dd].mods[0], action:"", outil:"", livrable:"", modalite:"Formation collective", partenaire:"CADE", mois:3, unite:"mois", type:"essentiel", nature:"formation", actif:true}; render(); showEditor(); }
  else if(a==="libedit"){ S.edit=JSON.parse(JSON.stringify(libById(t.getAttribute("data-id")))); render(); showEditor(); }
  else if(a==="libdup"){ var o2=libById(t.getAttribute("data-id")), c=JSON.parse(JSON.stringify(o2)); c.id="L"+Date.now().toString(36); c.action=c.action+" (copie)"; c.ordre=(o2.ordre||0)+0.5; DB.save("bibliotheque", c.id, c); toast("Action dupliquée."); }
  else if(a==="libtog"){ var o3=libById(t.getAttribute("data-id")); o3.actif=!o3.actif; DB.save("bibliotheque", o3.id, o3); toast(o3.actif?"Action réactivée.":"Action désactivée : elle ne sera plus proposée."); }
  else if(a==="libcancel"){ S.edit=null; render(); }
  else if(a==="libsave"){ var x=S.edit;
    if(!String(x.action).trim()){ toast("Décrivez l'action pratique avant d'enregistrer."); return; }
    if(!x.segs.length){ toast("Choisissez au moins un segment."); return; }
    if(x.t.n==null && x.t.v==null && !x.t.att && !x.t.frein){ toast("Indiquez au moins une condition de déclenchement."); return; }
    x.mois=Number(x.mois)||1; if(x.id==="new"){ x.id="L"+Date.now().toString(36); x.ordre=Date.now()/1e13+100; }
    DB.save("bibliotheque", x.id, x); S.edit=null; toast("Bibliothèque mise à jour."); render(); }
  else if(a==="madd"){ var ml=String(document.getElementById("m_mail").value||"").trim().toLowerCase(), nm=String(document.getElementById("m_nom").value||"").trim(), rl=document.getElementById("m_role").value;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ml)){ toast("Saisissez une adresse e-mail valide."); return; }
    if(ml===OWNER){ toast("Cette adresse est celle du propriétaire."); return; }
    DB.save("membres", ml, {email:ml, nom:nm, role:rl, actif:true, ajoutePar:ME.email, date:TODAY}); journal("membre", null, "Membre ajouté : "+(nm||ml)+" ("+rl+")"); toast("Membre ajouté : il peut se connecter avec ce compte Google."); }
  else if(a==="mtog"){ var mm=MEMBRES.filter(function(x){return x.email===t.getAttribute("data-id");})[0]; mm.actif=!mm.actif; DB.save("membres", mm.email, strip(mm)); journal("membre", null, "Membre "+(mm.actif?"réactivé":"suspendu")+" : "+(mm.nom||mm.email)); }
  else if(a==="mdel"){ var md=t.getAttribute("data-id"); if(S.confirmM!==md){ S.confirmM=md; toast("Cliquez une seconde fois sur « Retirer » pour confirmer."); return; } S.confirmM=null; DB.del("membres", md); journal("membre", null, "Membre retiré : "+md); toast("Membre retiré."); }
});
function showEditor(){ var ed=document.querySelector(".editor"); if(ed) ed.scrollIntoView({block:"start"}); }
document.addEventListener("keydown", function(ev){ if((ev.key==="Enter"||ev.key===" ") && ev.target.matches("tr[data-act],div[data-act]")){ ev.preventDefault(); ev.target.click(); } });
document.addEventListener("change", function(ev){
  var t=ev.target, d=S.diag;
  if(t.id==="fimport" && t.files && t.files[0]){ var f=t.files[0], rd=new FileReader();
    rd.onload=function(){ try{ var res=YKX.lire(new Uint8Array(rd.result)); if(res.erreur){ toast(res.erreur); return; } var R=preparerImport(res); R.fichier=f.name; S.imp=R; render(); }catch(err){ console.error(err); toast("Lecture du fichier impossible : "+err.message); } };
    rd.readAsArrayBuffer(f); t.value=""; return; }
  if(t.hasAttribute("data-conf")){ S.imp.conflits[Number(t.getAttribute("data-conf"))].choix=t.value; return; }
  if(d && t.name && t.name.indexOf("note")===0){ d.notes[d.step]=Number(t.value); saveDraft(); render(); return; }
  if(d && t.hasAttribute("data-ck")){ d.checks[d.step]=d.checks[d.step]||{}; d.checks[d.step][t.getAttribute("data-ck")]=t.checked; saveDraft(); render(); return; }
  if(d && t.hasAttribute("data-q")){ var qk=t.getAttribute("data-q"), pr=qk.split("-"); d.rep[qk]=d.rep[qk]||{}; d.rep[qk].v=Number(t.value); applyLie(d,Number(pr[0]),Number(pr[1]),[Number(t.value)]); saveDraft(); render(); return; }
  if(d && t.hasAttribute("data-qm")){ var mk=t.getAttribute("data-qm"), pm=mk.split("-"); d.rep[mk]=d.rep[mk]||{v:[]}; d.rep[mk].v=d.rep[mk].v||[]; var iv=Number(t.value);
    if(t.checked){ if(d.rep[mk].v.indexOf(iv)<0) d.rep[mk].v.push(iv); applyLie(d,Number(pm[0]),Number(pm[1]),[iv]); } else d.rep[mk].v=d.rep[mk].v.filter(function(z){return z!==iv;}); saveDraft(); render(); return; }
  if(d && t.hasAttribute("data-volet")){ d.volets[Number(t.getAttribute("data-volet"))]=t.value; saveDraft(); render(); return; }
  if(d && t.hasAttribute("data-frein")){ d.freins[Number(t.getAttribute("data-frein"))]=t.checked?1:0; saveDraft(); return; }
  if(d && t.hasAttribute("data-att")){ d.att[t.getAttribute("data-att")]=t.checked; saveDraft(); return; }
  if(d && t.name==="projet"){ d.projet=t.value==="1"; saveDraft(); render(); return; }
  if(d && t.id==="override"){ d.override=t.value||null; saveDraft(); render(); return; }
  if(d && (t.id==="fin_tranche"||t.id==="fin_source")){ d.fin[t.id.slice(4)]=t.value; saveDraft(); return; }
  if(t.id==="fseg"){ S.f.seg=t.value; render(); return; }
  if(t.id==="ffeu"){ S.f.feu=t.value; render(); return; }
  if(t.id==="fcons"){ S.f.cons=t.value; render(); return; }
  if(t.id==="bnat"){ S.bnat=t.value; render(); return; }
  if(t.id==="bseg"){ S.bseg=t.value; render(); return; }
  if(t.id==="tfst"){ S.tf.statut=t.value; render(); return; }
  if(t.id==="tfqui"){ S.tf.qui=t.value; render(); return; }
  if(t.id==="rtype"){ S.rap.type=t.value; S.rap.idx = t.value==="mois"?Number(TODAY.slice(5,7)) : t.value==="trimestre"?Math.ceil(Number(TODAY.slice(5,7))/3) : t.value==="semestre"?(Number(TODAY.slice(5,7))<=6?1:2) : 1; render(); return; }
  if(t.id==="ridx"){ S.rap.idx=Number(t.value); render(); return; }
  if(t.id==="ran"){ S.rap.annee=Number(t.value); render(); return; }
  if(t.id==="reassign"){ var er=byId(S.id); er.conseiller=t.value; er.hist=(er.hist||[]).concat([{date:TODAY, auteur:ME.email, champs:["Attribuée à "+membreNom(t.value)]}]); saveEnt(er); journal("attribution", er, "Entreprise attribuée à "+membreNom(t.value)); toast("Entreprise attribuée à "+membreNom(t.value)+"."); return; }
  if(t.id && t.id.indexOf("ne_")===0 && t.tagName==="SELECT"){ S.newEnt[t.id.slice(3)]=t.value; return; }
  if(t.id && t.id.indexOf("tk_")===0){ var nt=S.newTask, k=t.id.slice(3); if(k==="attr") nt.attribuer=t.checked; else if(k==="type") nt.type=t.value; else if(k==="qui") nt.assigneA=t.value; else if(k==="ent"){ nt.entrepriseId=t.value; var te=byId(t.value); if(te && !nt.titre) { nt.titre=(nt.type==="Diagnostic"?"Réaliser le diagnostic 360° de ":nt.type+" · ")+te.nom; render(); } } else if(k==="ech") nt.echeance=t.value; return; }
  if(t.hasAttribute("data-tst")){ var tsk=TACHES.filter(function(x){return x.id===t.getAttribute("data-tst");})[0]; var old=tsk.statut; tsk.statut=t.value; tsk.dateFait=t.value==="Fait"?TODAY:null; DB.save("taches", tsk.id, strip(tsk));
    if(t.value==="Fait" && old!=="Fait") journal("tache_faite", tsk.entrepriseId?byId(tsk.entrepriseId):null, "Tâche terminée : "+tsk.titre); toast("Statut de la tâche mis à jour."); return; }
  if(t.hasAttribute("data-tcom")){ var tc=TACHES.filter(function(x){return x.id===t.getAttribute("data-tcom");})[0]; tc.commentaire=t.value; DB.save("taches", tc.id, strip(tc)); toast("Commentaire enregistré."); return; }
  if(t.hasAttribute("data-p")){ var e=byId(S.id), p=e.pdi[Number(t.getAttribute("data-p"))], k3=t.getAttribute("data-k"), old2=p.statut;
    p[k3]=k3==="duree"?(Number(t.value)||1):t.value;
    if(k3==="duree"||k3==="unite"||k3==="debut") p.echeance=addDur(p.debut,p.duree,p.unite);
    if(k3==="module") p.reco=recoText(p.module);
    if(k3==="statut"){ if(p.statut==="Fait" && old2!=="Fait"){ p.dateFait=TODAY; p.faitPar=ME.email; journal("action_faite", e, "Action réalisée : "+p.action); } if(p.statut!=="Fait") p.dateFait=null; }
    saveEnt(e); if(["statut","duree","unite","debut","echeance","module"].indexOf(k3)>=0) render(); return; }
  if(t.id==="obj"){ var eo=byId(S.id); eo.objectif=t.value; saveEnt(eo); return; }
  if(t.hasAttribute("data-vs")){ S.vis.statuts[Number(t.getAttribute("data-vs"))]=t.value; return; }
  if(t.name==="vfeu"){ S.vis.feu=t.value; return; }
  if(t.id==="vdate"){ S.vis.date=t.value; return; }
  if(t.id==="vnext"){ S.vis.next=t.value; return; }
  if(t.hasAttribute("data-le")){ var f2=t.getAttribute("data-le"), x=S.edit;
    if(f2==="dim"||f2==="mois") x[f2]=Number(t.value)||(f2==="dim"?0:1);
    else if(f2==="tn"){ if(t.value) x.t.n=Number(t.value); else delete x.t.n; }
    else if(f2==="tv"){ if(t.value!=="") x.t.v=Number(t.value); else delete x.t.v; }
    else if(f2==="ta"){ delete x.t.att; delete x.t.frein; if(t.value==="frein") x.t.frein=true; else if(t.value) x.t.att=t.value; }
    else if(t.tagName==="SELECT") x[f2]=t.value;
    if(f2==="module"||f2==="dim"){ render(); showEditor(); } return; }
  if(t.hasAttribute("data-leseg")){ var sg=t.getAttribute("data-leseg"); if(t.checked){ if(S.edit.segs.indexOf(sg)<0) S.edit.segs.push(sg); } else S.edit.segs=S.edit.segs.filter(function(z){return z!==sg;}); S.edit.segs.sort(); return; }
  if(t.hasAttribute("data-mrole")){ var mr=MEMBRES.filter(function(x){return x.email===t.getAttribute("data-mrole");})[0]; mr.role=t.value; DB.save("membres", mr.email, strip(mr)); journal("membre", null, "Rôle de "+(mr.nom||mr.email)+" : "+t.value); toast("Rôle mis à jour."); return; }
});
document.addEventListener("input", function(ev){
  var t=ev.target;
  if(t.id==="fq"){ S.f.q=t.value; var pos=t.selectionStart; render(); var n=document.getElementById("fq"); if(n){ n.focus(); try{n.setSelectionRange(pos,pos);}catch(e){} } return; }
  if(S.diag && t.hasAttribute("data-obs")){ S.diag.obs[S.diag.step]=t.value; saveDraft(); return; }
  if(S.diag && t.hasAttribute("data-qt")){ var tk=t.getAttribute("data-qt"); S.diag.rep[tk]=S.diag.rep[tk]||{}; S.diag.rep[tk].v=t.value; saveDraft(); return; }
  if(S.diag && t.hasAttribute("data-qp")){ var pk=t.getAttribute("data-qp"); S.diag.rep[pk]=S.diag.rep[pk]||{}; S.diag.rep[pk].p=t.value; saveDraft(); return; }
  if(S.diag && t.id==="overj"){ S.diag.overj=t.value; saveDraft(); return; }
  if(S.diag && (t.id==="fin_caMois"||t.id==="fin_charges")){ S.diag.fin[t.id.slice(4)]=t.value===""?null:Number(t.value); var bb=document.getElementById("fin_benef"); if(bb) bb.textContent=money(benef(S.diag.fin)); saveDraft(); return; }
  if(t.id==="vobs"){ S.vis.obs=t.value; return; }
  if(t.id==="vca"){ S.vis.ca=t.value?Number(t.value):null; return; }
  if(t.id && t.id.indexOf("ne_")===0){ S.newEnt[t.id.slice(3)]=t.value; return; }
  if(t.id==="tk_titre"){ S.newTask.titre=t.value; return; }
  if(t.id==="tk_desc"){ S.newTask.description=t.value; return; }
  if(t.hasAttribute("data-le") && t.tagName!=="SELECT"){ S.edit[t.getAttribute("data-le")]=t.value; return; }
});
document.getElementById("sync").addEventListener("click", function(){ if(S.stale) render(); });
window.addEventListener("beforeprint", function(){ if(!document.body.classList.contains("printing")){ /* impression directe : rien de spécial */ } });

if("serviceWorker" in navigator && location.protocol==="https:") navigator.serviceWorker.register("sw.js").catch(function(e){ console.warn(e); });
render();
})();
