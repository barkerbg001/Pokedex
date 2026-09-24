import { devWarn } from './logger';

export interface RegisterSWOptions {
  onUpdateAvailable?: (waitingWorker: ServiceWorker) => void;
}

// Registers the service worker and wires up update detection. Callers should
// only call this in production - `vite dev` serves the unbuilt sw.js (its
// build-time placeholders never get filled in), which would otherwise cache
// dev modules cache-first and can serve stale code while developing.
//
// `onUpdateAvailable(waitingWorker)` fires once a new SW has installed and is
// waiting to take over (whether found on this visit or already waiting from
// an earlier one); pass its argument to applyUpdate() to switch to it.
export function registerSW({ onUpdateAvailable }: RegisterSWOptions = {}): void {
  if (!('serviceWorker' in navigator)) return;

  // clients.claim() in sw.js (see there) fires 'controllerchange' the very
  // first time this page is claimed too - going from no controller to one,
  // on a first-ever visit/install - not just when an update replaces an
  // existing controller. Only the latter should force a reload; the former
  // is just this SW starting to serve a page that loaded fine without it.
  // `hadController` tracks this across events (not just a one-time snapshot
  // at load): on a fresh install it starts false, so that first claim is
  // skipped, but it's then true for the rest of this page's lifetime - a
  // real update later in the same session (tab left open) still reloads.
  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const isFirstClaim = !hadController;
    hadController = true;
    if (isFirstClaim || reloading) return;
    reloading = true;
    window.location.reload();
  });

  const doRegister = (): void => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const notifyIfWaiting = (): void => {
          if (registration.waiting) onUpdateAvailable?.(registration.waiting);
        };
        // Already waiting from a previous visit (e.g. this tab was open when
        // an update installed but nobody applied it)
        notifyIfWaiting();

        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', function (this: ServiceWorker) {
            if (this.state === 'installed') notifyIfWaiting();
          });
        });

        // Check for updates every hour, and whenever the tab regains focus -
        // a backgrounded tab wouldn't otherwise notice a new deploy
        const checkForUpdate = (): Promise<ServiceWorkerRegistration> => registration.update();
        setInterval(checkForUpdate, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      })
      .catch((registrationError: unknown) => {
        devWarn('SW registration failed: ', registrationError);
      });
  };

  // This used to run from a plain <script> at the bottom of the page, where
  // waiting for 'load' was reliably safe. Called from a React effect instead,
  // it can easily run *after* 'load' has already fired (mount/paint/effects
  // happen a tick or more after the module script's synchronous top-level
  // code, and a small app finishes loading fast) - in which case the
  // listener below would simply never fire and the SW would never register.
  if (document.readyState === 'complete') doRegister();
  else window.addEventListener('load', doRegister);
}

// Tells a waiting worker (as handed to onUpdateAvailable) to activate now;
// the controllerchange listener registered above reloads the page once it does
export function applyUpdate(waitingWorker: ServiceWorker): void {
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
