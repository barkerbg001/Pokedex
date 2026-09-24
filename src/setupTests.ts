// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Test files run in parallel, and a file's first render (cold imports, the
// whole Pokedex tree) can take over the default 1s findBy/waitFor timeout on a
// busy machine
configure({ asyncUtilTimeout: 10000 });

// A few test files (e.g. sw.test.js, which loads public/sw.js into a fake
// ServiceWorkerGlobalScope) opt into `// @vitest-environment node`, which has
// no `window`/DOM globals - this file still runs for them, so guard the
// jsdom-only setup below rather than crashing every test file that isn't jsdom.
if (typeof window !== 'undefined') {
  // Mock IntersectionObserver for tests. Reports every observed element as
  // visible, so infinite-scroll loaders load their first batch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.IntersectionObserver = class IntersectionObserver {
    callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      queueMicrotask(() =>
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as any)
      );
    }

    disconnect(): void {}
    unobserve(_target: Element): void {}
  } as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.ResizeObserver = class ResizeObserver {
    observe(_target?: Element): void {}
    disconnect(): void {}
    unobserve(_target?: Element): void {}
  } as any;

  window.matchMedia =
    window.matchMedia ||
    ((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }));
}
