document.documentElement.classList.add('js-enhanced')
document.body.dataset.js = 'ready'
document.body.dataset.online = navigator.onLine ? 'online' : 'offline'

const STATUS_NOTICE_ID = 'spw-status-notice'
let installPromptEvent = null

void hydrateFragments()
wireInstallButtons()
wireServiceWorker()
window.addEventListener('online', () => {
  document.body.dataset.online = 'online'
})
window.addEventListener('offline', () => {
  document.body.dataset.online = 'offline'
})

async function hydrateFragments() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'))
  await Promise.all(nodes.map(async (node) => {
    const source = node.getAttribute('data-include')
    if (!source) return
    try {
      const response = await fetch(source, { headers: { 'X-Requested-With': 'spw-enhancements' } })
      if (!response.ok) return
      node.innerHTML = await response.text()
    } catch {
      // Keep the inline fallback when the fragment cannot be fetched.
    }
  }))
}

function wireInstallButtons() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPromptEvent = event
    for (const button of document.querySelectorAll('[data-install-app]')) {
      button.hidden = false
      button.addEventListener('click', installApp, { once: false })
    }
  })
}

async function installApp() {
  if (!installPromptEvent) return
  await installPromptEvent.prompt()
  installPromptEvent = null
  for (const button of document.querySelectorAll('[data-install-app]')) {
    button.hidden = true
  }
}

async function wireServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  if (!window.isSecureContext && location.hostname !== 'localhost') return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    if (registration.waiting) {
      showUpdateNotice(registration)
    }

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotice(registration)
        }
      })
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  } catch {
    // Progressive enhancement stays optional.
  }
}

function showUpdateNotice(registration) {
  const existing = document.getElementById(STATUS_NOTICE_ID)
  if (existing) {
    existing.classList.add('is-visible')
    return
  }

  const notice = document.createElement('div')
  notice.id = STATUS_NOTICE_ID
  notice.className = 'spw-notice is-visible'
  notice.innerHTML = [
    '<strong>Update ready</strong>',
    '<span>A fresh version of the show is available. Refresh when you want the latest cached shell.</span>',
    '<div class="spw-actions">',
    '<button class="spw-button" type="button" data-refresh-site>Refresh now</button>',
    '<button class="spw-button spw-button--secondary" type="button" data-dismiss-notice>Later</button>',
    '</div>',
  ].join('')

  document.querySelector('.spw-page')?.prepend(notice)

  notice.querySelector('[data-refresh-site]')?.addEventListener('click', () => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
  })

  notice.querySelector('[data-dismiss-notice]')?.addEventListener('click', () => {
    notice.classList.remove('is-visible')
  })
}
