/* Yokkute PME — exports PDF et Word des rapports (version 1.5).
   PDF : jsPDF + jsPDF-AutoTable (licence MIT, fichiers jspdf.umd.min.js et jspdf.plugin.autotable.min.js).
   Word : fichier .docx construit ici même (format Office Open XML), sans bibliothèque externe, utilisable hors connexion. */
"use strict";
var YKE = (function(){
  var VERT=[23,52,44], IVOIRE=[243,245,241];

  /* ---------- Texte ---------- */
  function clean(s){ return String(s==null?"":s).replace(/[   ]/g," ").replace(/\s+/g," ").trim(); }
  /* Les polices standard du PDF ne couvrent que le latin de base : on remplace les rares signes qui manquent. */
  function pdfTxt(s){
    return clean(s).replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"').replace(/[–—−]/g,"-")
      .replace(/…/g,"...").replace(/œ/g,"oe").replace(/Œ/g,"OE").replace(/≥/g,">=").replace(/≤/g,"<=")
      .replace(/[›→]/g,">").replace(/[‹←]/g,"<").replace(/€/g,"EUR").replace(/•/g,"-")
      .replace(/[^\u0000-ÿ]/g,"");
  }
  function xml(s){ return clean(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  /* ---------- HTML du rapport → blocs (titres, paragraphes, listes, tableaux) ---------- */
  function blocks(html){
    var d=document.createElement("div"); d.innerHTML=html; var out=[];
    (function walk(n){
      [].forEach.call(n.children, function(c){
        var t=c.tagName, cl=c.classList;
        if(cl.contains("kpis") || cl.contains("noexport") || cl.contains("kpi") || cl.contains("bar") || t==="BUTTON" || t==="SELECT" || t==="SCRIPT") return;
        if(/^H[1-4]$/.test(t)){ var hx=clean(c.textContent); if(hx) out.push({t:"h"+Math.min(3,Number(t.charAt(1))), x:hx}); return; }
        if(t==="P"){ var x=clean(c.textContent); if(x) out.push({t:(cl.contains("muted")||cl.contains("small"))?"note":"p", x:x}); return; }
        if(t==="LI"){ var lx=clean(c.textContent); if(lx) out.push({t:"li", x:lx}); return; }
        if(t==="TABLE"){
          var rows=[].map.call(c.querySelectorAll("tr"), function(tr){ return [].map.call(tr.children, function(td){ return clean(td.textContent); }); }).filter(function(r){ return r.length; });
          if(!rows.length) return;
          var first=c.querySelector("tr"), hasHead=!!(c.querySelector("thead") || (first && first.querySelector("th")));
          out.push({t:"table", head:hasHead?rows[0]:null, body:hasHead?rows.slice(1):rows}); return;
        }
        walk(c);
      });
    })(d);
    return out;
  }
  function numCols(b){
    var n=(b.head||b.body[0]||[]).length, res=[];
    for(var j=0;j<n;j++){ var ok=b.body.length>0; b.body.forEach(function(r){ var v=r[j]; if(v!==undefined && v!=="" && !/^[-+]?[\d\s.,]+\s?(%|FCFA)?$|^—$|^-$|^\d+\s?\/\s?\d+$/.test(v)) ok=false; }); res.push(ok); }
    return res;
  }

  /* ---------- PDF ---------- */
  function pdf(B, o){
    if(!window.jspdf || !window.jspdf.jsPDF){ if(window.ykToast) window.ykToast("Export PDF indisponible : rechargez la page (Ctrl + F5)."); return; }
    var doc=new window.jspdf.jsPDF({unit:"mm", format:"a4"}), M=16, W=210-2*M, y=16;
    if(typeof doc.autoTable!=="function"){ if(window.ykToast) window.ykToast("Export PDF incomplet : rechargez la page (Ctrl + F5)."); return; }
    function need(h){ if(y+h>279){ doc.addPage(); y=18; } }
    function txt(s, size, style, color, gapAfter, indent){
      doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(color[0],color[1],color[2]);
      var L=doc.splitTextToSize(pdfTxt(s), W-(indent||0)), lh=size*0.42;
      L.forEach(function(line){ need(lh); doc.text(line, M+(indent||0), y+lh*0.8); y+=lh; });
      y+=gapAfter;
    }
    if(o.org) txt(o.org, 8.5, "normal", [92,107,101], 2);
    B.forEach(function(b){
      if(b.t==="h1"){ need(16); txt(b.x, 17, "bold", VERT, 3); }
      else if(b.t==="h2"){ y+=3; need(14); txt(b.x, 13, "bold", VERT, 2); }
      else if(b.t==="h3"){ y+=1; need(10); txt(b.x, 11, "bold", VERT, 1.5); }
      else if(b.t==="p"){ txt(b.x, 10, "normal", [29,42,37], 2); }
      else if(b.t==="note"){ txt(b.x, 9, "italic", [92,107,101], 2); }
      else if(b.t==="li"){ txt("- "+b.x, 10, "normal", [29,42,37], 1, 3); }
      else if(b.t==="table"){
        var nc=numCols(b), cs={}; nc.forEach(function(v,j){ if(v) cs[j]={halign:"right"}; });
        need(14);
        doc.autoTable({startY:y, head:b.head?[b.head.map(pdfTxt)]:undefined, body:b.body.map(function(r){ return r.map(pdfTxt); }),
          margin:{left:M, right:M, top:18, bottom:18}, theme:"grid",
          styles:{font:"helvetica", fontSize:8.5, cellPadding:1.6, textColor:[29,42,37], lineColor:[203,213,202], lineWidth:0.2, overflow:"linebreak"},
          headStyles:{fillColor:VERT, textColor:[255,255,255], fontStyle:"bold"}, alternateRowStyles:{fillColor:IVOIRE}, columnStyles:cs});
        y=doc.lastAutoTable.finalY+5;
      }
    });
    var n=doc.getNumberOfPages();
    for(var i=1;i<=n;i++){ doc.setPage(i); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(92,107,101);
      doc.text(pdfTxt(o.pied||o.title||""), M, 290); doc.text("Page "+i+" / "+n, 210-M, 290, {align:"right"}); }
    doc.save(o.file);
  }

  /* ---------- Word (.docx) ---------- */
  var CRC=(function(){ var t=[]; for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
  function crc32(u){ var c=0xFFFFFFFF; for(var i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
  function zip(files){
    var enc=new TextEncoder(), parts=[], central=[], off=0;
    function u16(v){ return [v&255,(v>>8)&255]; } function u32(v){ return [v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]; }
    files.forEach(function(f){
      var name=enc.encode(f.name), data=enc.encode(f.data), crc=crc32(data);
      var head=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))), name);
      off+=head.length+name.length+data.length;
    });
    var csize=central.reduce(function(s,a){ return s+a.length; },0);
    var end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(csize),u32(off),u16(0)));
    return new Blob(parts.concat(central,[end]), {type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  }
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  function run(s, rpr){ return '<w:r>'+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+'<w:t xml:space="preserve">'+xml(s)+'</w:t></w:r>'; }
  function para(s, style, rpr, jc){ return '<w:p><w:pPr>'+(style?'<w:pStyle w:val="'+style+'"/>':'')+(jc?'<w:jc w:val="'+jc+'"/>':'')+'</w:pPr>'+run(s, rpr)+'</w:p>'; }
  function table(b){
    var rows=(b.head?[b.head]:[]).concat(b.body), n=rows.reduce(function(m,r){ return Math.max(m,r.length); },0)||1, nc=numCols(b);
    /* Largeur des colonnes proportionnelle au texte le plus long (bornée), sur 9 638 twips utiles. */
    var lg=[]; for(var j=0;j<n;j++){ var m=4; rows.forEach(function(r){ m=Math.max(m, Math.min(60, String(r[j]==null?"":r[j]).length)); }); lg.push(m); }
    var tot=lg.reduce(function(s,v){ return s+v; },0), W=lg.map(function(v){ return Math.max(700, Math.floor(9638*v/tot)); });
    var over=W.reduce(function(s,v){ return s+v; },0)-9638; if(over>0){ var big=W.indexOf(Math.max.apply(null,W)); W[big]-=over; }
    var x='<w:tbl><w:tblPr><w:tblStyle w:val="TableauYK"/><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>';
    for(var j2=0;j2<n;j2++) x+='<w:gridCol w:w="'+W[j2]+'"/>';
    x+='</w:tblGrid>';
    rows.forEach(function(r, i){
      var h=b.head && i===0;
      x+='<w:tr>'+(h?'<w:trPr><w:tblHeader/></w:trPr>':'');
      for(var j=0;j<n;j++){ var v=r[j]==null?"":r[j];
        x+='<w:tc><w:tcPr><w:tcW w:w="'+W[j]+'" w:type="dxa"/>'+(h?'<w:shd w:val="clear" w:color="auto" w:fill="17342C"/>':(i%2===0?'<w:shd w:val="clear" w:color="auto" w:fill="F3F5F1"/>':''))+'</w:tcPr>'+
          '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/>'+(nc[j]&&!h?'<w:jc w:val="right"/>':'')+'</w:pPr>'+run(v, h?'<w:b/><w:color w:val="FFFFFF"/>':'')+'</w:p></w:tc>'; }
      x+='</w:tr>';
    });
    return x+'</w:tbl>'+para("", null);
  }
  function docx(B, o){
    var body=(o.org?para(o.org,"Petit"):'');
    B.forEach(function(b){
      if(b.t==="h1") body+=para(b.x,"Titre");
      else if(b.t==="h2") body+=para(b.x,"Titre1");
      else if(b.t==="h3") body+=para(b.x,"Titre2");
      else if(b.t==="p") body+=para(b.x,null);
      else if(b.t==="note") body+=para(b.x,"Petit");
      else if(b.t==="li") body+=para("• "+b.x,"Liste");
      else if(b.t==="table") body+=table(b);
    });
    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+
      '<w:sectPr><w:footerReference w:type="default" r:id="rIdPied"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+NS+'>'+
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="1D2A25"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
      '<w:style w:type="paragraph" w:styleId="Titre"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="200"/></w:pPr><w:rPr><w:b/><w:color w:val="17342C"/><w:sz w:val="36"/></w:rPr></w:style>'+
      '<w:style w:type="paragraph" w:styleId="Titre1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="17342C"/><w:sz w:val="28"/></w:rPr></w:style>'+
      '<w:style w:type="paragraph" w:styleId="Titre2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="17342C"/><w:sz w:val="24"/></w:rPr></w:style>'+
      '<w:style w:type="paragraph" w:styleId="Petit"><w:name w:val="Petit"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="5C6B65"/><w:sz w:val="18"/></w:rPr></w:style>'+
      '<w:style w:type="paragraph" w:styleId="Liste"><w:name w:val="Liste"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:spacing w:after="60"/></w:pPr></w:style>'+
      '<w:style w:type="table" w:styleId="TableauYK"><w:name w:val="Tableau Yokkute"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5CA"/><w:left w:val="single" w:sz="4" w:color="CBD5CA"/><w:bottom w:val="single" w:sz="4" w:color="CBD5CA"/><w:right w:val="single" w:sz="4" w:color="CBD5CA"/><w:insideH w:val="single" w:sz="4" w:color="CBD5CA"/><w:insideV w:val="single" w:sz="4" w:color="CBD5CA"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>'+
      '</w:styles>';
    var pied='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+NS+'><w:p><w:pPr><w:pStyle w:val="Petit"/><w:tabs><w:tab w:val="right" w:pos="9638"/></w:tabs></w:pPr>'+run(o.pied||o.title||"")+'<w:r><w:tab/></w:r>'+run("Page ")+
      '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
    var files=[
      {name:"[Content_Types].xml", data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
      {name:"_rels/.rels", data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
      {name:"docProps/core.xml", data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+xml(o.title||"")+'</dc:title><dc:creator>Yokkute PME</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().slice(0,19)+'Z</dcterms:created></cp:coreProperties>'},
      {name:"word/_rels/document.xml.rels", data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdPied" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'},
      {name:"word/document.xml", data:doc}, {name:"word/styles.xml", data:styles}, {name:"word/footer1.xml", data:pied}
    ];
    telecharger(zip(files), o.file);
  }
  function telecharger(blob, nom){
    var a=document.createElement("a"), u=URL.createObjectURL(blob); a.href=u; a.download=nom; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 2000);
  }

  /* API : html = rapport en HTML ; o = {title, file (sans extension), org, pied} */
  return {
    blocks:blocks,
    pdf:function(html, o){ pdf(blocks(html), {title:o.title, org:o.org, pied:o.pied, file:o.file+".pdf"}); },
    word:function(html, o){ docx(blocks(html), {title:o.title, org:o.org, pied:o.pied, file:o.file+".docx"}); }
  };
})();
