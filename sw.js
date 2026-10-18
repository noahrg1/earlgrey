/* Gulf Ops offline cache.
   App shell: cached on install, served cache-first, refreshed in the background.
   Map tiles: cached as you view them (capped), so areas you've looked at work offline.
   Forecasts: network first, falling back to the last forecast you loaded. */
const VER='gulf-ops-202610181814';
const SHELL=['./','index.html','leaflet.js','leaflet.css','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>!k.startsWith(VER)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function trim(name,max){const c=await caches.open(name),ks=await c.keys();for(let i=0;i<ks.length-max;i++)await c.delete(ks[i]);}
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.origin===location.origin){ // app shell: cache first, update in the background
    e.respondWith(caches.open(VER).then(async c=>{const hit=await c.match(e.request,{ignoreSearch:true});
      const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r;}).catch(()=>hit);
      return hit||net;}));
    return;
  }
  if(/basemaps\.cartocdn\.com|tiles\.openseamap\.org/.test(u.host)){ // map tiles: cache as you browse
    e.respondWith(caches.open(VER+'-tiles').then(async c=>{const hit=await c.match(e.request);if(hit)return hit;
      try{const r=await fetch(e.request);if(r.ok){c.put(e.request,r.clone());trim(VER+'-tiles',3000);}return r;}catch(err){return hit||Response.error();}}));
    return;
  }
  if(/open-meteo\.com/.test(u.host)){ // forecasts: network first, last known when offline
    e.respondWith(caches.open(VER+'-wx').then(async c=>{try{const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r;}catch(err){return (await c.match(e.request))||Response.error();}}));
  }
});
