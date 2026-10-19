// Bump VERSION whenever you change any game file so clients pick up the update.
const VERSION='neon-tunnel-v1';
const THREE_CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ASSETS=['./','./index.html','./game.js','./manifest.json','./icon-192.png','./icon-512.png',THREE_CDN];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(VERSION).then(c=>Promise.all(ASSETS.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
  if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(VERSION).then(c=>c.put(e.request,cp))}
  return res;
 }).catch(()=>caches.match('./index.html'))));
});
