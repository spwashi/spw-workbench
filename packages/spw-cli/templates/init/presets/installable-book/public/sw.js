const CACHE_VERSION = 'spw-show-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/reset.css',
  '/assets/substrate.css',
  '/assets/style.css',
  '/assets/season.css',
  '/assets/enhancements.js',
  '/assets/icon.svg',
  '/fragments/site-nav.html',
  '/fragments/site-footer.html',
  '/chapters/',
  '/chapters/index.html',
  '/chapters/01-opening/',
  '/chapters/01-opening/index.html',
  '/http/get/routes.json',
  '/http/get/site.json',
  '/http/get/show.json',
  '/http/get/chapters.json',
  '/http/get/chapters/01-opening.json',
  '/llms.txt',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.filter((name) => name !== SHELL_CACHE).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }

  if (url.pathname.startsWith('/http/get/')) {
    event.respondWith(networkFirstAsset(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match('/offline.html')) || Response.error()
  }
}

async function networkFirstAsset(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  const fetched = fetch(request)
    .then((response) => {
      cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)

  return cached || fetched
}
