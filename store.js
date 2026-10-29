/* Yokkute PME — couche de données.
   Mode Firebase : Firestore avec cache hors ligne (les écritures sont gardées sur l'appareil et envoyées au retour du réseau).
   Mode local : localStorage, utilisé tant que la configuration Firebase n'est pas renseignée. */
"use strict";
(function(){
  var CFG = window.YK_CONFIG, COLS = ["entreprises","bibliotheque","membres","taches","journal"];
  var DB = { mode:"local", user:null, pending:false, online:navigator.onLine };
  var listeners = {}, userCbs = [], statusCbs = [];
  function emitStatus(){ statusCbs.forEach(function(f){ try{ f(DB); }catch(e){ console.error(e); } }); }
  window.addEventListener("online", function(){ DB.online=true; emitStatus(); });
  window.addEventListener("offline", function(){ DB.online=false; emitStatus(); });
  function clean(o){ return JSON.parse(JSON.stringify(o, function(k,v){ return v===undefined ? null : v; })); }
  var configured = CFG && CFG.firebase && CFG.firebase.apiKey && CFG.firebase.apiKey!=="A_REMPLACER" && window.firebase;

  if(configured){
    DB.mode = "firebase";
    firebase.initializeApp(CFG.firebase);
    var fs = firebase.firestore();
    fs.enablePersistence({synchronizeTabs:true}).catch(function(e){ console.warn("Cache hors ligne indisponible :", e && e.code); });
    var auth = firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});
    var unsub = [];
    var pendingByCol = {};
    auth.onAuthStateChanged(function(u){
      unsub.forEach(function(f){ f(); }); unsub=[];
      DB.user = u ? {email:(u.email||"").toLowerCase(), nom:u.displayName||u.email, photo:u.photoURL||""} : null;
      if(!u){ userCbs.forEach(function(f){ f(null, null); }); return; }
      if(DB.user.email===String(CFG.ownerEmail).toLowerCase()){ userCbs.forEach(function(f){ f(DB.user, {role:"proprietaire", actif:true}); }); attach(); return; }
      fs.collection("membres").doc(DB.user.email).get().then(function(d){
        var m = d.exists ? d.data() : null;
        userCbs.forEach(function(f){ f(DB.user, m); });
        if(m && m.actif) attach();
      }).catch(function(e){ console.warn(e); userCbs.forEach(function(f){ f(DB.user, {erreur:e && e.code}); }); });
    });
    function attach(){
      COLS.forEach(function(col){
        var q = fs.collection(col);
        unsub.push(q.onSnapshot({includeMetadataChanges:true}, function(snap){
          pendingByCol[col] = snap.metadata.hasPendingWrites;
          DB.pending = Object.keys(pendingByCol).some(function(k){ return pendingByCol[k]; });
          emitStatus();
          var docs = snap.docs.map(function(d){ var x=d.data(); x._id=d.id; return x; });
          (listeners[col]||[]).forEach(function(f){ f(docs); });
        }, function(err){
          console.error(col, err);
          (listeners["_error"]||[]).forEach(function(f){ f(col, err); });
        }));
      });
    }
    auth.getRedirectResult().catch(function(e){ console.warn(e); });
    DB.signIn = function(){
      var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:"select_account"});
      var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
      if(standalone) return auth.signInWithRedirect(p);
      return auth.signInWithPopup(p).catch(function(e){
        if(e && (e.code==="auth/popup-blocked" || e.code==="auth/operation-not-supported-in-this-environment")) return auth.signInWithRedirect(p);
        throw e;
      });
    };
    DB.signOut = function(){ return auth.signOut(); };
    DB.save = function(col, id, data){ return fs.collection(col).doc(String(id)).set(clean(data)); };
    DB.add = function(col, data){ var ref = fs.collection(col).doc(); data.id = ref.id; ref.set(clean(data)); return ref.id; };
    DB.del = function(col, id){ return fs.collection(col).doc(String(id)).delete(); };
  } else {
    /* ---------- mode local ---------- */
    var KEY = "yokkute_local_";
    function read(col){ try{ return JSON.parse(localStorage.getItem(KEY+col)||"{}"); }catch(e){ return {}; } }
    function write(col, obj){ try{ localStorage.setItem(KEY+col, JSON.stringify(obj)); }catch(e){ console.warn("Stockage local plein ou indisponible", e); } }
    function fire(col){ var o=read(col); var docs=Object.keys(o).map(function(k){ var x=o[k]; x._id=k; return x; }); (listeners[col]||[]).forEach(function(f){ f(docs); }); }
    var asParam = (location.search.match(/[?&]as=([^&]+)/)||[])[1];
    DB.user = {email: decodeURIComponent(asParam || CFG.ownerEmail).toLowerCase(), nom: "Mode local", photo:""};
    setTimeout(function(){
      var mem = read("membres")[DB.user.email];
      var m = DB.user.email===String(CFG.ownerEmail).toLowerCase() ? {role:"proprietaire", actif:true} : (mem||null);
      userCbs.forEach(function(f){ f(DB.user, m); }); COLS.forEach(fire); emitStatus(); }, 0);
    window.addEventListener("storage", function(ev){ if(ev.key && ev.key.indexOf(KEY)===0) fire(ev.key.slice(KEY.length)); });
    DB.signIn = function(){ return Promise.resolve(); };
    DB.signOut = function(){ toastGlobal("En mode local, il n'y a pas de compte à déconnecter."); return Promise.resolve(); };
    DB.save = function(col, id, data){ var o=read(col); o[String(id)]=clean(data); write(col,o); setTimeout(function(){ fire(col); },0); return Promise.resolve(); };
    DB.add = function(col, data){ var id = col.slice(0,2)+Date.now().toString(36)+Math.random().toString(36).slice(2,6); data.id=id; DB.save(col,id,data); return id; };
    DB.del = function(col, id){ var o=read(col); delete o[String(id)]; write(col,o); setTimeout(function(){ fire(col); },0); return Promise.resolve(); };
  }
  function toastGlobal(m){ if(window.ykToast) window.ykToast(m); }
  DB.listen = function(col, f){ (listeners[col]=listeners[col]||[]).push(f); };
  DB.onUser = function(f){ userCbs.push(f); };
  DB.onStatus = function(f){ statusCbs.push(f); };
  window.YK_DB = DB;
})();
