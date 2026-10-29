/* Yokkute PME — import et export Excel (bibliothèque SheetJS embarquée). */
"use strict";
var YKX = (function(){
  var MOIS = {JAN:1,FEV:2,MAR:3,AVR:4,MAI:5,AOU:8,SEP:9,OCT:10,NOV:11,DEC:12};
  var HEAD = {
    "MATRICULE":"id","DATE INSCRIT":"dateIns","PRENOM":"prenom","NOM":"nomP","TELEPHONE":"tel","ADRESSE":"adresse","COMMUNE":"commune",
    "ACTIVITE":"activite","RAISON SOCIALE":"nom","ORGANISATION":"org","COACH":"coach",
    "DEPARTEMENT (AUTO)":"dept","DEPARTEMENT":"dept","FILIERE NORMALISEE":"secteur","GENRE DU PROMOTEUR":"genre","TRANCHE D'AGE":"age","FORME JURIDIQUE":"forme",
    "NINEA":"ninea","RCCM":"rccm","EFFECTIF PERMANENT":"effP","EFFECTIF TEMPORAIRE / APPRENTIS":"effT","CHIFFRE D'AFFAIRES ANNUEL (TRANCHE)":"caTranche",
    "PROGRAMME D'ORIGINE":"programme","VAGUE":"vague"
  };
  function hcle(h){ return cle(h).replace(/\s*:\s*$/,"").trim(); }
  function iso(d){ return d.toISOString().slice(0,10); }
  function parseDate(v, matricule){
    if(v==null || v==="") return "";
    if(v instanceof Date) return iso(new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())));
    if(typeof v==="number"){ var d=new Date(Math.round((v-25569)*864e5)); return iso(d); }
    var s=String(v).trim(), m=s.match(/^(\d{1,2})\/([A-Za-zÀ-ÿ]+)\/(\d{4})$/);
    if(m){ var k=cle(m[2]).slice(0,3), mo;
      if(k==="JUI"){ mo=Number(String(matricule||"").slice(6,8)); if(mo!==6 && mo!==7) mo=6; } else mo=MOIS[k];
      if(mo) return m[3]+"-"+String(mo).padStart(2,"0")+"-"+m[1].padStart(2,"0"); }
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m) return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
    m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0].slice(0,10);
    return "";
  }
  function title(s){ return String(s||"").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, function(a,b,c){ return b+c.toUpperCase(); }); }
  var GENRE = {"FEMME":"F","F":"F","HOMME":"H","H":"H"};
  var AGE = {"MOINS DE 35 ANS":"-35","35 A 50 ANS":"35-50","PLUS DE 50 ANS":"50+"};

  /* Lit un export CCIAK (tableau HTML enregistré en .xls) ou le modèle Excel du CADE. */
  function lire(buffer){
    var wb = XLSX.read(buffer, {type:"array", cellDates:true});
    var feuille = wb.SheetNames.indexOf("Adherents")>=0 ? "Adherents" : wb.SheetNames[0];
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[feuille], {header:1, raw:true, defval:""});
    var hi = -1;
    for(var i=0;i<Math.min(rows.length,15);i++){ if(rows[i].some(function(c){ return hcle(c)==="MATRICULE"; })){ hi=i; break; } }
    if(hi<0) return {erreur:"Colonne « Matricule » introuvable : ce fichier n'est ni l'export des adhérents CCIAK ni le modèle Yokkute."};
    var map = rows[hi].map(function(h){ return HEAD[hcle(h)] || null; });
    var out=[], erreurs=[];
    for(var r=hi+1;r<rows.length;r++){
      var row=rows[r], o={};
      map.forEach(function(k,c){ if(k) o[k]=row[c]; });
      if(!String(o.id||"").trim() && !String(o.nom||"").trim() && !String(o.prenom||"").trim()) continue;
      var x={};
      x.id = String(o.id||"").trim().toUpperCase();
      x.dateIns = parseDate(o.dateIns, x.id);
      x.prenom = title(o.prenom); x.nomP = String(o.nomP||"").trim().toUpperCase();
      x.prom = (x.prenom+" "+x.nomP).trim();
      x.tel = telNorm(o.tel); x.adresse = String(o.adresse||"").trim(); x.commune = String(o.commune||"").trim().toUpperCase();
      x.activite = String(o.activite||"").trim(); x.org = String(o.org||"").trim(); x.coach = String(o.coach||"").trim();
      x.nom = String(o.nom||"").trim() || x.org || x.prom;
      var comp = {};
      if(o.dept && String(o.dept).indexOf("inconnue")<0) comp.dept = String(o.dept).trim();
      if(o.secteur) comp.secteur = String(o.secteur).trim();
      if(o.genre && GENRE[cle(o.genre)]) comp.genre = GENRE[cle(o.genre)];
      if(o.age && AGE[cle(o.age)]) comp.age = AGE[cle(o.age)];
      if(o.forme) comp.forme = String(o.forme).trim();
      if(o.ninea) comp.ninea = String(o.ninea).trim();
      if(o.rccm) comp.rccm = String(o.rccm).trim();
      if(o.effP!=="" && o.effP!=null && !isNaN(Number(o.effP))) comp.effP = Number(o.effP);
      if(o.effT!=="" && o.effT!=null && !isNaN(Number(o.effT))) comp.effT = Number(o.effT);
      if(o.caTranche) comp.caTranche = String(o.caTranche).trim();
      if(o.programme) comp.programme = String(o.programme).trim();
      if(o.vague) comp.vague = String(o.vague).trim();
      x.comp = comp;
      var pb=[];
      if(!x.id) pb.push("matricule manquant");
      else if(!/^(AG|IN|SE|CO)\d{10}$/.test(x.id)) pb.push("matricule au format inhabituel");
      if(!x.dateIns && o.dateIns) pb.push("date illisible");
      if(pb.length) erreurs.push({ligne:r+1, nom:x.nom, probleme:pb.join(", ")});
      if(x.id) out.push(x);
    }
    return {lignes:out, erreurs:erreurs, feuille:feuille};
  }

  function feuille(wb, nom, entetes, lignes, largeurs){
    var ws = XLSX.utils.aoa_to_sheet([entetes].concat(lignes));
    ws["!cols"] = (largeurs||entetes.map(function(){return 18;})).map(function(w){ return {wch:w}; });
    XLSX.utils.book_append_sheet(wb, ws, nom);
  }
  var EXP_HEAD = ["Matricule","Date inscrit","Prénom","Nom","Téléphone","Adresse","Commune","Activité","Raison Sociale","Organisation","Coach"];
  var COMP_HEAD = ["Département (auto)","Filière normalisée","Genre du promoteur","Tranche d'âge","Forme juridique","NINEA","RCCM","Effectif permanent","Effectif temporaire / apprentis","Chiffre d'affaires annuel (tranche)","Programme d'origine","Vague"];
  function ligneEnt(e){
    return [e.id, e.dateIns||"", e.prenom||"", e.nomP||"", e.tel||"", e.adresse||"", e.commune||"", e.activite||"", e.nom||"", e.org||"", e.coach||"",
      e.dept||"", e.secteur||"", e.genre==="F"?"Femme":e.genre==="H"?"Homme":"", AGES[e.age]||"", e.forme||"", e.ninea||"", e.rccm||"", e.effP==null?"":e.effP, e.effT==null?"":e.effT,
      (e.fin&&e.fin.tranche)||e.caTranche||"", e.programme||"", e.vague||""];
  }
  function modeleVierge(){
    var wb = XLSX.utils.book_new();
    feuille(wb, "Adherents", EXP_HEAD.concat(COMP_HEAD), [["AG2026030068","2026-03-06","Prénom","NOM","+221 77 000 00 00","Quartier","KAOLACK","AGROALIMENTAIRE","EXEMPLE — à remplacer","Nom usuel","Coach","Kaolack","Transformation agroalimentaire","Femme","35 à 50 ans","GIE","","Non","","","Moins de 5 M FCFA","Adhésion CCIAK","1"]]);
    feuille(wb, "Listes", ["Filière","Forme juridique","Genre","Tranche d'âge","CA annuel (tranche)","Département"],
      Array.from({length:Math.max(FILIERES.length,FORMES.length)}).map(function(_,i){ return [FILIERES[i]||"",FORMES[i]||"",["Femme","Homme"][i]||"",["Moins de 35 ans","35 à 50 ans","Plus de 50 ans"][i]||"",TRANCHES[i]||"",DEPTS[i]||""]; }), [30,24,10,16,20,14]);
    XLSX.writeFile(wb, "Modele_Adherents_Yokkute.xlsx");
  }
  function exportTout(ents, taches, lib, membres){
    var wb = XLSX.utils.book_new();
    feuille(wb, "Entreprises", EXP_HEAD.concat(COMP_HEAD).concat(["Conseiller référent","Segment","Moyenne diagnostic","Date diagnostic","Feu","PDI validé le"]),
      ents.map(function(e){ return ligneEnt(e).concat([e.conseiller||"", segOf(e)||"", e.notes?moyenne(e.notes):"", e.diagDate||"", e.feu||"", e.pdiValide||""]); }));
    var dl=[]; ents.forEach(function(e){ (e.diags||[]).forEach(function(d){ dl.push([e.id, e.nom, d.date, d.auteur||"", d.segment||""].concat(d.notes||[]).concat([d.notes?moyenne(d.notes):""])); }); });
    feuille(wb, "Diagnostics", ["Matricule","Entreprise","Date","Réalisé par","Segment"].concat(DIMS.map(function(D){return D.nom;})).concat(["Moyenne"]), dl);
    var pl=[]; ents.forEach(function(e){ (e.pdi||[]).forEach(function(p){ pl.push([e.id, e.nom, DIMS[p.dim].nom, MOD[p.module]||"", NATURES[p.nature]||"", p.action, p.outil||"", p.livrable, p.partenaire, p.debut, p.duree+" "+p.unite, p.echeance, p.statut, p.dateFait||""]); }); });
    feuille(wb, "PDI", ["Matricule","Entreprise","Dimension","Formation recommandée","Nature","Action","Outil ou modèle","Livrable","Partenaire","Début","Durée","Échéance","Statut","Réalisée le"], pl);
    var vl=[]; ents.forEach(function(e){ (e.visites||[]).forEach(function(v){ vl.push([e.id, e.nom, v.date, v.auteur||"", v.feu, v.ca==null?"":v.ca, v.obs||""]); }); });
    feuille(wb, "Visites", ["Matricule","Entreprise","Date","Réalisée par","Feu","CA du mois (FCFA)","Observations"], vl);
    feuille(wb, "Taches", ["Titre","Type","Entreprise","Attribuée à","Créée par","Créée le","Échéance","Statut","Terminée le","Commentaire"],
      taches.map(function(t){ return [t.titre, t.type, t.entrepriseNom||"", t.assigneA, t.creePar, (t.dateCreation||"").slice(0,10), t.echeance||"", t.statut, t.dateFait||"", t.commentaire||""]; }));
    feuille(wb, "Bibliotheque", ["Dimension","Segments","Formation","Nature","Caractère","Action","Outil ou modèle","Livrable","Modalité","Partenaire","Durée","Déclencheur","Active"],
      lib.map(function(l){ return [DIMS[l.dim].nom, l.segs.join(" "), MOD[l.module]||"", NATURES[l.nature]||"", TYPES[l.type]||"", l.action, l.outil||"", l.livrable, l.modalite, l.partenaire, l.mois+" "+(l.unite||"mois"), trigText(l), l.actif?"Oui":"Non"]; }));
    feuille(wb, "Equipe", ["E-mail","Nom","Rôle","Actif"], membres.map(function(m){ return [m.email, m.nom||"", m.role, m.actif?"Oui":"Non"]; }));
    XLSX.writeFile(wb, "Yokkute_export_complet_"+TODAY+".xlsx");
  }
  function exportRapport(R){
    var wb = XLSX.utils.book_new();
    feuille(wb, "Synthese", ["Indicateur","Valeur"], R.indicateurs.map(function(i){ return [i[0], i[1]]; }), [50,16]);
    feuille(wb, "Activites", ["Date","Type","Entreprise","Réalisée par","Détail"], R.journal.map(function(j){ return [j.jour, j.typeLabel, j.entrepriseNom||"", j.auteur, j.texte]; }), [12,20,30,28,60]);
    feuille(wb, "Formations", ["Formation recommandée","Entreprises concernées"], R.besoins.map(function(b){ return [b[0], b[1]]; }), [70,14]);
    feuille(wb, "Par conseiller", ["Conseiller","Diagnostics","Visites","Actions réalisées","Tâches terminées"], R.parConseiller, [30,12,12,16,16]);
    XLSX.writeFile(wb, "Rapport_"+R.fichier+".xlsx");
  }
  return {lire:lire, modeleVierge:modeleVierge, exportTout:exportTout, exportRapport:exportRapport};
})();
