import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerSW, applyUpdate } from './registerSW';

// A minimal fake EventTarget, just enough for registerSW's own
// addEventListener/dispatch usage on navigator.serviceWorker, a registration
// and an installing worker
function fakeEventTarget() {
  const listeners = {};
  return {
    addEventListener: (type, handler) => {
      (listeners[type] ??= []).push(handler);
    },
    dispatch(type, event) {
      (listeners[type] || []).forEach((handler) => handler.call(this, event));
    },
  };
}

describe('registerSW', () => {
  let originalServiceWorker;
  let reloadSpy;

  let originalLocation;
  let originalReadyState;

  beforeEach(() => {
    originalServiceWorker = navigator.serviceWorker;
    // jsdom's real location.reload() isn't implemented and logs a console
    // error; `location.reload` itself isn't configurable, but `location` as a
    // whole (an own property of `window`) can be replaced
    originalLocation = window.location;
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });
    // jsdom's default readyState is already 'complete'
    originalReadyState = document.readyState;
  });

  afterEach(() => {
    // jsdom has no native serviceWorker property to restore, so put things
    // back exactly as found (present or absent) rather than always defining one
    if (originalServiceWorker === undefined) delete navigator.serviceWorker;
    else {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
        writable: true,
      });
    }
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: originalReadyState,
    });
  });

  function fakeServiceWorkerContainer(registration, { controller = null } = {}) {
    const container = {
      ...fakeEventTarget(),
      controller,
      register: vi.fn().mockResolvedValue(registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: container,
      configurable: true,
      writable: true,
    });
    return container;
  }

  it('does nothing when the browser has no serviceWorker support', () => {
    // jsdom doesn't implement navigator.serviceWorker at all, matching Safari/Firefox
    expect('serviceWorker' in navigator).toBe(false);
    expect(() => registerSW({ onUpdateAvailable: vi.fn() })).not.toThrow();
  });

  it('registers immediately if the page has already finished loading', async () => {
    // Called from a React effect (after mount/paint), registerSW can easily
    // run after 'load' has already fired for a fast-loading page - unlike the
    // classic "plain <script> at the bottom of the page" version of this
    // pattern, where waiting for 'load' was always safe
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' });
    const registration = { ...fakeEventTarget(), waiting: { id: 'waiting' } };
    const container = fakeServiceWorkerContainer(registration);
    const onUpdateAvailable = vi.fn();

    registerSW({ onUpdateAvailable });
    await Promise.resolve();
    await Promise.resolve();

    expect(container.register).toHaveBeenCalledWith('/sw.js');
    expect(onUpdateAvailable).toHaveBeenCalledWith(registration.waiting);
  });

  it('waits for the load event when the page is still loading', async () => {
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' });
    const registration = { ...fakeEventTarget(), waiting: null };
    const container = fakeServiceWorkerContainer(registration);

    registerSW({ onUpdateAvailable: vi.fn() });
    await Promise.resolve();
    expect(container.register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(container.register).toHaveBeenCalledWith('/sw.js');
  });

  it('reports a new worker once it finishes installing', async () => {
    const installing = fakeEventTarget();
    installing.state = 'installing';
    const registration = { ...fakeEventTarget(), waiting: null, installing };
    fakeServiceWorkerContainer(registration);
    const onUpdateAvailable = vi.fn();

    registerSW({ onUpdateAvailable });
    await Promise.resolve();
    await Promise.resolve();
    expect(onUpdateAvailable).not.toHaveBeenCalled();

    registration.dispatch('updatefound');
    // Still installing: not waiting yet
    installing.dispatch('statechange');
    expect(onUpdateAvailable).not.toHaveBeenCalled();

    installing.state = 'installed';
    registration.waiting = installing;
    installing.dispatch('statechange');
    expect(onUpdateAvailable).toHaveBeenCalledWith(installing);
  });

  it('does not reload on the very first install (no prior controller) claiming this page', async () => {
    // clients.claim() in sw.js (see there) fires 'controllerchange' on a
    // first-ever install too, going from no controller to one - the page
    // already loaded fine uncontrolled, so there's nothing to reload for
    const registration = { ...fakeEventTarget(), waiting: null };
    const container = fakeServiceWorkerContainer(registration, { controller: null });

    registerSW({ onUpdateAvailable: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();

    container.dispatch('controllerchange');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('does reload for a real update later in the same session, after that first claim', async () => {
    // Regression check: `hadController` must track state across events, not
    // just snapshot it once at load - otherwise a fresh install (which
    // starts with no controller, so its own first claim is correctly
    // skipped above) would never reload for a genuine update either, for as
    // long as that tab stays open
    const registration = { ...fakeEventTarget(), waiting: null };
    const container = fakeServiceWorkerContainer(registration, { controller: null });

    registerSW({ onUpdateAvailable: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();

    container.dispatch('controllerchange'); // the first-ever claim
    expect(reloadSpy).not.toHaveBeenCalled();

    container.dispatch('controllerchange'); // a real update, later, same session
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads once when an update replaces an existing controller', async () => {
    const registration = { ...fakeEventTarget(), waiting: null };
    const container = fakeServiceWorkerContainer(registration, { controller: { id: 'old-sw' } });

    registerSW({ onUpdateAvailable: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();

    container.dispatch('controllerchange');
    container.dispatch('controllerchange');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('logs a dev warning when registration fails, without throwing', async () => {
    const container = {
      ...fakeEventTarget(),
      register: vi.fn().mockRejectedValue(new Error('nope')),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: container,
      configurable: true,
      writable: true,
    });

    expect(() => registerSW({ onUpdateAvailable: vi.fn() })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe('applyUpdate', () => {
  it('asks the waiting worker to skip waiting', () => {
    const worker = { postMessage: vi.fn() };
    applyUpdate(worker);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
