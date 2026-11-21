import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import { safeStorage } from '../../lib/supabase/client';

const INSTALL_DISMISSED_KEY = 'studora-install-dismissed-until';
const DISMISS_FOR_DAYS = 30;

function isRunningStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isAppleMobileDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function PWAExperience() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [recentlyReconnected, setRecentlyReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installableOnIOS, setInstallableOnIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [canShowInstall, setCanShowInstall] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const updateRequestedRef = useRef(false);

  useEffect(() => {
    setStandalone(isRunningStandalone());
    setInstallableOnIOS(isAppleMobileDevice());

    const dismissUntil = Number(safeStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
    if (dismissUntil > Date.now()) setCanShowInstall(false);
    const initialDelay = window.setTimeout(() => {
      if (dismissUntil <= Date.now()) setCanShowInstall(true);
    }, 8000);

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
      setCanShowInstall(false);
      safeStorage.removeItem(INSTALL_DISMISSED_KEY);
    };
    const onDisplayModeChange = () => setStandalone(isRunningStandalone());
    const onUpdateAvailable = (event) => setUpdateRegistration(event.detail || null);
    const onControllerChange = () => {
      if (!updateRequestedRef.current) return;
      updateRequestedRef.current = false;
      setUpdateRegistration(null);
      setUpdateReady(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('studora:sw-update', onUpdateAvailable);
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    displayMode?.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.clearTimeout(initialDelay);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('studora:sw-update', onUpdateAvailable);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
      displayMode?.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    let reconnectTimer;
    const handleOffline = () => {
      setOnline(false);
      setRecentlyReconnected(false);
      window.clearTimeout(reconnectTimer);
    };
    const handleOnline = () => {
      setOnline(true);
      setRecentlyReconnected(true);
      reconnectTimer = window.setTimeout(() => setRecentlyReconnected(false), 2800);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.clearTimeout(reconnectTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const dismissInstall = () => {
    safeStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now() + DISMISS_FOR_DAYS * 86400000));
    setCanShowInstall(false);
    setInstallPrompt(null);
  };

  const requestInstall = async () => {
    if (!installPrompt) {
      setShowIOSGuide(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice?.outcome === 'accepted') setCanShowInstall(false);
  };

  const applyUpdate = () => {
    const waitingWorker = updateRegistration?.waiting;
    if (!waitingWorker) {
      setUpdateRegistration(null);
      return;
    }
    updateRequestedRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  let message = null;
  let icon = null;
  let action = null;
  if (!online) {
    icon = <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />;
    message = <span>Offline. Cached files remain available; private data needs a connection.</span>;
    action = navigator.onLine
      ? <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold text-[#176B4D] underline underline-offset-4">Retry</button>
      : null;
  } else if (updateReady) {
    icon = <Check className="h-4 w-4 shrink-0" aria-hidden="true" />;
    message = <span>Update ready. Reload Studora when it’s safe to refresh your work.</span>;
    action = <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold text-[#176B4D] underline underline-offset-4">Reload</button>;
  } else if (updateRegistration) {
    icon = <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />;
    message = <span>A new Studora version is available.</span>;
    action = <button type="button" onClick={applyUpdate} className="text-xs font-bold text-[#176B4D] underline underline-offset-4">Prepare update</button>;
  } else if (!standalone && canShowInstall && (installPrompt || installableOnIOS)) {
    icon = <img src="/icons/studora-app.svg" alt="" className="h-6 w-6 shrink-0" />;
    message = <span>Add Studora to your home screen for a standalone app experience.</span>;
    action = <button type="button" onClick={requestInstall} className="text-xs font-bold text-[#176B4D] underline underline-offset-4">{installableOnIOS ? 'How to add' : 'Install'}</button>;
  }

  return (
    <>
      {recentlyReconnected && online && !message && (
        <div role="status" className="fixed z-[70] top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 rounded-full bg-[#176B4D] px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Connection restored
        </div>
      )}

      {message && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed z-[65] inset-x-3 bottom-[calc(5.7rem+env(safe-area-inset-bottom))] xl:bottom-5 xl:left-auto xl:right-5 xl:w-[min(26rem,calc(100vw-2.5rem))]"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#DDEFE5] bg-[#F6F7F3]/95 px-4 py-3 text-sm text-[#111827] shadow-[0_10px_35px_rgba(17,24,39,.16)] backdrop-blur-xl">
            <span className="text-[#176B4D]">{icon}</span>
            <span className="min-w-0 flex-1 text-xs leading-relaxed">{message}</span>
            {action}
            {online && updateReady && <button type="button" onClick={() => setUpdateReady(false)} aria-label="Dismiss update notice" className="rounded-lg p-1 text-[#667085] active:scale-95"><X className="h-4 w-4" /></button>}
            {online && updateRegistration && <button type="button" onClick={() => setUpdateRegistration(null)} aria-label="Dismiss update notice" className="rounded-lg p-1 text-[#667085] active:scale-95"><X className="h-4 w-4" /></button>}
            {online && !updateReady && !updateRegistration && installPrompt && <button type="button" onClick={dismissInstall} aria-label="Dismiss install suggestion" className="rounded-lg p-1 text-[#667085] active:scale-95"><X className="h-4 w-4" /></button>}
            {online && !updateReady && !updateRegistration && installableOnIOS && !installPrompt && <button type="button" onClick={dismissInstall} aria-label="Dismiss install suggestion" className="rounded-lg p-1 text-[#667085] active:scale-95"><X className="h-4 w-4" /></button>}
          </div>
        </aside>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowIOSGuide(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="studora-install-title" className="w-full max-w-md rounded-[24px] border border-white/70 bg-[#F6F7F3] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#176B4D]">Studora app</p>
                <h2 id="studora-install-title" className="mt-1 text-xl font-extrabold tracking-tight text-[#111827]">Add Studora to your Home Screen</h2>
              </div>
              <button type="button" onClick={() => setShowIOSGuide(false)} aria-label="Close installation guide" className="rounded-full p-2 text-[#667085] hover:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <ol className="mt-5 space-y-3 text-sm leading-relaxed text-[#475467]">
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#DDEFE5] text-xs font-bold text-[#176B4D]">1</span><span>Open this page in <strong className="text-[#111827]">Safari</strong>.</span></li>
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#DDEFE5] text-xs font-bold text-[#176B4D]">2</span><span>Tap <Share className="mx-1 inline h-4 w-4 align-[-2px] text-[#176B4D]" aria-label="Share" /> <strong className="text-[#111827]">Share</strong> in Safari’s toolbar.</span></li>
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#DDEFE5] text-xs font-bold text-[#176B4D]">3</span><span>Choose <strong className="text-[#111827]">Add to Home Screen</strong>, then confirm.</span></li>
            </ol>
            <button type="button" onClick={() => setShowIOSGuide(false)} className="mt-6 min-h-11 w-full rounded-xl bg-[#176B4D] px-4 text-sm font-bold text-white active:scale-[.99]">Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
