// Centavo service worker — the app must work with no connection at all.
var CACHE = "centavo-v2";
var FONTS = "centavo-fonts-v2";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){
        return k !== CACHE && k !== FONTS;
      }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }

  // Google Fonts: cache first and keep forever, so type survives offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(
      caches.open(FONTS).then(function(c){
        return c.match(e.request).then(function(hit){
          if (hit) return hit;
          return fetch(e.request).then(function(res){
            if (res && (res.ok || res.type === "opaque")) c.put(e.request, res.clone());
            return res;
          }).catch(function(){ return hit; });
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Our own files: network first so updates land, cache as the offline fallback.
  e.respondWith(
    fetch(e.request).then(function(res){
      if (res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(r){
        return r || caches.match("./index.html");
      });
    })
  );
});
