import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppLocation, AppView } from '../types/pokeapi';

// Where the user is in the app. `view`, `gen` and `pokemon` are reflected in
// the URL (so it can be reloaded, shared and used as a shortcut); `sheet` (an
// open filter or generation sheet) only lives in the history entry, so the back
// button can close it. `index` counts entries this app pushed, so an overlay
// can tell whether stepping back would leave the app.
const VIEWS: readonly AppView[] = ['browse', 'favorites', 'quiz', 'settings'];

function isAppView(value: string | null): value is AppView {
  return value !== null && (VIEWS as readonly string[]).includes(value);
}

/** Read app location from history.state (lib.dom types it as `any`). */
function historyState(): AppLocation | null {
  return window.history.state as AppLocation | null;
}

export type ParsedLocation = Omit<AppLocation, 'index'>;

export function parseLocation(search: string): ParsedLocation {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return {
    view: isAppView(view) ? view : 'browse',
    gen: params.get('gen') || null,
    pokemon: params.get('pokemon')?.toLowerCase() || null,
    sheet: null,
    // One-off launch action (the manifest's "Search" shortcut); not kept in the URL
    action: params.get('action'),
  };
}

export function buildUrl({
  view,
  gen,
  pokemon,
}: {
  view: AppView;
  gen?: string | null;
  pokemon?: string | null;
}): string {
  const params = new URLSearchParams();
  if (view !== 'browse') params.set('view', view);
  if (view === 'browse' && gen) params.set('gen', gen);
  if (pokemon) params.set('pokemon', pokemon);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

export type NavigateOptions = { replace?: boolean };

// Keeps app location in browser history: navigate() pushes (or replaces) an
// entry, and `onLocationChange` runs with the new location on back/forward.
function useHistoryLocation(onLocationChange: (location: AppLocation) => void) {
  const onChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onChangeRef.current = onLocationChange;
  });

  const [initial] = useState(() => {
    const { action, ...parsed } = parseLocation(window.location.search);
    // A reload keeps the entry's position, so closing an overlay can still step back
    const location: AppLocation = { ...parsed, index: historyState()?.index ?? 0 };
    window.history.replaceState(location, '', buildUrl(location));
    return { ...location, action };
  });

  useEffect(() => {
    const handlePopState = (e: PopStateEvent): void => {
      const state = (e.state as AppLocation | null) ?? {
        ...parseLocation(window.location.search),
        index: 0,
      };
      onChangeRef.current(state);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback(
    (changes: Partial<AppLocation>, { replace = false }: NavigateOptions = {}): AppLocation => {
      const current = historyState() ?? initial;
      // An open sheet's entry is replaced by wherever it leads (e.g. picking a
      // generation in the generation sheet), so back doesn't reopen the sheet
      const shouldReplace = replace || Boolean(current.sheet);
      const next: AppLocation = {
        ...current,
        sheet: null,
        ...changes,
        index: shouldReplace ? current.index : current.index + 1,
      };
      if (shouldReplace) window.history.replaceState(next, '', buildUrl(next));
      else window.history.pushState(next, '', buildUrl(next));
      return next;
    },
    [initial]
  );

  // Close an overlay that navigate() opened (e.g. key 'pokemon', value
  // 'pikachu'). If its entry is current and was pushed by the app, step back,
  // so back/forward stay consistent; the popstate then closes it. Otherwise
  // (a deep link, or the entry was already replaced) just drop it from the
  // current entry. Returns true if it stepped back.
  const closeOverlay = useCallback(
    (key: keyof AppLocation | string, value: unknown): boolean => {
      const current = historyState() ?? initial;
      if ((current as unknown as Record<string, unknown>)[key] !== value) return false;
      if (current.index > 0) {
        window.history.back();
        return true;
      }
      navigate({ [key]: null } as Partial<AppLocation>, { replace: true });
      return false;
    },
    [initial, navigate]
  );

  return { initial, navigate, closeOverlay };
}

export default useHistoryLocation;
