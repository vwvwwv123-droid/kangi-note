/* 한자 노트 service worker
   - 앱 본문(index.html)은 항상 네트워크 우선: 새 버전이 올라오면 바로 반영. 오프라인일 때만 마지막 사본 사용.
   - 아이콘·매니페스트·폰트 등 정적 파일은 캐시 우선. */
const VER = 'kn-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isApp = url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  if (isApp || req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('./index.html', cp)).catch(() => {}); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)).catch(() => {}); } return r; })));
  }
});
