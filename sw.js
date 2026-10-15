/* 한자 노트 service worker
   - 앱 본문(index.html)은 항상 네트워크 우선: 새 버전이 올라오면 바로 반영. 오프라인일 때만 마지막 사본 사용.
   - 아이콘·매니페스트·폰트 등 정적 파일은 캐시 우선.
   - 복습 알림(Web Push) 수신·표시, 앱 아이콘 배지. */
const VER = 'kn-v3';
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

/* ---- push ---- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || '한자 노트';
  const opts = {
    body: d.body || '복습할 한자가 기다려요.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || 'kn-review',
    renotify: !!d.renotify,
    data: { url: d.url || './', kind: d.kind || 'review' }
  };
  const work = [self.registration.showNotification(title, opts)];
  if ('setAppBadge' in self.navigator && typeof d.badge === 'number') {
    work.push(d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge());
  }
  e.waitUntil(Promise.all(work).catch(() => {}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || './', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.focus(); c.postMessage({ type: 'open-review' }); return; } }
    return self.clients.openWindow(target);
  }));
});
