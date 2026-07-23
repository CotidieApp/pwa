import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { categories } from '@/lib/data';
import type { Prayer } from '@/lib/types';
import { fixedNotifications, type FixedNotificationEntry } from '@/lib/fixed-notifications';
import { addByKind, addDays, formatTemplate, getNextOccurrence, parseFixedNotificationDate } from '@/context/settings/notification-date-utils';
import { getEasterDate } from '@/lib/movable-feasts';
import { useToast } from '@/hooks/use-toast';
import type { DailyReminder, Theme } from './types';

const NOTIFICATION_ACTION_TYPE_ID = 'cotidie-prayer-actions';
const CARTAS_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const CARTAS_REMINDER_REACTIVATION_DELAY_MS = 60 * 1000;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_ANDROID = 1;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_IOS = 12;
const NOTIFICATION_SCHEDULE_BATCH_SIZE = 24;
const ANDROID_NOTIFICATION_SCHEDULE_LIMIT = 32;
const IOS_NOTIFICATION_SCHEDULE_LIMIT = 60;

type UseNotificationSchedulingParams = {
  isLoaded: boolean;
  notificationsEnabled: boolean;
  dailyReminders: DailyReminder[];
  cartasReminderEnabled: boolean;
  cartasReminderAnchorAt: number;
  devTestNotificationEnabled: boolean;
  isDeveloperMode: boolean;
  notificationSyncVersion: number;
  theme: Theme;
  skipNotificationIfChecked: boolean;
  planDeVidaCalendar: Record<string, string[]>;
  allPrayers: Prayer[];
  getPrayerById: (id: string, list: Prayer[]) => Prayer | null;
  getRootPlanDeVidaId: (prayerId: string) => string | null;
  exactAlarmSettingsRequestedRef: MutableRefObject<boolean>;
  toast: ReturnType<typeof useToast>['toast'];
};

export const useNotificationScheduling = ({
  isLoaded,
  notificationsEnabled,
  dailyReminders,
  cartasReminderEnabled,
  cartasReminderAnchorAt,
  devTestNotificationEnabled,
  isDeveloperMode,
  notificationSyncVersion,
  theme,
  skipNotificationIfChecked,
  planDeVidaCalendar,
  allPrayers,
  getPrayerById,
  getRootPlanDeVidaId,
  exactAlarmSettingsRequestedRef,
  toast,
}: UseNotificationSchedulingParams) => {
  const getReminderTitle = useCallback((target: DailyReminder['target']) => {
    if (target.type === 'category') {
      return categories.find((c) => c.id === target.id)?.name ?? 'Recordatorio';
    }
    const prayer = getPrayerById(target.id, allPrayers);
    return prayer?.title ?? 'Recordatorio';
  }, [allPrayers, getPrayerById]);

  const buildDefaultReminderMessage = useCallback((target: DailyReminder['target']) => {
    if (target.type === 'category') {
      const name = categories.find((c) => c.id === target.id)?.name ?? 'Devociones';
      return `Recuerda tus ${name.toLowerCase()}.`;
    }
    const prayer = getPrayerById(target.id, allPrayers);
    const title = prayer?.title ?? 'tu oración';
    if (target.id === 'santa-misa') return `Recuerda tu hora de ${title}.`;
    return `Recuerda rezar ${title}.`;
  }, [allPrayers, getPrayerById]);

  const ensureAndroidNotificationChannel = useCallback(async () => {
    if (Capacitor.getPlatform() !== 'android') return;
    const channelId = 'cotidie-reminders';
    const channels = await LocalNotifications.listChannels().catch(() => ({ channels: [] }));
    const exists = channels.channels.some((c) => c.id === channelId);
    if (exists) return;
    await LocalNotifications.createChannel({
      id: channelId,
      name: 'Recordatorios Cotidie',
      description: 'Recordatorios diarios',
      importance: 4,
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!Capacitor.isNativePlatform()) return;

    const active = notificationsEnabled ? dailyReminders.filter((r) => r.enabled) : [];
    const fixedActive = fixedNotifications
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => notificationsEnabled || !entry.requiresNotificationsEnabled);
    const cartasReminderActive = notificationsEnabled && cartasReminderEnabled;

    const sync = async () => {
      const now = new Date();
      const platform = Capacitor.getPlatform();
      const maxTotal = platform === 'ios' ? IOS_NOTIFICATION_SCHEDULE_LIMIT : ANDROID_NOTIFICATION_SCHEDULE_LIMIT;
      const monthlyFixedOccurrenceLimit =
        platform === 'ios'
          ? MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_IOS
          : MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_ANDROID;
      const totalSources = active.length + fixedActive.length + (cartasReminderActive ? 1 : 0);
      const horizonDays = Math.min(30, Math.max(1, Math.floor(maxTotal / Math.max(1, totalSources))));
      const horizonEnd = new Date(now);
      horizonEnd.setDate(now.getDate() + horizonDays);

      const cancelPendingNotifications = async () => {
        const pending = await LocalNotifications.getPending().catch(() => null);
        const pendingIds =
          pending && Array.isArray((pending as any).notifications)
            ? ((pending as any).notifications as Array<{ id: number }>).map((n) => n.id).filter(Number.isFinite)
            : [];
        if (pendingIds.length === 0) return;
        await LocalNotifications.cancel({ notifications: pendingIds.map((id) => ({ id })) }).catch((error) => {
          console.warn('Failed to cancel pending notifications', error);
        });
      };

      if (active.length === 0 && fixedActive.length === 0 && !cartasReminderActive) {
        await cancelPendingNotifications();
        return;
      }

      const currentPerms = await LocalNotifications.checkPermissions().catch((error) => {
        console.warn('Failed to check notification permissions', error);
        return null;
      });
      if (!currentPerms || currentPerms.display !== 'granted') {
        return;
      }

      if (platform === 'android') {
        const anyLN = LocalNotifications as any;
        if (typeof anyLN.checkExactNotificationSetting === 'function') {
          const status = await anyLN.checkExactNotificationSetting().catch(() => null);
          if (status?.exact_alarm !== 'granted') {
            console.warn('Exact alarm access is required. Notification synchronization is paused.');
            if (
              typeof anyLN.changeExactNotificationSetting === 'function' &&
              !exactAlarmSettingsRequestedRef.current
            ) {
              exactAlarmSettingsRequestedRef.current = true;
              toast({
                title: 'Activa alarmas exactas',
                description: 'Android debe permitir alarmas exactas para entregar los recordatorios a la hora configurada.',
              });
              await anyLN.changeExactNotificationSetting().catch(() => {
                exactAlarmSettingsRequestedRef.current = false;
              });
            }
            return;
          }
          exactAlarmSettingsRequestedRef.current = false;
        }
      }

      await cancelPendingNotifications();

      try {
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: NOTIFICATION_ACTION_TYPE_ID,
              actions: [
                { id: 'mark_prayed', title: 'Marcar como rezado' },
                { id: 'dismiss', title: 'Descartar', destructive: true },
              ],
            },
          ],
        });
      } catch {}

      await ensureAndroidNotificationChannel().catch((error) => {
        console.warn('Failed to ensure Android notification channel', error);
      });

      const icon = theme === 'dark' ? 'small_icon_white' : 'small_icon_black';

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const toDateKey = (d: Date) =>
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

      const toNotificationId = (key: string) => {
        let hash = 2166136261;
        for (let i = 0; i < key.length; i++) {
          hash ^= key.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        const normalized = hash >>> 0;
        const id = normalized % 2147483647;
        return id === 0 ? 1 : id;
      };

      const toAndroidDrawableResource = (path: string) => {
        let normalized = path.replace(/\\/g, '/').toLowerCase();
        normalized = normalized.replace(/^\.?\//, '');
        let ext = '';
        const dot = normalized.lastIndexOf('.');
        const slash = normalized.lastIndexOf('/');
        if (dot > slash) {
          ext = normalized.slice(dot + 1);
          normalized = normalized.slice(0, dot);
        }
        let resource = normalized.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        if (!/^[a-z]/.test(resource)) resource = `img_${resource}`;
        if (ext) resource = `${resource}_${ext}`;
        return resource;
      };

      const getNotificationActionTypeId = (target?: { type?: string } | null) =>
        target?.type === 'prayer' ? NOTIFICATION_ACTION_TYPE_ID : undefined;

      const getNotificationFireTime = (notification: any) => {
        const at = notification?.schedule?.at;
        if (at instanceof Date) return at.getTime();
        if (at) {
          const parsed = new Date(at).getTime();
          if (Number.isFinite(parsed)) return parsed;
        }
        return Number.MAX_SAFE_INTEGER;
      };

      const notifications: Array<any> = [];
      for (const r of active) {
        const message =
          r.message.trim().length > 0 ? r.message : buildDefaultReminderMessage(r.target);
        const base = new Date(now);
        base.setHours(r.time.hours, r.time.minutes, 0, 0);
        if (base.getTime() <= now.getTime()) {
          base.setDate(base.getDate() + 1);
        }
        for (let offset = 0; offset < horizonDays; offset++) {
          const fireAt = new Date(base);
          fireAt.setDate(base.getDate() + offset);
          const dateKey = toDateKey(fireAt);

          if (skipNotificationIfChecked && r.target.type === 'prayer') {
            const rootId = getRootPlanDeVidaId(r.target.id);
            const targetId = rootId || r.target.id;
            const alreadyChecked = (planDeVidaCalendar[dateKey] || []).includes(targetId);
            if (alreadyChecked) continue;
          }

          const id = toNotificationId(`cotidie:${r.id}:${dateKey}`);
          notifications.push({
            id,
            title: getReminderTitle(r.target),
            body: message,
            channelId: 'cotidie-reminders',
            smallIcon: icon,
            actionTypeId: getNotificationActionTypeId(r.target),
            schedule: {
              at: fireAt,
              allowWhileIdle: true,
            },
            extra: { target: r.target, reminderId: r.id, date: dateKey },
          });
        }
      }

      if (cartasReminderActive) {
        const anchorAt =
          Number.isFinite(cartasReminderAnchorAt) && cartasReminderAnchorAt > 0
            ? cartasReminderAnchorAt
            : now.getTime();
        const dueAt = anchorAt + CARTAS_REMINDER_INTERVAL_MS;
        const fireAt = new Date(
          dueAt > now.getTime()
            ? dueAt
            : now.getTime() + CARTAS_REMINDER_REACTIVATION_DELAY_MS
        );
        const id = toNotificationId(`cartas:inactive:${anchorAt}`);
        notifications.push({
          id,
          title: 'Cartas',
          body: 'Han pasado 30 días sin escribir una carta nueva. Háblale al Señor de hijo a Padre.',
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          schedule: {
            at: fireAt,
            allowWhileIdle: true,
          },
          extra: {
            target: { type: 'prayer', id: 'cartas' },
            cartasInactivityReminder: true,
            anchorAt,
            dueAt,
          },
        });
      }

      if (fixedActive.length > 0) {
        fixedActive.forEach(({ entry, index }: { entry: FixedNotificationEntry; index: number }) => {
          if (entry.devOnly && !isDeveloperMode) return;
          const parsed = parseFixedNotificationDate(entry.date, now);
          if (!parsed) {
            console.warn('Invalid fixed notification date', entry);
            return;
          }
          let next = getNextOccurrence(parsed.date, parsed.kind, now, parsed.relative);
          const fixedRecurrence =
            parsed.kind === 'monthly' || parsed.kind === 'relative-monthly' || parsed.kind === 'yearly'
              ? parsed.kind
              : null;
          const fixedOccurrenceLimit =
            parsed.kind === 'monthly' || parsed.kind === 'relative-monthly'
              ? monthlyFixedOccurrenceLimit
              : !entry.requiresNotificationsEnabled && parsed.kind === 'yearly'
                ? 1
                : null;
          let fixedOccurrences = 0;
          while (fixedOccurrenceLimit !== null ? fixedOccurrences < fixedOccurrenceLimit : next.getTime() <= horizonEnd.getTime()) {
            const dateKey = toDateKey(next);
            const id = toNotificationId(`fixed:${index}:${entry.date}:${dateKey}`);
            let imagePath: string | null = null;
            if (typeof entry.image === 'string') {
              if (entry.image.startsWith('./')) {
                imagePath = `/${entry.image.slice(2)}`;
              } else {
                console.warn('Invalid fixed notification image path (use ./...):', entry.image);
              }
            }
            const imageDrawable = imagePath ? toAndroidDrawableResource(imagePath) : null;
            notifications.push({
              id,
              title: formatTemplate(entry.title, next),
              body: formatTemplate(entry.text, next),
              channelId: 'cotidie-reminders',
              smallIcon: icon,
              schedule: {
                at: next,
                allowWhileIdle: true,
              },
              extra: {
                fixed: true,
                date: entry.date,
                dateKey,
                image: imagePath,
                imageDrawable,
                devOnly: entry.devOnly ?? false,
                requiresNotificationsEnabled: entry.requiresNotificationsEnabled ?? false,
                route: entry.route ?? null,
                fixedRecurrence,
                fixedKey: `fixed:${index}:${entry.date}`,
                titleTemplate: entry.title,
                bodyTemplate: entry.text,
              },
            });
            fixedOccurrences += 1;
            if (parsed.kind === 'once') break;
            next = addByKind(next, parsed.kind, parsed.relative);
          }
        });
      }

      if (notificationsEnabled && devTestNotificationEnabled && isDeveloperMode) {
        const devImagePath = '/icons/icon.png';
        const devImageDrawable = toAndroidDrawableResource(devImagePath);
        // 12 recurring notifications per hour -> every 5 minutes (:00, :05, ... :55).
        for (let minute = 0; minute < 60; minute += 5) {
          const id = toNotificationId(`dev:test:5m:${minute}`);
          notifications.push({
            id,
            title: 'Notificación de prueba (Dev)',
            body: 'Recordatorio automático cada 5 minutos.',
            channelId: 'cotidie-reminders',
            smallIcon: icon,
            schedule: {
              on: { minute },
              allowWhileIdle: true,
            },
            extra: {
              devTest: true,
              everyMinutes: 5,
              minute,
              image: devImagePath,
              imageDrawable: devImageDrawable,
            },
          });
        }
      }

      // Movable feasts notifications
      const scheduleMovable = (year: number, offsetDays: number, title: string, body: string, key: string, hour = 9, minute = 0) => {
        const easter = getEasterDate(year);
        const base = addDays(easter, offsetDays);
        const fireAt = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          hour,
          minute,
          0,
          0
        );
        if (fireAt.getTime() < now.getTime()) return;
        const dateKey = toDateKey(fireAt);
        const id = toNotificationId(`fixed:${key}:${year}:${dateKey}`);
        notifications.push({
          id,
          title: formatTemplate(title, fireAt),
          body: formatTemplate(body, fireAt),
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          schedule: {
            at: fireAt,
            allowWhileIdle: true,
          },
          extra: {
            fixed: true,
            feast: key,
            dateKey,
          },
        });
      };

      const getAnnuumSeasonStartForYear = (year: number) => {
        const startWindow = new Date(year, 10, 27); // Nov 27
        const advent1 = new Date(startWindow);
        while (advent1.getDay() !== 0) {
          advent1.setDate(advent1.getDate() + 1);
        }
        const christTheKing = new Date(advent1);
        christTheKing.setDate(advent1.getDate() - 7);
        return christTheKing;
      };

      const scheduleCotidieAnnuumStart = (year: number) => {
        const start = getAnnuumSeasonStartForYear(year);
        const fireAt = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate(),
          9,
          0,
          0,
          0
        );
        if (fireAt.getTime() < now.getTime()) return;
        const dateKey = toDateKey(fireAt);
        const id = toNotificationId(`season:cotidie-annuum:${year}:${dateKey}`);
        notifications.push({
          id,
          title: formatTemplate('Comienza Cotidie Annuum {year}', fireAt),
          body: formatTemplate('Tu resumen anual ya está disponible. Descubre cómo fue tu camino de oración este año en Cotidie.', fireAt),
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          schedule: {
            at: fireAt,
            allowWhileIdle: true,
          },
          extra: {
            fixed: true,
            season: 'cotidie-annuum',
            dateKey,
          },
        });
      };

      // Easter Sunday notification (movable feast)
      const scheduleEaster = (year: number) => {
        const easter = getEasterDate(year);
        const fireAt = new Date(
          easter.getFullYear(),
          easter.getMonth(),
          easter.getDate(),
          12,
          0,
          0,
          0
        );
        if (fireAt.getTime() < now.getTime()) return;
        const dateKey = toDateKey(fireAt);
        const id = toNotificationId(`fixed:easter:${year}:${dateKey}`);
        notifications.push({
          id,
          title: formatTemplate('Domingo de Resurrección', fireAt),
          body: formatTemplate('¡Cristo ha resucitado! Feliz Pascua.', fireAt),
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          schedule: {
            at: fireAt,
            allowWhileIdle: true,
          },
          extra: {
            fixed: true,
            feast: 'easter',
            dateKey,
          },
        });
      };

      scheduleEaster(now.getFullYear());
      scheduleEaster(now.getFullYear() + 1);
      scheduleMovable(now.getFullYear(), 7, 'Domingo de la Divina Misericordia', 'Segundo Domingo de Pascua. Confía en la misericordia del Señor y acércate a su perdón.', 'divine-mercy', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 7, 'Domingo de la Divina Misericordia', 'Segundo Domingo de Pascua. Confía en la misericordia del Señor y acércate a su perdón.', 'divine-mercy', 9, 0);
      scheduleMovable(now.getFullYear(), 39, 'Ascensión del Señor', 'Solemnidad. Jesucristo sube al cielo y nos invita a elevar el corazón y la esperanza.', 'ascension', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 39, 'Ascensión del Señor', 'Solemnidad. Jesucristo sube al cielo y nos invita a elevar el corazón y la esperanza.', 'ascension', 9, 0);
      scheduleMovable(now.getFullYear(), 49, 'Pentecostés', 'Solemnidad. Invoca al Espíritu Santo y deja que renueve tu vida.', 'pentecost', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 49, 'Pentecostés', 'Solemnidad. Invoca al Espíritu Santo y deja que renueve tu vida.', 'pentecost', 9, 0);
      scheduleMovable(now.getFullYear(), 50, 'María, Madre de la Iglesia', 'Memoria litúrgica: honra a María como Madre de la Iglesia. Confía en su maternal intercesión.', 'mary-mother-of-church', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 50, 'María, Madre de la Iglesia', 'Memoria litúrgica: honra a María como Madre de la Iglesia. Confía en su maternal intercesión.', 'mary-mother-of-church', 9, 0);
      scheduleMovable(now.getFullYear(), 53, 'Jesucristo, Sumo y Eterno Sacerdote', 'Solemnidad que reconoce a Jesús como Sumo y Eterno Sacerdote. Ofrece tu agradecimiento y oración.', 'christ-high-priest', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 53, 'Jesucristo, Sumo y Eterno Sacerdote', 'Solemnidad que reconoce a Jesús como Sumo y Eterno Sacerdote. Ofrece tu agradecimiento y oración.', 'christ-high-priest', 9, 0);
      scheduleMovable(now.getFullYear(), 56, 'Santísima Trinidad', 'Solemnidad. Alaba al Padre, al Hijo y al Espíritu Santo con fe y gratitud.', 'trinity', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 56, 'Santísima Trinidad', 'Solemnidad. Alaba al Padre, al Hijo y al Espíritu Santo con fe y gratitud.', 'trinity', 9, 0);
      scheduleMovable(now.getFullYear(), 63, 'Corpus Christi', 'Solemnidad del Cuerpo y la Sangre de Cristo. Adora la Eucaristía y renueva tu amor por ella.', 'corpus-christi', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 63, 'Corpus Christi', 'Solemnidad del Cuerpo y la Sangre de Cristo. Adora la Eucaristía y renueva tu amor por ella.', 'corpus-christi', 9, 0);
      scheduleMovable(now.getFullYear(), 68, 'Sagrado Corazón de Jesús', 'Solemnidad. Consagra tu corazón al Corazón de Jesús y confía en su amor.', 'sacred-heart', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 68, 'Sagrado Corazón de Jesús', 'Solemnidad. Consagra tu corazón al Corazón de Jesús y confía en su amor.', 'sacred-heart', 9, 0);
      scheduleMovable(now.getFullYear(), 69, 'Inmaculado Corazón de María', 'Memoria. Pon tu confianza en el Corazón de María y pídele su intercesión maternal.', 'immaculate-heart-feast', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 69, 'Inmaculado Corazón de María', 'Memoria. Pon tu confianza en el Corazón de María y pídele su intercesión maternal.', 'immaculate-heart-feast', 9, 0);

      const annuumYearsAhead = 10;
      for (let i = 0; i <= annuumYearsAhead; i++) {
        scheduleCotidieAnnuumStart(now.getFullYear() + i);
      }

      const scheduleLimit = platform === 'ios' ? IOS_NOTIFICATION_SCHEDULE_LIMIT : ANDROID_NOTIFICATION_SCHEDULE_LIMIT;
      const scheduledNotifications = [...notifications]
        .sort((a, b) => getNotificationFireTime(a) - getNotificationFireTime(b))
        .slice(0, scheduleLimit);

      try {
        for (let index = 0; index < scheduledNotifications.length; index += NOTIFICATION_SCHEDULE_BATCH_SIZE) {
          const batch = scheduledNotifications.slice(index, index + NOTIFICATION_SCHEDULE_BATCH_SIZE);
          if (batch.length === 0) continue;
          await LocalNotifications.schedule({ notifications: batch });
        }
      } catch (error) {
        console.warn('Failed to schedule notifications', error);
        toast({
          variant: 'destructive',
          title: 'Error al programar recordatorios',
          description: 'Intenta desactivar y activar notificaciones nuevamente.',
        });
      }
    };

    const timeoutId = setTimeout(() => {
      sync().catch((e) => console.error('Failed to sync notifications', e));
    }, 500);

    return () => clearTimeout(timeoutId);
    // `theme` is intentionally excluded: it only affects the notification icon color,
    // and re-syncing (cancel + reschedule everything) on every dark/light toggle was
    // unnecessary churn. The next genuine resync picks up the current theme.
  }, [
    isLoaded,
    notificationsEnabled,
    dailyReminders,
    cartasReminderEnabled,
    cartasReminderAnchorAt,
    devTestNotificationEnabled,
    getReminderTitle,
    buildDefaultReminderMessage,
    ensureAndroidNotificationChannel,
    isDeveloperMode,
    notificationSyncVersion,
  ]);
};
