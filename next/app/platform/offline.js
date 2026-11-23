// Registers the service worker (sw.js beside index.html), which keeps the app's own files on the phone
// so it opens with no signal (brief section 4). Also notices when a newer version of the app has been
// downloaded and is waiting, so the screen can offer it with one tap.
// NOT verified on a Mac in Home Screen mode: opening in airplane mode is on the phone checklist.

export function offlineSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * @param {{ onUpdateReady: (apply: () => void) => void }} handlers
 *   `onUpdateReady` is called when a new version is ready. Calling `apply` switches to it and reloads.
 * @returns {{ supported: boolean, check: () => void }} `check` asks the server for a newer version.
 */
export function registerOffline({ onUpdateReady }) {
  if (!offlineSupported()) return { supported: false, check() {} };
  const container = navigator.serviceWorker;
  let registration = null;
  let applying = false;

  const apply = () => {
    const waiting = registration && registration.waiting;
    if (!waiting) return;
    applying = true;
    waiting.postMessage({ type: 'activate' });
  };

  // The new worker has taken over. Reload once so the page and its files are the same version.
  container.addEventListener('controllerchange', () => {
    if (applying) globalThis.location.reload();
  });

  const announceIfWaiting = () => {
    // A waiting worker with no controller is a first install, not an update.
    if (registration && registration.waiting && container.controller) onUpdateReady(apply);
  };

  container
    .register('sw.js')
    .then((reg) => {
      registration = reg;
      announceIfWaiting();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') announceIfWaiting();
        });
      });
    })
    .catch(() => {
      // No service worker (private mode, or a browser that refuses): the app still works with a connection.
    });

  return {
    supported: true,
    check() {
      if (registration) registration.update().catch(() => {});
    },
  };
}
