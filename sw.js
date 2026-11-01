// 앱으로 설치했을 때 쓰는 서비스 워커: 늘 최신 기록을 먼저 받고(네트워크 우선), 인터넷이 끊기면 마지막으로 받은 화면을 보여 준다
const CACHE = 'wk-data-v1';
const SHELL = ['/', '/index.html', '/assets/app.css', '/assets/app.js', '/assets/i18n.js', '/data.js', '/assets/logo.svg'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  // 다른 사이트(글꼴·지도 등), 관리자 화면, 방문 기록은 건드리지 않는다
  if (e.request.method !== 'GET' || u.origin !== location.origin || /^\/(admin|api|_admin)/.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/'))));
});
