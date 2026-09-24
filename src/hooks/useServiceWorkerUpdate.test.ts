import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useServiceWorkerUpdate from './useServiceWorkerUpdate';
import { registerSW, applyUpdate } from '../registerSW';

vi.mock('../registerSW', () => ({
  registerSW: vi.fn(),
  applyUpdate: vi.fn(),
}));

describe('useServiceWorkerUpdate', () => {
  beforeEach(() => {
    vi.mocked(registerSW).mockReset();
    vi.mocked(applyUpdate).mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not register a service worker outside production (e.g. `vite dev`)', () => {
    // import.meta.env.PROD is false by default under Vitest
    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(registerSW).not.toHaveBeenCalled();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('registers in production and reports when an update becomes available', () => {
    vi.stubEnv('PROD', true);
    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(registerSW).toHaveBeenCalledTimes(1);
    const { onUpdateAvailable } = vi.mocked(registerSW).mock.calls[0]![0]!;
    expect(result.current.updateAvailable).toBe(false);

    const waitingWorker = { postMessage: vi.fn() } as unknown as ServiceWorker;
    act(() => onUpdateAvailable?.(waitingWorker));
    expect(result.current.updateAvailable).toBe(true);

    result.current.reload();
    expect(applyUpdate).toHaveBeenCalledWith(waitingWorker);
  });

  it('does nothing on reload() when no update is available', () => {
    vi.stubEnv('PROD', true);
    const { result } = renderHook(() => useServiceWorkerUpdate());

    result.current.reload();
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});
