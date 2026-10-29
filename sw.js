/* Yokkute PME — cache hors ligne de l'application. Changez VERSION à chaque mise à jour publiée. */
var VERSION = "yokkute-v1.0.1";
var FICHIERS = ["./", "index.html", "manifest.webmanifest", "app.css",
  "config.js", "referentiel.js", "store.js", "excel.js", "app.js",
  "firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js", "xlsx.full.min.js",
  "icon-192.png", "icon-512.png"];
self.addEventListener("install", function(e){ e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(FICHIERS); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener("activate", function(e){ e.waitUntil(caches.keys().then(function(k){ return Promise.all(k.filter(function(n){ return n!==VERSION; }).map(function(n){ return caches.delete(n); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener("fetch", function(e){
  var u = new URL(e.request.url);
  if(e.request.method!=="GET") return;
  /* Firebase (Firestore, connexion) : jamais via le cache. */
  if(/googleapis\.com$|firebaseapp\.com$|gstatic\.com$|google\.com$/.test(u.hostname) && u.hostname!=="fonts.googleapis.com" && u.hostname!=="fonts.gstatic.com") return;
  if(u.origin===location.origin){
    /* Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne. */
    e.respondWith(fetch(e.request).then(function(r){ var cl=r.clone(); if(r.ok) caches.open(VERSION).then(function(c){ c.put(e.request, cl); }); return r; })
      .catch(function(){ return caches.match(e.request, {ignoreSearch:true}).then(function(r){ return r || caches.match("index.html"); }); }));
    return;
  }
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request).then(function(n){ var cl=n.clone(); caches.open(VERSION).then(function(c){ c.put(e.request, cl); }); return n; }); }));
  }
});
