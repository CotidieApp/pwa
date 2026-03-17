import { useEffect, type MutableRefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem } from '@capacitor/filesystem';
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import type { NavigationState } from '@/components/main/navigation';

type TracePush = (event: {
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  data?: string;
}) => void;

export const useAndroidBackButton = (
  navStateRef: MutableRefObject<NavigationState>,
  onBack: () => void,
) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;

    let listener: { remove: () => void } | null = null;

    const setup = async () => {
      listener = await App.addListener('backButton', () => {
        const s = navStateRef.current;

        if (s.activeView !== 'home') {
          onBack();
          return;
        }

        App.exitApp();
      });
    };

    void setup();

    return () => {
      listener?.remove();
    };
  }, [navStateRef, onBack]);
};

export const useNotificationActionBinding = ({
  togglePlanDeVidaItem,
  handleRouteNavigation,
  handleOpenPrayerById,
  handleOpenCategoryById,
  pushDevLiveTrace,
}: {
  togglePlanDeVidaItem: (id: string, force?: boolean, skipStatIncrement?: boolean, eventDateKey?: string | null) => void;
  handleRouteNavigation: (route: string) => void;
  handleOpenPrayerById: (id: string, options?: { countOpen?: boolean }) => void;
  handleOpenCategoryById: (id: string) => void;
  pushDevLiveTrace: TracePush;
}) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
      const extra = action.notification.extra as any;
      const actionId = action.actionId;
      if (actionId === 'dismiss') {
        return;
      }
      if (actionId === 'mark_prayed') {
        const target = extra?.target as { type?: string; id?: string } | undefined;
        if (target?.type === 'prayer' && typeof target.id === 'string') {
          const actionDateKey = typeof extra?.date === 'string' ? extra.date : typeof extra?.dateKey === 'string' ? extra.dateKey : null;
          togglePlanDeVidaItem(target.id, true, false, actionDateKey);
        }
        void LocalNotifications.cancel({ notifications: [{ id: action.notification.id }] }).catch(() => {});
        return;
      }
      pushDevLiveTrace({
        level: 'info',
        source: 'notifications',
        message: 'Notificacion tocada por usuario.',
        data: `id=${action.notification.id}`,
      });
      const route = typeof extra?.route === 'string' ? extra.route : null;
      if (route) {
        pushDevLiveTrace({
          level: 'info',
          source: 'notifications',
          message: 'Navegacion por ruta de notificacion.',
          data: route,
        });
        handleRouteNavigation(route);
        return;
      }
      const target = extra?.target as { type?: string; id?: string } | undefined;
      if (target?.type === 'prayer' && typeof target.id === 'string') {
        pushDevLiveTrace({
          level: 'info',
          source: 'notifications',
          message: 'Navegacion a oracion por notificacion.',
          data: target.id,
        });
        handleOpenPrayerById(target.id);
        return;
      }
      if (target?.type === 'category' && typeof target.id === 'string') {
        pushDevLiveTrace({
          level: 'info',
          source: 'notifications',
          message: 'Navegacion a categoria por notificacion.',
          data: target.id,
        });
        handleOpenCategoryById(target.id);
      }
    });

    return () => {
      sub.then((handle) => handle.remove()).catch(() => {});
    };
  }, [handleOpenCategoryById, handleOpenPrayerById, handleRouteNavigation, pushDevLiveTrace, togglePlanDeVidaItem]);
};

export const useSharedImportBinding = ({
  pendingImportStorageKey,
  pushDevLiveTrace,
}: {
  pendingImportStorageKey: string;
  pushDevLiveTrace: TracePush;
}) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const extractImportUri = (rawUrl: string): string | null => {
      const trimmed = rawUrl.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('content://') || trimmed.startsWith('file://')) return trimmed;
      try {
        const parsed = new URL(trimmed);
        const uriParam = parsed.searchParams.get('uri') || parsed.searchParams.get('file');
        if (uriParam && (uriParam.startsWith('content://') || uriParam.startsWith('file://'))) {
          return decodeURIComponent(uriParam);
        }
        if (/\.(ctd|json)$/i.test(parsed.pathname)) return trimmed;
      } catch {
        if (/\.(ctd|json)$/i.test(trimmed)) return trimmed;
      }
      return null;
    };

    const decodeFileData = (data: string) => {
      const trimmed = data.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return data;
      try {
        return atob(data);
      } catch {
        return data;
      }
    };

    const processImportUrl = async (rawUrl: string) => {
      const importUri = extractImportUri(rawUrl);
      if (!importUri) return;
      try {
        const result = await Filesystem.readFile({ path: importUri });
        const payload = decodeFileData(String(result.data ?? ''));
        if (!payload.trim()) return;
        window.localStorage.setItem(pendingImportStorageKey, payload);
        window.dispatchEvent(new Event('cotidie-pending-import'));
        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Archivo recibido por appUrlOpen.',
          data: importUri,
        });
      } catch (error) {
        console.error('No se pudo procesar importacion por appUrlOpen:', error);
        pushDevLiveTrace({
          level: 'error',
          source: 'import',
          message: 'Fallo leyendo archivo compartido (appUrlOpen).',
          data: importUri,
        });
      }
    };

    let listener: { remove: () => Promise<void> } | null = null;
    App.addListener('appUrlOpen', ({ url }) => {
      if (typeof url === 'string' && url.length > 0) {
        void processImportUrl(url);
      }
    }).then((handle) => {
      listener = handle;
    });

    App.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        void processImportUrl(launch.url);
      }
    }).catch(() => {});

    return () => {
      listener?.remove().catch(() => {});
    };
  }, [pendingImportStorageKey, pushDevLiveTrace]);
};
