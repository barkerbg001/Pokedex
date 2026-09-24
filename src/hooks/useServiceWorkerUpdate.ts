import { useCallback, useEffect, useState } from 'react';
import { registerSW, applyUpdate } from '../registerSW';

// Registers the service worker in production and reports when a new version
// has installed and is ready to switch to (see src/registerSW.js).
function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    // vite dev serves the unbuilt sw.js, whose build-time placeholders are
    // never filled in - only register against a real build
    if (!import.meta.env.PROD) return;
    registerSW({ onUpdateAvailable: setWaitingWorker });
  }, []);

  const reload = useCallback(() => {
    if (waitingWorker) applyUpdate(waitingWorker);
  }, [waitingWorker]);

  return { updateAvailable: Boolean(waitingWorker), reload };
}

export default useServiceWorkerUpdate;
