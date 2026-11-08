/* Zona Gol service worker.
 * - Static assets (/assets/* are content-hashed): cache-first.
 * - Images, fonts and icons: stale-while-revalidate.
 * - Page navigations: network-first; offline → cached shell, else /offline.html.
 * - /api/* is NEVER cached: responses carry private, per-user data.
 */
const VERSION = 'zg-v1'
const SHELL = ['/', '/offline.html', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put('/', copy))
          return res
        })
        .catch(async () => (await caches.match('/')) || (await caches.match('/offline.html'))),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(request, res.clone()))
        return res
      })),
    )
    return
  }

  if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith('/media/')) {
    event.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(request)
        const fresh = fetch(request).then((res) => {
          if (res.ok) c.put(request, res.clone())
          return res
        }).catch(() => hit)
        return hit || fresh
      }),
    )
  }
})
