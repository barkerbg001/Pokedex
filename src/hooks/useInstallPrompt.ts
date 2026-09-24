import { useState, useEffect } from 'react';

// iOS browsers never fire `beforeinstallprompt`; installing is manual via the
// Share sheet. iPadOS reports itself as a Mac, so also check for touch.
const isIos =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Captures the browser's install prompt so it can be triggered from a button.
// Mount this near the app root: `beforeinstallprompt` fires once, early, and
// is missed by anything that mounts later (e.g. the Settings screen).
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
  );

  useEffect(() => {
    if (isInstalled) return;

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar; we show our own button instead
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A prompt can only be used once; the browser fires a new event if it's still installable
    setDeferredPrompt(null);
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    // No prompt to trigger on iOS, so Settings shows how to install instead
    showIosHint: isIos && !isInstalled,
    promptInstall,
  };
}

export default useInstallPrompt;
