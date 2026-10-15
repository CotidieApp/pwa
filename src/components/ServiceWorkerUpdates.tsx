'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function ServiceWorkerUpdates() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let requestedReload = false;
    let wasControlled = !!navigator.serviceWorker.controller;
    let registration: ServiceWorkerRegistration | undefined;
    let shownWorker: ServiceWorker | null = null;
    let dismissNotice: (() => void) | undefined;
    const observed = new Map<ServiceWorker, () => void>();

    const offerReload = (worker: ServiceWorker) => {
      if (disposed || shownWorker === worker) return;
      shownWorker = worker;
      dismissNotice?.();
      const notice = toast({
        title: 'Hay una actualización de Cotidie disponible',
        description: 'Guarda cualquier edición pendiente y pulsa Actualizar cuando quieras recargar.',
        duration: Infinity,
        action: <ToastAction altText="Actualizar y recargar Cotidie" onClick={() => {
          requestedReload = true;
          if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          else window.location.reload();
        }}>Actualizar</ToastAction>,
      });
      dismissNotice = notice.dismiss;
    };

    const checkWaiting = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) offerReload(registration.waiting);
    };
    const watchInstalling = () => {
      const worker = registration?.installing;
      if (!worker || observed.has(worker)) return;
      const onStateChange = () => { if (worker.state === 'installed') checkWaiting(); };
      observed.set(worker, onStateChange);
      worker.addEventListener('statechange', onStateChange);
    };
    const onControllerChange = () => {
      if (requestedReload) window.location.reload();
      else if (wasControlled && navigator.serviceWorker.controller) offerReload(navigator.serviceWorker.controller);
      wasControlled = true;
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    void navigator.serviceWorker.ready.then(activeRegistration => {
      if (disposed) return;
      registration = activeRegistration;
      registration.addEventListener('updatefound', watchInstalling);
      watchInstalling();
      checkWaiting();
    });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      registration?.removeEventListener('updatefound', watchInstalling);
      for (const [worker, listener] of observed) worker.removeEventListener('statechange', listener);
      dismissNotice?.();
    };
  }, []);

  return null;
}
