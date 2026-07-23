'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import BackgroundActions from '@/plugins/BackgroundActions';
import { initialPrayers, categories } from '@/lib/data';
import type {
  Prayer,
  Quote,
  ImagePlaceholder,
  Category,
  SaintOfTheDay,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { catholicQuotes } from '@/lib/quotes';
import { allowedDevCredentials } from '@/lib/dev-credentials';
import { resolveDevotionDayMatch } from '@/lib/devotion-day-images';
import { getLiturgicalColor } from '@/lib/getLiturgicalColor';
import { getMovableFeast, getEasterDate } from '@/lib/movable-feasts';
import { persistence } from '@/lib/persistence';
import { fixedNotifications, type FixedNotificationEntry } from '@/lib/fixed-notifications';
import type { SmallWidgetDisplayMode } from '@/plugins/BackgroundActions';
import { addByKind, addDays, formatTemplate, getNextOccurrence, parseFixedNotificationDate } from '@/context/settings/notification-date-utils';
import {
  applyPlanDeVidaAggregateIncrement,
  applyPrayerOpenIncrement,
  hasCompleteMassCalendarHistory,
  reconcileMassStreakFromCalendar,
  summarizeMassCalendar,
} from '@/context/settings/stats-updates';
import type {
  Theme,
  FontSize,
  ArrowBubbleSize,
  NavMode,
  SmallWidgetMode,
  PrayerLanguageMode,
  PrayerLanguageProfiles,
  OverlayPosition,
  OverlayPositions,
  DevTraceLevel,
  DevTraceEvent,
  DailyReminder,
  UserStats,
  StatIncrementOptions,
  ThemeColor,
  CustomThemeColors,
  CustomPlan,
  PredefinedPrayerOverrideData,
  ImportResult,
  Settings,
} from '@/context/settings/types';
export type {
  PrayerLanguageMode,
  DevTraceLevel,
  DevTraceEvent,
  DailyReminder,
  UserStats,
  CustomPlan,
} from '@/context/settings/types';
import {
  defaultThemeColors,
  defaultHomeBackgroundId,
  defaultAlwaysShowPrayers,
  defaultOverlayPositions,
  defaultUserStats,
  FULL_BACKUP_KEYS,
  getForcedDailyQuote,
} from '@/context/settings/defaults';
import {
  isCustomPlanPayload,
  isFullAppStatePayload,
  applyPredefinedPrayerState,
  isFiniteNumber,
  hasOwnKey,
  normalizeNullableString,
  normalizeBoolean,
  normalizeNumber,
  normalizeSmallWidgetMode,
  normalizeStringArray,
  normalizeNumberRecord,
  normalizeStringRecord,
  normalizePrayerLanguageMode,
  emptyPrayerLanguageProfiles,
  normalizePrayerLanguageProfiles,
  normalizePredefinedPrayerOverrides,
  normalizeThemeColor,
  normalizeThemeColorsValue,
  normalizeOverlayPositionValue,
  normalizeOverlayPositionsValue,
  normalizeDailyRemindersValue,
  normalizePlanDeVidaCalendarValue,
  normalizeDevTraceEventsValue,
  normalizeUserStatsValue,
  isGenericCustomPlanName,
  normalizeCustomPlanDisplayName,
  normalizeCustomPlanComparable,
  normalizeCustomPlansValue,
  stableSortValue,
  stableSerialize,
  normalizeBackupState,
  normalizePartialImportPayload,
  pickSnapshotKeys,
} from '@/context/settings/normalize';
import { useDevLiveTrace } from '@/context/settings/useDevLiveTrace';
import { useNotificationScheduling } from '@/context/settings/useNotificationScheduling';
import { useSaintOfTheDay } from '@/context/settings/useSaintOfTheDay';
import { useHomeBackgroundRotation } from '@/context/settings/useHomeBackgroundRotation';

const NOTIFICATION_ACTION_TYPE_ID = 'cotidie-prayer-actions';
const CARTAS_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const CARTAS_REMINDER_REACTIVATION_DELAY_MS = 60 * 1000;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_ANDROID = 1;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_IOS = 12;
const NOTIFICATION_SCHEDULE_BATCH_SIZE = 24;
const ANDROID_NOTIFICATION_SCHEDULE_LIMIT = 32;
const IOS_NOTIFICATION_SCHEDULE_LIMIT = 60;

const PLAN_DE_VIDA_ROOT_BY_PRAYER_ID = (() => {
  const roots = new Map<string, string>();
  const register = (prayer: Prayer, rootId: string) => {
    if (prayer.id) roots.set(prayer.id, rootId);
    prayer.prayers?.forEach((child) => register(child, rootId));
  };

  initialPrayers.forEach((prayer) => {
    if (prayer.categoryId === 'plan-de-vida' && prayer.id) {
      register(prayer, prayer.id);
    }
  });
  return roots;
})();

const getKnownPlanDeVidaRootId = (prayerId: string) =>
  PLAN_DE_VIDA_ROOT_BY_PRAYER_ID.get(prayerId) ?? null;

const normalizePlanDeVidaIds = (ids: string[]) =>
  Array.from(new Set(ids.map(getKnownPlanDeVidaRootId).filter((id): id is string => Boolean(id))));

const normalizePlanDeVidaCalendar = (calendar: Record<string, string[]>) => {
  const normalized: Record<string, string[]> = {};
  Object.entries(calendar).forEach(([dateKey, ids]) => {
    const validIds = normalizePlanDeVidaIds(ids);
    if (validIds.length > 0) normalized[dateKey] = validIds;
  });
  return normalized;
};

const normalizePlanDeVidaStats = (stats: UserStats): UserStats => {
  const history = stats.planDeVidaCompletedHistory ?? {};
  const normalizedHistory: Record<string, number> = {};
  let removedTotal = 0;

  Object.entries(history).forEach(([id, count]) => {
    const rootId = getKnownPlanDeVidaRootId(id);
    if (!rootId) {
      removedTotal += count;
      return;
    }
    normalizedHistory[rootId] = (normalizedHistory[rootId] ?? 0) + count;
  });

  if (removedTotal === 0 && Object.keys(history).every((id) => getKnownPlanDeVidaRootId(id) === id)) {
    return stats;
  }

  return {
    ...stats,
    planDeVidaCompletedTotal: Math.max(0, (stats.planDeVidaCompletedTotal ?? 0) - removedTotal),
    planDeVidaCompletedHistory: normalizedHistory,
  };
};

const SettingsContext = createContext<Settings | undefined>(undefined);
const SAVED_STATE_KEY = 'cotidie_app_state';
const PENDING_IMPORT_STORAGE_KEY = 'cotidie_pending_import';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const lastProcessedPendingImportRef = useRef<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>(15);
  const [fontFamily, setFontFamily] = useState('literata');

  const [homeBackgroundId, setHomeBackgroundId] = useState<string | null>(defaultHomeBackgroundId);
  const [autoRotateBackground, setAutoRotateBackground] = useState(true);
  const [perpetualBackgroundEnabled, setPerpetualBackgroundEnabled] = useState(false);
  const [lastBackgroundRotationDate, setLastBackgroundRotationDate] = useState<string | null>(null);

  const [hiddenPrayerIds, setHiddenPrayerIds] = useState<string[]>([]);
  const [editedPrayerIds, setEditedPrayerIds] = useState<string[]>([]);
  const [predefinedPrayerOverrides, setPredefinedPrayerOverrides] = useState<Record<string, PredefinedPrayerOverrideData>>({});

  const [userDevotions, setUserDevotions] = useState<Prayer[]>([]);
  const [userPrayers, setUserPrayers] = useState<Prayer[]>([]);
  const [userLetters, setUserLetters] = useState<Prayer[]>([]);

  const [alwaysShowPrayers, setAlwaysShowPrayers] =
    useState<string[]>(defaultAlwaysShowPrayers);

  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(false);

  const [skipNotificationIfChecked, setSkipNotificationIfChecked] = useState(true);

  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(15);
  const [timerTime, setTimerTime] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [overlayPositions, setOverlayPositions] =
    useState<OverlayPositions>(defaultOverlayPositions);

  const [simulatedDate, setSimulatedDate] = useState<string | null>(null);

  const [planDeVidaTrackerEnabled, setPlanDeVidaTrackerEnabled] = useState(true);
  const [planDeVidaProgress, setPlanDeVidaProgress] = useState<string[]>([]);
  const [planDeVidaCalendar, setPlanDeVidaCalendar] = useState<Record<string, string[]>>({});
  const [lastResetTimestamp, setLastResetTimestamp] = useState(Date.now());

  const [isDistractionFree, setIsDistractionFree] = useState(false);

  const [userQuotes, setUserQuotes] = useState<Quote[]>([]);
  const [showTimerFinishedAlert, setShowTimerFinishedAlert] = useState(false);

  const [movableFeastsEnabled, setMovableFeastsEnabledState] = useState(true);
  const setMovableFeastsEnabled = useCallback((enabled: boolean) => {
    setMovableFeastsEnabledState(enabled);
    if (Capacitor.isNativePlatform()) {
      BackgroundActions.setMovableFeastsEnabled({ enabled });
    }
  }, []);

  const [customThemeColors, setCustomThemeColors] =
    useState<CustomThemeColors>(defaultThemeColors);
  const [isCustomThemeActive, setIsCustomThemeActive] = useState(false);

  const [pinchToZoomEnabled, setPinchToZoomEnabled] = useState(true);
  const [prayerTextZoom, setPrayerTextZoom] = useState(1);
  const [navMode, setNavMode] = useState<NavMode>('touch');
  const [arrowBubbleSize, setArrowBubbleSize] = useState<ArrowBubbleSize>('sm');
  const [smallWidgetMode, setSmallWidgetMode] = useState<SmallWidgetMode>('full');
  const [appScale, setAppScale] = useState(1.0);
  const [shakeToOpenEnabled, setShakeToOpenEnabled] = useState(true);

  const [userHomeBackgrounds, setUserHomeBackgrounds] = useState<ImagePlaceholder[]>([]);
  const [scrollPositions, setScrollPositions] = useState<{ [k: string]: number }>({});
  const [prayerLanguageProfile, setPrayerLanguageProfileState] = useState<PrayerLanguageMode>('espanol');
  const [prayerLanguageProfiles, setPrayerLanguageProfiles] = useState<PrayerLanguageProfiles>(emptyPrayerLanguageProfiles);
  const prayerLanguagePreferences = prayerLanguageProfiles[prayerLanguageProfile];

  const [quoteOfTheDay, setQuoteOfTheDay] = useState<Quote | null>(null);
  const [recentQuoteIds, setRecentQuoteIds] = useState<string[]>([]);
  const [lastQuoteDate, setLastQuoteDate] = useState<string | null>(null);

  const [shownEasterEggQuoteIds, setShownEasterEggQuoteIds] = useState<string[]>([]);

  const [saintOfTheDay, setSaintOfTheDay] = useState<SaintOfTheDay | null>(null);
  const [saintOfTheDayImage, setSaintOfTheDayImage] =
    useState<ImagePlaceholder | null>(null);
  const [saintOfTheDayPrayerId, setSaintOfTheDayPrayerId] = useState<string | null>(null);
  
  const [overriddenFixedSaint, setOverriddenFixedSaint] = useState<SaintOfTheDay | null>(null);
  const [overriddenFixedSaintImage, setOverriddenFixedSaintImage] = useState<ImagePlaceholder | null>(null);
  
  const [lastSaintUpdate, setLastSaintUpdate] = useState<string | null>(null);
  
  const [forceAnnuumSeason, setForceAnnuumSeason] = useState(false);
  
  const [simulatedQuoteId, setSimulatedQuoteId] = useState<string | null>(null);
  const planDeVidaCalendarRef = useRef<Record<string, string[]>>({});

  const [customPlans, setCustomPlans] = useState<Array<CustomPlan | null>>([null, null, null, null]);

  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [dailyReminders, setDailyReminders] = useState<DailyReminder[]>([]);
  const [cartasReminderEnabled, setCartasReminderEnabledState] = useState(true);
  const [cartasReminderAnchorAt, setCartasReminderAnchorAt] = useState<number>(() => Date.now());
  const [devTestNotificationEnabled, setDevTestNotificationEnabledState] = useState(false);
  const [notificationSyncVersion, setNotificationSyncVersion] = useState(0);
  const exactAlarmSettingsRequestedRef = useRef(false);
  const [devLiveTraceEnabled, setDevLiveTraceEnabledState] = useState(false);
  const [devLiveTraceEvents, setDevLiveTraceEvents] = useState<DevTraceEvent[]>([]);
  const [userStats, setUserStats] = useState<UserStats>(defaultUserStats);
  const [globalUserStats, setGlobalUserStats] = useState<UserStats>(defaultUserStats);
  const isIncrementSyncingPlanRef = useRef(false);
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [simulatedStats, setSimulatedStats] = useState<UserStats | null>(null);

  const [showZeroStats, setShowZeroStats] = useState(false);
  const [hasViewedAnnuum, setHasViewedAnnuum] = useState(false);
  const [annuumFirstOpenedDate, setAnnuumFirstOpenedDate] = useState<string | null>(null);

  useEffect(() => {
    planDeVidaCalendarRef.current = planDeVidaCalendar;
  }, [planDeVidaCalendar]);

  /* =======================
     LOCAL STORAGE (BLINDADO) & INDEXEDDB
     ======================= */

  const saveState = useCallback((state: any) => {
    if (typeof window === 'undefined') return;
    
    // 1. Guardado principal en IndexedDB (Asíncrono y seguro)
    persistence.setItem(SAVED_STATE_KEY, state).catch(e => 
      console.error("Failed to save to IndexedDB", e)
    );

    // 2. Backup en LocalStorage (por compatibilidad y redundancia)
    try {
        if (window.localStorage && typeof window.localStorage.setItem === 'function') {
            window.localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));
        }
    } catch (e) {
        // Ignoramos errores de cuota en localStorage ya que confiamos en IDB
        console.warn("LocalStorage write failed (quota exceeded?), relying on IDB");
    }
  }, []);

  const normalizeDailyReminders = useCallback((raw: any): DailyReminder[] => {
    if (!Array.isArray(raw)) return [];

    const generateStringId = () => Math.random().toString(36).substr(2, 9);
    const generateNotificationId = () => {
      const max = 2147483647;
      return Math.floor(Math.random() * (max - 1)) + 1;
    };

    const normalizeTime = (t: any) => {
      const hours = typeof t?.hours === 'number' ? t.hours : 9;
      const minutes = typeof t?.minutes === 'number' ? t.minutes : 0;
      const safeHours = Math.min(23, Math.max(0, Math.floor(hours)));
      const safeMinutes = Math.min(59, Math.max(0, Math.floor(minutes)));
      return { hours: safeHours, minutes: safeMinutes };
    };

    const normalizeTarget = (t: any): DailyReminder['target'] => {
      const type = t?.type;
      const id = t?.id;
      if ((type === 'prayer' || type === 'category') && typeof id === 'string' && id.trim().length > 0) {
        return { type, id };
      }
      return { type: 'category', id: 'devociones' };
    };

    return raw
      .map((r: any) => {
        if (!r || typeof r !== 'object') return null;
        const id = typeof r.id === 'string' && r.id.trim().length > 0 ? r.id : generateStringId();
        const notificationId =
          typeof r.notificationId === 'number' && Number.isFinite(r.notificationId)
            ? Math.max(1, Math.floor(r.notificationId))
            : generateNotificationId();
        const enabled = typeof r.enabled === 'boolean' ? r.enabled : true;
        const target = normalizeTarget(r.target);
        const time = normalizeTime(r.time);
        const message = typeof r.message === 'string' ? r.message : '';
        const createdAt = typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : Date.now();
        return { id, notificationId, enabled, target, time, message, createdAt } satisfies DailyReminder;
      })
      .filter(Boolean) as DailyReminder[];
  }, []);

  const normalizeOverlayPosition = useCallback(
    (raw: any, fallback: OverlayPosition): OverlayPosition => {
      const x =
        typeof raw?.x === 'number' && Number.isFinite(raw.x)
          ? Math.max(0, Math.round(raw.x))
          : fallback.x;
      const y =
        typeof raw?.y === 'number' && Number.isFinite(raw.y)
          ? Math.max(0, Math.round(raw.y))
          : fallback.y;
      return { x, y };
    },
    []
  );

  const normalizeOverlayPositions = useCallback(
    (raw: any): OverlayPositions => ({
      timer: normalizeOverlayPosition(raw?.timer, defaultOverlayPositions.timer),
      planNav: normalizeOverlayPosition(raw?.planNav, defaultOverlayPositions.planNav),
      AnnuumBubble: normalizeOverlayPosition(raw?.AnnuumBubble, defaultOverlayPositions.AnnuumBubble),
    }),
    [normalizeOverlayPosition]
  );

  const applyBackupSnapshot = useCallback((snapshot: ReturnType<typeof normalizeBackupState>) => {
    pushDevLiveTrace({
      level: 'info',
      source: 'import',
      message: 'Aplicando snapshot de respaldo al estado vivo.',
    });
    setTheme(snapshot.theme);
    setFontSize(snapshot.fontSize);
    setFontFamily(snapshot.fontFamily);
    setHomeBackgroundId(snapshot.homeBackgroundId);
    setAutoRotateBackground(snapshot.autoRotateBackground);
    setPerpetualBackgroundEnabled(snapshot.perpetualBackgroundEnabled);
    setLastBackgroundRotationDate(snapshot.lastBackgroundRotationDate);
    setHiddenPrayerIds(snapshot.hiddenPrayerIds);
    setEditedPrayerIds(snapshot.editedPrayerIds);
    setPredefinedPrayerOverrides(snapshot.predefinedPrayerOverrides);
    setUserDevotions(snapshot.userDevotions);
    setUserPrayers(snapshot.userPrayers);
    setUserLetters(snapshot.userLetters);
    setAlwaysShowPrayers(snapshot.alwaysShowPrayers);
    setIsDeveloperMode(snapshot.isDeveloperMode);
    setIsEditModeEnabled(snapshot.isEditModeEnabled);
    setTimerEnabled(snapshot.timerEnabled);
    setTimerDuration(snapshot.timerDuration);
    setTimerTime(snapshot.timerTime);
    setTimerActive(snapshot.timerActive);
    setOverlayPositions(snapshot.overlayPositions);
    setSimulatedDate(snapshot.simulatedDate);
    setPlanDeVidaTrackerEnabled(snapshot.planDeVidaTrackerEnabled);
    setPlanDeVidaProgress(normalizePlanDeVidaIds(snapshot.planDeVidaProgress));
    setPlanDeVidaCalendar(normalizePlanDeVidaCalendar(snapshot.planDeVidaCalendar));
    setLastResetTimestamp(snapshot.lastResetTimestamp);
    setIsDistractionFree(snapshot.isDistractionFree);
    setUserQuotes(snapshot.userQuotes);
    setShowTimerFinishedAlert(snapshot.showTimerFinishedAlert);
    setMovableFeastsEnabled(snapshot.movableFeastsEnabled);
    setCustomThemeColors(snapshot.customThemeColors);
    setIsCustomThemeActive(snapshot.isCustomThemeActive);
    setPinchToZoomEnabled(snapshot.pinchToZoomEnabled);
    setPrayerTextZoom(snapshot.prayerTextZoom);
    setNavMode(snapshot.navMode);
    setArrowBubbleSize(snapshot.arrowBubbleSize);
    setSmallWidgetMode(snapshot.smallWidgetMode);
    setAppScale(snapshot.appScale ?? 1.0);
    setShakeToOpenEnabled(snapshot.shakeToOpenEnabled ?? true);
    setSkipNotificationIfChecked(snapshot.skipNotificationIfChecked ?? true);
    setUserHomeBackgrounds(snapshot.userHomeBackgrounds);
    setScrollPositions(snapshot.scrollPositions);
    setPrayerLanguageProfileState(snapshot.prayerLanguageProfile);
    setPrayerLanguageProfiles(snapshot.prayerLanguageProfiles);
    setQuoteOfTheDay(snapshot.quoteOfTheDay);
    setRecentQuoteIds(snapshot.recentQuoteIds);
    setLastQuoteDate(snapshot.lastQuoteDate);
    setShownEasterEggQuoteIds(snapshot.shownEasterEggQuoteIds);
    setSaintOfTheDay(snapshot.saintOfTheDay);
    setSaintOfTheDayImage(snapshot.saintOfTheDayImage);
    setLastSaintUpdate(snapshot.lastSaintUpdate);
    setSimulatedQuoteId(snapshot.simulatedQuoteId);
    setCustomPlans(snapshot.customPlans);
    setNotificationsEnabledState(snapshot.notificationsEnabled);
    setDailyReminders(snapshot.dailyReminders);
    setCartasReminderEnabledState(snapshot.cartasReminderEnabled);
    setCartasReminderAnchorAt(snapshot.cartasReminderAnchorAt);
    setDevTestNotificationEnabledState(snapshot.devTestNotificationEnabled);
    setDevLiveTraceEnabledState(snapshot.devLiveTraceEnabled);
    setDevLiveTraceEvents(snapshot.devLiveTraceEvents);
    setUserStats(normalizePlanDeVidaStats(snapshot.userStats));
    setGlobalUserStats(normalizePlanDeVidaStats(snapshot.globalUserStats));
    setStatsYear(snapshot.statsYear);
    setSimulatedStats(snapshot.simulatedStats);
    setForceAnnuumSeason(snapshot.forceAnnuumSeason);
    setShowZeroStats(snapshot.showZeroStats);
    setHasViewedAnnuum(snapshot.hasViewedAnnuum);
    setAnnuumFirstOpenedDate(snapshot.annuumFirstOpenedDate);
  }, []);

  const backupSnapshot = useMemo(
    () =>
      normalizeBackupState({
        theme,
        fontSize,
        fontFamily,
        homeBackgroundId,
        autoRotateBackground,
        perpetualBackgroundEnabled,
        lastBackgroundRotationDate,
        hiddenPrayerIds,
        editedPrayerIds,
        predefinedPrayerOverrides,
        userDevotions,
        userPrayers,
        userLetters,
        alwaysShowPrayers,
        isDeveloperMode,
        isEditModeEnabled,
        timerEnabled,
        timerDuration,
        timerTime,
        timerActive,
        overlayPositions,
        simulatedDate,
        planDeVidaTrackerEnabled,
        planDeVidaProgress,
        planDeVidaCalendar,
        lastResetTimestamp,
        isDistractionFree,
        userQuotes,
        showTimerFinishedAlert,
        movableFeastsEnabled,
        customThemeColors,
        isCustomThemeActive,
        pinchToZoomEnabled,
        prayerTextZoom,
        navMode,
        arrowBubbleSize,
        smallWidgetMode,
        appScale,
        shakeToOpenEnabled,
        userHomeBackgrounds,
        scrollPositions,
        prayerLanguagePreferences,
        prayerLanguageProfile,
        prayerLanguageProfiles,
        quoteOfTheDay,
        recentQuoteIds,
        lastQuoteDate,
        shownEasterEggQuoteIds,
        saintOfTheDay,
        saintOfTheDayImage,
        lastSaintUpdate,
        simulatedQuoteId,
        customPlans,
        notificationsEnabled,
        dailyReminders,
        cartasReminderEnabled,
        cartasReminderAnchorAt,
        devTestNotificationEnabled,
        devLiveTraceEnabled,
        devLiveTraceEvents,
        skipNotificationIfChecked,
        userStats,
        globalUserStats,
        statsYear,
        simulatedStats,
        forceAnnuumSeason,
        showZeroStats,
        hasViewedAnnuum,
        annuumFirstOpenedDate,
      }),
    [
      theme,
      fontSize,
      fontFamily,
      homeBackgroundId,
      autoRotateBackground,
      perpetualBackgroundEnabled,
      lastBackgroundRotationDate,
      hiddenPrayerIds,
      editedPrayerIds,
      predefinedPrayerOverrides,
      userDevotions,
      userPrayers,
      userLetters,
      alwaysShowPrayers,
      isDeveloperMode,
      isEditModeEnabled,
      timerEnabled,
      timerDuration,
      timerTime,
      timerActive,
      overlayPositions,
      simulatedDate,
      planDeVidaTrackerEnabled,
      planDeVidaProgress,
      planDeVidaCalendar,
      lastResetTimestamp,
      isDistractionFree,
      userQuotes,
      showTimerFinishedAlert,
      movableFeastsEnabled,
      customThemeColors,
      isCustomThemeActive,
      pinchToZoomEnabled,
    prayerTextZoom,
    appScale,
    navMode,
    arrowBubbleSize,
    smallWidgetMode,
    shakeToOpenEnabled,
    userHomeBackgrounds,
    scrollPositions,
    prayerLanguagePreferences,
    prayerLanguageProfile,
    prayerLanguageProfiles,
    quoteOfTheDay,
    recentQuoteIds,
    lastQuoteDate,
    shownEasterEggQuoteIds,
    saintOfTheDay,
    saintOfTheDayImage,
    lastSaintUpdate,
    simulatedQuoteId,
    customPlans,
    notificationsEnabled,
    dailyReminders,
    cartasReminderEnabled,
    cartasReminderAnchorAt,
    devTestNotificationEnabled,
    devLiveTraceEnabled,
    devLiveTraceEvents,
    skipNotificationIfChecked,
    userStats,
    globalUserStats,
    statsYear,
    simulatedStats,
    forceAnnuumSeason,
    showZeroStats,
    hasViewedAnnuum,
    annuumFirstOpenedDate,
  ]);

  const getBackupSnapshot = useCallback(() => backupSnapshot, [backupSnapshot]);

  useEffect(() => {
    const loadSettings = async () => {
        if (typeof window === 'undefined') {
            setIsLoaded(true);
            return;
        }

        try {
          // A) Intentar cargar desde IndexedDB
          let s: any = await persistence.getItem(SAVED_STATE_KEY);

          // B) Migración: Si no hay nada en IDB, buscar en localStorage
          if (!s && window.localStorage) {
             const rawLS = window.localStorage.getItem(SAVED_STATE_KEY);
             if (rawLS) {
                 try {
                     s = JSON.parse(rawLS);
                     // Guardar inmediatamente en IDB para completar la migración
                     await persistence.setItem(SAVED_STATE_KEY, s);
                     console.log("Migración de datos: LocalStorage -> IndexedDB completada.");
                 } catch (e) {
                     console.error("Error migrando localStorage", e);
                 }
             }
          }

          if (!s) {
            setAlwaysShowPrayers(defaultAlwaysShowPrayers);
            setCustomPlans([null, null, null, null]);
            setIsLoaded(true);
            return;
          }

          // ... BLOQUE DE HIDRATACIÓN ...
          let snapshot = normalizeBackupState(s);
          const currentYear = new Date().getFullYear();
          const hasSavedGlobalUserStats =
            s && typeof s === 'object' && !Array.isArray(s) && hasOwnKey(s as Record<string, any>, 'globalUserStats');

          if (snapshot.statsYear !== currentYear) {
            snapshot = {
              ...snapshot,
              userStats: normalizeUserStatsValue(defaultUserStats),
              globalUserStats: normalizeUserStatsValue(hasSavedGlobalUserStats ? (s as any).globalUserStats : snapshot.userStats),
              statsYear: currentYear,
              hasViewedAnnuum: false,
              annuumFirstOpenedDate: null,
            };
          }

          applyBackupSnapshot(snapshot);
        } catch (e) {
          console.error("Error cargando configuración", e);
          // Fallback to clear LS if corrupted, but careful with IDB
          if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
            // window.localStorage.removeItem(SAVED_STATE_KEY); // Maybe too aggressive?
          }
        } finally {
          setIsLoaded(true);
        }
    };

    loadSettings();
  }, []);

  /* =======================
     GUARDADO AUTOMÁTICO
     ======================= */

  useEffect(() => {
    if (!isLoaded) return;
    saveState(backupSnapshot);
  }, [backupSnapshot, isLoaded, saveState]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    void BackgroundActions.setSmallWidgetMode({ mode: smallWidgetMode }).catch(() => {});
  }, [isLoaded, smallWidgetMode]);

  useSaintOfTheDay({
    isLoaded,
    simulatedDate,
    movableFeastsEnabled,
    lastSaintUpdate,
    setLastSaintUpdate,
    saintOfTheDay,
    setSaintOfTheDay,
    saintOfTheDayImage,
    setSaintOfTheDayImage,
    saintOfTheDayPrayerId,
    setSaintOfTheDayPrayerId,
    overriddenFixedSaint,
    setOverriddenFixedSaint,
    overriddenFixedSaintImage,
    setOverriddenFixedSaintImage,
  });

  // Track Days Active & Morning/Night Usage (App Open)
  useEffect(() => {
    if (!isLoaded) return;
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const hour = now.getHours();

    // Expanded ranges for "App Usage"
    const isNight = hour >= 20 || hour < 4; // 8PM - 4AM
    const isMorning = hour >= 4 && hour < 12; // 4AM - 12PM
    
    // Update Local Stats
    setUserStats(prev => {
       let changed = false;
       const next = { ...prev };

       if (next.lastActiveDate !== dateKey) {
         next.daysActive = (next.daysActive || 0) + 1;
         next.lastActiveDate = dateKey;
         changed = true;
       }

       if (isMorning && next.lastMorningPrayerDate !== dateKey) {
           next.morningDaysCount = (next.morningDaysCount || 0) + 1;
           next.lastMorningPrayerDate = dateKey;
           changed = true;
       }

       if (isNight && next.lastNightPrayerDate !== dateKey) {
           next.nightDaysCount = (next.nightDaysCount || 0) + 1;
           next.lastNightPrayerDate = dateKey;
           changed = true;
       }

       return changed ? next : prev;
    });

    // Update Global Stats
    setGlobalUserStats(prev => {
        let changed = false;
        const next = { ...prev };
 
        if (next.lastActiveDate !== dateKey) {
          next.daysActive = (next.daysActive || 0) + 1;
          next.lastActiveDate = dateKey;
          changed = true;
        }
 
        if (isMorning && next.lastMorningPrayerDate !== dateKey) {
            next.morningDaysCount = (next.morningDaysCount || 0) + 1;
            next.lastMorningPrayerDate = dateKey;
            changed = true;
        }
 
        if (isNight && next.lastNightPrayerDate !== dateKey) {
            next.nightDaysCount = (next.nightDaysCount || 0) + 1;
            next.lastNightPrayerDate = dateKey;
            changed = true;
        }
 
        return changed ? next : prev;
     });

  }, [isLoaded, simulatedDate]);

  // Funciones auxiliares
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const { pushDevLiveTrace, clearDevLiveTraceEvents } = useDevLiveTrace(
    devLiveTraceEnabled,
    isDeveloperMode,
    setDevLiveTraceEvents,
  );
  
  // incrementStat moved down to access getPrayerById


  const updateUserStats = (newStats: UserStats) => {
    setUserStats(newStats);
  };

  const generateNotificationId = () => {
    const max = 2147483647;
    return Math.floor(Math.random() * (max - 1)) + 1;
  };

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    pushDevLiveTrace({
      level: 'info',
      source: 'notifications',
      message: enabled ? 'Notificaciones activadas.' : 'Notificaciones desactivadas.',
    });
    if (enabled && Capacitor.isNativePlatform()) {
      void (async () => {
        const currentPerms = await LocalNotifications.checkPermissions().catch(() => null);
        const perms =
          currentPerms && (currentPerms as any).display === 'granted'
            ? (currentPerms as any)
            : await LocalNotifications.requestPermissions().catch(() => null);
        if (!perms || (perms as any).display !== 'granted') {
          setNotificationsEnabledState(false);
          toast({
            variant: 'destructive',
            title: 'Permiso denegado',
            description: 'Activa las notificaciones en Ajustes para recibir recordatorios.',
          });
          return;
        }

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

        if (Capacitor.getPlatform() === 'android') {
          const anyLN = LocalNotifications as any;
          if (typeof anyLN.checkExactNotificationSetting === 'function' && typeof anyLN.changeExactNotificationSetting === 'function') {
            const status = await anyLN.checkExactNotificationSetting().catch(() => null);
            if (status?.exact_alarm === 'granted') {
              exactAlarmSettingsRequestedRef.current = false;
            } else if (!exactAlarmSettingsRequestedRef.current) {
              exactAlarmSettingsRequestedRef.current = true;
              toast({
                title: 'Activa alarmas exactas',
                description: 'Para que los recordatorios lleguen a la hora exacta, habilita "Alarmas exactas" para Cotidie.',
              });
              await anyLN.changeExactNotificationSetting().catch(() => {
                exactAlarmSettingsRequestedRef.current = false;
              });
            }
          }
        }
      })();
    }
    toast({ title: enabled ? 'Notificaciones activadas.' : 'Notificaciones desactivadas.' });
  };

  const setCartasReminderEnabled = (enabled: boolean) => {
    setCartasReminderEnabledState(enabled);
    if (enabled) {
      const now = Date.now();
      setCartasReminderAnchorAt((prev) => (Number.isFinite(prev) && prev > 0 ? prev : now));
    }
    pushDevLiveTrace({
      level: 'info',
      source: 'notifications',
      message: enabled
        ? 'Recordatorio de Cartas activado.'
        : 'Recordatorio de Cartas desactivado.',
    });
    toast({
      title: enabled
        ? 'Recordatorio de Cartas activado.'
        : 'Recordatorio de Cartas desactivado.',
    });
  };

  const setDevTestNotificationEnabled = (enabled: boolean) => {
    setDevTestNotificationEnabledState(enabled);
    pushDevLiveTrace({
      level: 'info',
      source: 'notifications',
      message: enabled
        ? 'Notificacion de prueba (5 min) activada.'
        : 'Notificacion de prueba (5 min) desactivada.',
    });
    toast({
      title: enabled
        ? 'Notificacion de prueba activada (cada 5 minutos).'
        : 'Notificacion de prueba desactivada.',
    });
  };

  const setDevLiveTraceEnabled = (enabled: boolean) => {
    if (!isDeveloperMode && enabled) return;
    setDevLiveTraceEnabledState(enabled);
    if (!enabled) {
      setDevLiveTraceEvents([]);
    } else {
      pushDevLiveTrace({
        level: 'info',
        source: 'dev-trace',
        message: 'Modo de trazas en vivo activado.',
      });
    }
  };

  const addDailyReminder = () => {
    const newReminder: DailyReminder = {
      id: generateId(),
      notificationId: generateNotificationId(),
      enabled: true,
      target: { type: 'category', id: 'devociones' },
      time: { hours: 9, minutes: 0 },
      message: 'Recuerda tus devociones.',
      createdAt: Date.now(),
    };
    setDailyReminders((prev) => [...prev, newReminder]);
    pushDevLiveTrace({
      level: 'info',
      source: 'notifications',
      message: 'Recordatorio diario agregado.',
      data: `id=${newReminder.id}`,
    });
    toast({ title: 'Recordatorio agregado.' });
  };

  const updateDailyReminder = (id: string, patch: Partial<Omit<DailyReminder, 'id' | 'createdAt'>>) => {
    setDailyReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: DailyReminder = {
          ...r,
          ...patch,
          time: patch.time ?? r.time,
          target: patch.target ?? r.target,
        };
        return next;
      })
    );
  };

  const removeDailyReminder = (id: string) => {
    setDailyReminders((prev) => prev.filter((r) => r.id !== id));
    pushDevLiveTrace({
      level: 'info',
      source: 'notifications',
      message: 'Recordatorio diario eliminado.',
      data: `id=${id}`,
    });
    if (Capacitor.isNativePlatform()) {
      void (async () => {
        const pending = await LocalNotifications.getPending().catch(() => null);
        const pendingNotifications =
          pending && Array.isArray((pending as any).notifications) ? ((pending as any).notifications as any[]) : [];
        const ids = pendingNotifications
          .filter((n) => n?.extra?.reminderId === id)
          .map((n) => n.id)
          .filter(Number.isFinite);
        if (ids.length === 0) return;
        await LocalNotifications.cancel({ notifications: ids.map((nid) => ({ id: nid })) }).catch(() => {});
      })();
    }
    toast({ title: 'Recordatorio eliminado.' });
  };

  const createCustomPlan = (slot: 1 | 2 | 3 | 4, name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast({ variant: 'destructive', title: 'Nombre requerido.', description: 'Escribe un nombre para crear el plan.' });
      return;
    }
    setCustomPlans((prev) => {
      const next = [...prev];
      if (next[slot - 1]) return prev;
      next[slot - 1] = {
        id: `custom-plan-${slot}-${generateId()}`,
        slot,
        name: trimmed,
        prayerIds: [],
        createdAt: Date.now(),
      };
      return next;
    });
    toast({ title: 'Plan creado.' });
  };

  const deleteCustomPlan = (slot: 1 | 2 | 3 | 4) => {
    setCustomPlans((prev) => {
      const next = [...prev];
      next[slot - 1] = null;
      return next;
    });
    toast({ title: 'Plan eliminado.' });
  };

  const setCustomPlanName = (slot: 1 | 2 | 3 | 4, name: string) => {
    const trimmed = name.trim();
    setCustomPlans((prev) => {
      const current = prev[slot - 1];
      if (!current) return prev;
      const next = [...prev];
      next[slot - 1] = { ...current, name: trimmed };
      return next;
    });
  };

  const addCustomPlanPrayer = (slot: 1 | 2 | 3 | 4, prayerId: string) => {
    setCustomPlans((prev) => {
      const current = prev[slot - 1];
      if (!current) return prev;
      if (current.prayerIds.includes(prayerId)) return prev;
      const next = [...prev];
      next[slot - 1] = { ...current, prayerIds: [...current.prayerIds, prayerId] };
      return next;
    });
  };

  const removeCustomPlanPrayerAt = (slot: 1 | 2 | 3 | 4, index: number) => {
    setCustomPlans((prev) => {
      const current = prev[slot - 1];
      if (!current) return prev;
      if (index < 0 || index >= current.prayerIds.length) return prev;
      const nextIds = current.prayerIds.filter((_, i) => i !== index);
      const next = [...prev];
      next[slot - 1] = { ...current, prayerIds: nextIds };
      return next;
    });
  };

  const moveCustomPlanPrayer = (slot: 1 | 2 | 3 | 4, fromIndex: number, toIndex: number) => {
    setCustomPlans((prev) => {
      const current = prev[slot - 1];
      if (!current) return prev;
      if (fromIndex < 0 || fromIndex >= current.prayerIds.length) return prev;
      if (toIndex < 0 || toIndex >= current.prayerIds.length) return prev;
      if (fromIndex === toIndex) return prev;
      const nextIds = [...current.prayerIds];
      const [moved] = nextIds.splice(fromIndex, 1);
      nextIds.splice(toIndex, 0, moved);
      const next = [...prev];
      next[slot - 1] = { ...current, prayerIds: nextIds };
      return next;
    });
  };

  const addUserDevotion = (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => {
    const newP: Prayer = { ...p, id: generateId(), isUserDefined: true, categoryId: 'devociones' };
    setUserDevotions(prev => [...prev, newP]);
    incrementStat('devotionsCreated');
    toast({ title: 'Devoción añadida correctamente.' });
  };

  const removeUserDevotion = (id: string) => {
    setUserDevotions(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Devoción eliminada.' });
  };

  const addUserPrayer = (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => {
    const newP: Prayer = { ...p, id: generateId(), isUserDefined: true, categoryId: 'oraciones' };
    setUserPrayers(prev => [...prev, newP]);
    incrementStat('prayersCreated');
    toast({ title: 'Oración añadida correctamente.' });
  };

  const removeUserPrayer = (id: string) => {
    setUserPrayers(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Oración eliminada.' });
  };

  const addUserLetter = (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => {
    const newP: Prayer = { ...p, id: generateId(), isUserDefined: true, categoryId: 'cartas' };
    setUserLetters(prev => [...prev, newP]);
    setCartasReminderAnchorAt(Date.now());
    incrementStat('lettersWritten');
    toast({ title: 'Carta añadida correctamente.' });
  };

  const removeUserLetter = (id: string) => {
    setUserLetters(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Carta eliminada.' });
  };

  const updateUserPrayer = (id: string, data: { title: string; content: string; imageUrl?: string }) => {
    // Check all lists
    setUserDevotions(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    setUserPrayers(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    setUserLetters(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    toast({ title: 'Actualizado correctamente.' });
  };

  const setPredefinedPrayerOverride = (id: string, data: { title: string; content: string; imageUrl?: string }) => {
    if (!id) return;

    const nextOverride: PredefinedPrayerOverrideData = {
      title: data.title,
      ...(data.content.trim() ? { content: data.content } : {}),
      ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    };

    setPredefinedPrayerOverrides(prev => ({
      ...prev,
      [id]: nextOverride,
    }));
    setEditedPrayerIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setHiddenPrayerIds(prev => prev.filter(prayerId => prayerId !== id));
    toast({ title: 'Actualizado correctamente.' });
  };

  const resetSettings = () => {
    setTheme('light');
    setFontSize(15);
    setPrayerTextZoom(1);
    setHomeBackgroundId(defaultHomeBackgroundId);
    setPerpetualBackgroundEnabled(false);
    setOverlayPositions(defaultOverlayPositions);
    setNavMode('touch');
    setArrowBubbleSize('sm');
    setSmallWidgetMode('full');
    setPrayerLanguageProfileState('espanol');
    setPrayerLanguageProfiles(emptyPrayerLanguageProfiles());
    setMovableFeastsEnabled(true);
    setCartasReminderEnabledState(true);
    setCartasReminderAnchorAt(Date.now());
    // ... reset others as needed, but usually we keep user data
    toast({ title: 'Configuración restablecida.' });
  };

  const hardResetApp = () => {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.clear === 'function') {
        window.localStorage.clear();
        window.location.reload();
    }
  };

  const toggleAlwaysShowPrayer = (id: string) => {
    setAlwaysShowPrayers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const loginAsDeveloper = (user: string, pass: string) => {
    const ok = allowedDevCredentials.some(c => c.user === user && c.pass === pass);
    if (ok) {
      setIsDeveloperMode(true);
      pushDevLiveTrace({
        level: 'info',
        source: 'auth',
        message: 'Sesión de desarrollador iniciada.',
      });
      return true;
    }
    return false;
  };

  const logoutDeveloper = () => {
    setIsDeveloperMode(false);
    setIsEditModeEnabled(false);
    setDevTestNotificationEnabledState(false);
    setDevLiveTraceEnabledState(false);
    setDevLiveTraceEvents([]);
  };

  const removePredefinedPrayer = (id: string) => {
    setHiddenPrayerIds(prev => [...prev, id]);
  };

  const restorePredefinedPrayer = (id: string) => {
    setHiddenPrayerIds(prev => prev.filter(p => p !== id));
    setEditedPrayerIds(prev => prev.filter(p => p !== id));
    setPredefinedPrayerOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const restoreAllPredefinedPrayers = () => {
    setHiddenPrayerIds([]);
    setEditedPrayerIds([]);
    setPredefinedPrayerOverrides({});
    toast({ title: 'Oraciones predeterminadas restauradas.' });
  };

  const importUserData = useCallback(
    (
      data: any,
      options?: { silent?: boolean; preferredCustomPlanSlot?: 1 | 2 | 3 | 4 | null }
    ): ImportResult => {
      const silent = options?.silent === true;
      const preferredCustomPlanSlot = options?.preferredCustomPlanSlot ?? null;

      const invalidResult: ImportResult = {
        status: 'invalid',
        kind: 'partial',
        title: 'Error al importar',
        description: 'El archivo no es valido.',
      };

      const notifyIfNeeded = (result: ImportResult) => {
        if (!silent) {
          toast({
            title: result.title,
            description: result.description,
            ...(result.status === 'invalid' ? { variant: 'destructive' as const } : {}),
          });
        }
        return result;
      };

      if (!data || typeof data !== 'object') {
        pushDevLiveTrace({
          level: 'warn',
          source: 'import',
          message: 'Importacion rechazada: payload invalido.',
        });
        return notifyIfNeeded(invalidResult);
      }

      if (isCustomPlanPayload(data)) {
        const normalizedPrayerIds = data.prayerIds.filter((item: unknown): item is string => typeof item === 'string');
        if (normalizedPrayerIds.length === 0) {
          pushDevLiveTrace({
            level: 'warn',
            source: 'import',
            message: 'Plan personalizado rechazado: sin oraciones validas.',
          });
          return notifyIfNeeded(invalidResult);
        }

        const payloadSlot = data.slot === 1 || data.slot === 2 || data.slot === 3 || data.slot === 4 ? data.slot : null;
        const preferredSlot = preferredCustomPlanSlot ?? payloadSlot;
        const firstEmpty = backupSnapshot.customPlans.findIndex((entry) => !entry);
        const fallbackSlot = firstEmpty >= 0 ? ((firstEmpty + 1) as 1 | 2 | 3 | 4) : (preferredSlot ?? 1);
        const targetSlot =
          preferredSlot && !backupSnapshot.customPlans[preferredSlot - 1] ? preferredSlot : fallbackSlot;

        const normalizedName = normalizeCustomPlanDisplayName(data.name);
        const importedPlanId = typeof data.id === 'string' ? data.id.trim() : '';
        const importedCreatedAt = isFiniteNumber(data.createdAt) ? Math.floor(data.createdAt) : null;
        const canCheckExactDuplicate = importedPlanId.length > 0 && importedCreatedAt !== null;
        const duplicateComparable = canCheckExactDuplicate
          ? stableSerialize(
              normalizeCustomPlansValue([
                {
                  id: importedPlanId,
                  slot: targetSlot,
                  name: normalizedName || 'Plan ' + String(targetSlot),
                  prayerIds: normalizedPrayerIds,
                  createdAt: importedCreatedAt,
                },
              ])[0]
            )
          : null;
        const nextPlans = backupSnapshot.customPlans.map((entry) => (entry ? { ...entry } : null));
        nextPlans[targetSlot - 1] = {
          id: importedPlanId || 'custom-plan-' + String(targetSlot) + '-' + String(Date.now()),
          slot: targetSlot,
          name: normalizedName || 'Plan ' + String(targetSlot),
          prayerIds: normalizedPrayerIds,
          createdAt: importedCreatedAt ?? Date.now(),
        };

        const nextSnapshot = normalizeBackupState({
          ...backupSnapshot,
          customPlans: nextPlans,
        });
        applyBackupSnapshot(nextSnapshot);

        const appliedResult: ImportResult = {
          status: 'applied',
          kind: 'custom-plan',
          title: 'Plan personalizado cargado con exito.',
          description: 'Se actualizo el plan personalizado importado.',
        };
        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Plan personalizado importado.',
          data: 'slot=' + String(targetSlot),
        });
        return notifyIfNeeded(appliedResult);
      }

      if (isFullAppStatePayload(data)) {
        const nextSnapshot = normalizeBackupState(data);
        applyBackupSnapshot(nextSnapshot);
        const appliedResult: ImportResult = {
          status: 'applied',
          kind: 'full',
          title: 'Respaldo cargado con exito.',
          description: 'Se restauro la copia completa de la app.',
        };
        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Importacion completa aplicada.',
        });
        return notifyIfNeeded(appliedResult);
      }

      const partialPayload = normalizePartialImportPayload(data);
      const partialKeys = Object.keys(partialPayload);

      pushDevLiveTrace({
        level: 'info',
        source: 'import',
        message: 'Identificado como importacion parcial.',
        data: `keys=${partialKeys.join(',')}`,
      });

      if (partialKeys.length === 0) {
        pushDevLiveTrace({
          level: 'warn',
          source: 'import',
          message: 'Importacion rechazada: no contiene campos reconocidos.',
        });
        return notifyIfNeeded(invalidResult);
      }

      const nextSnapshot = normalizeBackupState({
        ...backupSnapshot,
        ...partialPayload,
      });
      applyBackupSnapshot(nextSnapshot);
      const appliedResult: ImportResult = {
        status: 'applied',
        kind: 'partial',
        title: 'Respaldo cargado con exito.',
        description: 'Se aplicaron los datos importados.',
      };
      pushDevLiveTrace({
        level: 'info',
        source: 'import',
        message: 'Importacion parcial aplicada.',
      });
      return notifyIfNeeded(appliedResult);
    },
    [applyBackupSnapshot, backupSnapshot, pushDevLiveTrace, toast]
  );

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const consumePendingImport = () => {
      try {
        // We now check window object directly to avoid LocalStorage quota limits with large backup files
        const raw = (window as any)[PENDING_IMPORT_STORAGE_KEY] || window.localStorage.getItem(PENDING_IMPORT_STORAGE_KEY);
        if (!raw || raw === lastProcessedPendingImportRef.current) return;

        lastProcessedPendingImportRef.current = raw;

        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Datos recibidos desde el sistema.',
          data: `length=${raw.length}`,
        });

        // Clean up both possible locations
        delete (window as any)[PENDING_IMPORT_STORAGE_KEY];
        window.localStorage.removeItem(PENDING_IMPORT_STORAGE_KEY);

        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Procesando importacion pendiente...',
        });

        const sanitized = raw.trim().replace(/^\uFEFF/, '').trim();
        pushDevLiveTrace({
          level: 'info',
          source: 'import',
          message: 'Intentando parsear JSON...',
          data: sanitized.substring(0, 50) + '...'
        });
        const parsed = JSON.parse(sanitized);
        const result = importUserData(parsed, { silent: true });

        if (result.status === 'applied' || result.status === 'duplicate') {
          toast({
            title: result.status === 'duplicate' ? 'Datos ya actualizados' : '¡Carga completa con éxito!',
            description: result.status === 'duplicate'
              ? 'El archivo ya coincide con tu estado actual.'
              : 'Se han restaurado tus oraciones, devociones y ajustes.'
          });
          return;
        }

        toast({
          variant: 'destructive',
          title: result.title,
          description: result.description,
        });
      } catch (err) {
        pushDevLiveTrace({
          level: 'error',
          source: 'import',
          message: 'Fallo al procesar archivo compartido.',
          data: err instanceof Error ? err.message : String(err)
        });
        toast({
          variant: 'destructive',
          title: 'Error al importar',
          description: 'El archivo compartido no es valido.',
        });
      }
    };

    consumePendingImport();
    window.addEventListener('cotidie-pending-import', consumePendingImport);
    return () => {
      window.removeEventListener('cotidie-pending-import', consumePendingImport);
    };
  }, [importUserData, isLoaded, pushDevLiveTrace, toast]);

  const setOverlayPosition = (key: keyof OverlayPositions, pos: OverlayPosition) => {
    setOverlayPositions((prev) => ({
      ...prev,
      [key]: {
        x: Math.max(0, Math.round(pos.x)),
        y: Math.max(0, Math.round(pos.y)),
      },
    }));
  };

  const toggleTimer = () => {
    setTimerActive(prev => !prev);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerTime(timerDuration * 60);
  };

  const startTimer = () => {
    setTimerEnabled(true);
    setTimerTime(timerDuration * 60);
    setTimerActive(true);
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(prev => {
           if (prev <= 1) {
             setTimerActive(false);
             setShowTimerFinishedAlert(true);
             return 0;
           }
           return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerTime]);

  useEffect(() => {
    if (!timerActive) {
        setTimerTime(timerDuration * 60);
    }
  }, [timerDuration]);

  const parseEventDateFromDateKey = (dateKey?: string | null) => {
    if (!dateKey) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const incrementPlanDeVidaAggregate = (id: string) => {
    setUserStats((prev) => applyPlanDeVidaAggregateIncrement(prev, id));
    setGlobalUserStats((prev) => applyPlanDeVidaAggregateIncrement(prev, id));
  };

  const togglePlanDeVidaItem = (id: string, force?: boolean, skipStatIncrement?: boolean, eventDateKey?: string | null) => {
     const planItemId = getKnownPlanDeVidaRootId(id);
     if (!planItemId) return;
     const eventDate = parseEventDateFromDateKey(eventDateKey) ?? (simulatedDate ? new Date(simulatedDate) : new Date());
     const dateKey = eventDateKey ?? getPastoralDayKey(eventDate);

     setPlanDeVidaProgress(prev => {
        const isChecked = prev.includes(planItemId);
        const nextChecked = force !== undefined ? force : !isChecked;
        let addedToCalendar = false;

        setPlanDeVidaCalendar(prevCalendar => {
          const existing = Array.isArray(prevCalendar[dateKey]) ? prevCalendar[dateKey] : [];
          if (nextChecked) {
            if (existing.includes(planItemId)) return prevCalendar;
            addedToCalendar = true;
            return { ...prevCalendar, [dateKey]: [...existing, planItemId] };
          }
          if (!existing.includes(planItemId)) return prevCalendar;
          const nextList = existing.filter((item) => item !== planItemId);
          if (nextList.length === 0) {
            const { [dateKey]: _removed, ...rest } = prevCalendar;
            return rest;
          }
          return { ...prevCalendar, [dateKey]: nextList };
        });

        if (addedToCalendar) {
          incrementPlanDeVidaAggregate(planItemId);
        }

        if (nextChecked && !isChecked && !isIncrementSyncingPlanRef.current && !skipStatIncrement) {
          incrementStat('prayersOpenedHistory', planItemId, { eventDate });
        }

        if (nextChecked !== isChecked || addedToCalendar) {
          pushDevLiveTrace({
            level: 'info',
            source: 'plan-de-vida',
            message: nextChecked ? 'Check marcado.' : 'Check desmarcado.',
            data: `id=${planItemId}; date=${dateKey}`,
          });
        }

        if (nextChecked) {
          return isChecked ? prev : [...prev, planItemId];
        }
        return prev.filter(p => p !== planItemId);
     });
  };

  const togglePlanDeVidaCalendarEntry = (dateKey: string, id: string) => {
    const planItemId = getKnownPlanDeVidaRootId(id);
    if (!dateKey || !planItemId) return;

    const currentDateKey = getPastoralDayKey(simulatedDate ? new Date(simulatedDate) : new Date());
    const previousCalendar = planDeVidaCalendarRef.current;
    const existing = Array.isArray(previousCalendar[dateKey]) ? previousCalendar[dateKey] : [];
    const nextChecked = !existing.includes(planItemId);

    let nextCalendar: Record<string, string[]>;
    if (nextChecked) {
      nextCalendar = { ...previousCalendar, [dateKey]: [...existing, planItemId] };
    } else {
      const nextList = existing.filter((item) => item !== planItemId);
      if (nextList.length === 0) {
        const { [dateKey]: _removed, ...rest } = previousCalendar;
        nextCalendar = rest;
      } else {
        nextCalendar = { ...previousCalendar, [dateKey]: nextList };
      }
    }

    planDeVidaCalendarRef.current = nextCalendar;
    setPlanDeVidaCalendar(nextCalendar);
    setUserStats((prev) => applyPlanDeVidaCalendarStatsSync(prev, previousCalendar, nextCalendar));
    setGlobalUserStats((prev) => applyPlanDeVidaCalendarStatsSync(prev, previousCalendar, nextCalendar));

    if (dateKey === currentDateKey) {
      setPlanDeVidaProgress((prev) => {
        if (nextChecked) {
          return prev.includes(planItemId) ? prev : [...prev, planItemId];
        }
        return prev.filter((item) => item !== planItemId);
      });
    }

    pushDevLiveTrace({
      level: 'info',
      source: 'plan-de-vida',
      message: nextChecked ? 'Check de calendario marcado.' : 'Check de calendario desmarcado.',
      data: `id=${planItemId}; date=${dateKey}`,
    });
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!Capacitor.isNativePlatform()) return;

    const applyPending = async () => {
      const result = await BackgroundActions.getPendingMarkPrayed().catch(() => null);
      const items = result?.items ?? [];
      if (items.length === 0) return;
      items.forEach((item) => {
        if (typeof item?.id === 'string' && item.id.length > 0) {
          togglePlanDeVidaItem(item.id, true, false, item.dateKey ?? null);
        }
      });
    };

    void applyPending();
    const subPromise = App.addListener('appStateChange', (state) => {
      if (!state.isActive) return;
      void applyPending();
      setNotificationSyncVersion((version) => version + 1);
    });

    return () => {
      void subPromise.then((sub) => sub.remove()).catch(() => {});
    };
  }, [isLoaded, togglePlanDeVidaItem]);

  const resetPlanDeVidaProgress = () => {
    setPlanDeVidaProgress([]);
    setLastResetTimestamp(Date.now());
  };

  // Plan de Vida: reinicio diario a las 05:00 (día pastoral)
  useEffect(() => {
    const checkReset = () => {
      const now = new Date();
      const last = new Date(lastResetTimestamp);
      if (getPastoralDayKey(now) !== getPastoralDayKey(last)) {
        resetPlanDeVidaProgress();
      }
    };

    checkReset();
    const interval = window.setInterval(checkReset, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [lastResetTimestamp]);

  useEffect(() => {
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const forcedQuote = getForcedDailyQuote(now);
    if (forcedQuote) {
      if (lastQuoteDate === dateKey && quoteOfTheDay?.id === forcedQuote.id) return;
      setQuoteOfTheDay(forcedQuote);
      setLastQuoteDate(dateKey);
      return;
    }

    if (lastQuoteDate === dateKey && quoteOfTheDay) return;
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    const pool = [
      ...catholicQuotes.map((q, i) => ({ ...q, id: `cq_${i}` })),
      ...userQuotes,
    ];
    if (pool.length === 0) {
      setQuoteOfTheDay(null);
      setLastQuoteDate(dateKey);
      return;
    }
    const idx = day % pool.length;
    const selected = pool[idx] || null;
    setQuoteOfTheDay(selected);
    setLastQuoteDate(dateKey);
  }, [simulatedDate, lastQuoteDate, quoteOfTheDay, userQuotes]);

  const toggleDistractionFree = useCallback(() => {
    setIsDistractionFree((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) {
          const request = document.documentElement.requestFullscreen;
          if (typeof request === 'function') request.call(document.documentElement).catch(() => {});
        } else {
          const exit = document.exitFullscreen;
          if (document.fullscreenElement && typeof exit === 'function') exit.call(document).catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const addUserQuote = (quote: Omit<Quote, 'id' | 'isUserDefined'>) => {
    const newQ: Quote = { ...quote, id: generateId(), isUserDefined: true };
    setUserQuotes(prev => [...prev, newQ]);
  };

  const removeUserQuote = (id: string) => {
    setUserQuotes(prev => prev.filter(q => q.id !== id));
  };

  const setCustomThemeColor = (colorType: keyof CustomThemeColors, newColor: ThemeColor) => {
    setCustomThemeColors(prev => ({ ...prev, [colorType]: newColor }));
  };

  const resetCustomTheme = () => {
    setCustomThemeColors(defaultThemeColors);
  };

  const addUserHomeBackground = (image: Omit<ImagePlaceholder, 'id' | 'isUserDefined'>) => {
    const newImg: ImagePlaceholder = { ...image, id: generateId(), isUserDefined: true };
    setUserHomeBackgrounds(prev => [...prev, newImg]);
  };

  const removeUserHomeBackground = (id: string) => {
    setUserHomeBackgrounds(prev => prev.filter(img => img.id !== id));
  };

  const setScrollPosition = (prayerId: string, position: number) => {
    setScrollPositions(prev => ({ ...prev, [prayerId]: position }));
  };

  const setPrayerLanguageProfile = (profile: PrayerLanguageMode) => {
    setPrayerLanguageProfileState(normalizePrayerLanguageMode(profile));
  };

  const setPrayerLanguagePreference = (prayerId: string, language: string) => {
    if (!prayerId || !language) return;
    setPrayerLanguageProfiles(prev => {
      const activePreferences = prev[prayerLanguageProfile];
      if (activePreferences[prayerId] === language) return prev;
      return {
        ...prev,
        [prayerLanguageProfile]: {
          ...activePreferences,
          [prayerId]: language,
        },
      };
    });
  };

  const registerEasterEggQuote = (quoteId: string | null, reset?: boolean) => {
     if (reset) {
         setShownEasterEggQuoteIds([]);
     } else if (quoteId) {
         setShownEasterEggQuoteIds(prev => [...prev, quoteId]);
     }
  };

  // Combined prayers list
  const allPrayers = useMemo(() => {
    const base = applyPredefinedPrayerState(initialPrayers, hiddenPrayerIds, predefinedPrayerOverrides);
    const withLetters = base.map(p => {
      if (p.id === 'cartas') {
        return { ...p, prayers: userLetters };
      }
      return p;
    });
    return [
      ...withLetters,
      ...userDevotions,
      ...userPrayers,
    ];
  }, [initialPrayers, hiddenPrayerIds, predefinedPrayerOverrides, userDevotions, userPrayers, userLetters]);

  const getPrayerById = useCallback((id: string, list: Prayer[]): Prayer | null => {
    for (const prayer of list) {
      if (prayer.id === id) return prayer;
      if (prayer.prayers && prayer.prayers.length > 0) {
        const found = getPrayerById(id, prayer.prayers);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const getRootPlanDeVidaId = useCallback((prayerId: string): string | null => {
    const findPath = (targetId: string, list: Prayer[], currentPath: Prayer[]): Prayer[] | null => {
      for (const p of list) {
          if (p.id === targetId) return [...currentPath, p];
          if (p.prayers) {
              const res = findPath(targetId, p.prayers, [...currentPath, p]);
              if (res) return res;
          }
      }
      return null;
    };
    
    const path = findPath(prayerId, allPrayers, []);
    if (!path || path.length === 0) return null;
    
    // Check if any item in the path is a Plan de Vida root
    // Usually the first item in the path (top-level) is what we want.
    const root = path[0];
    if (root.categoryId === 'plan-de-vida') return root.id!;
    
    return null;
  }, [allPrayers]);

  const getLocalDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Día pastoral para stats/checks: 05:00 -> 04:59
  const getPastoralDayDate = (date: Date) => {
    const adjusted = new Date(date);
    if (adjusted.getHours() < 5) {
      adjusted.setDate(adjusted.getDate() - 1);
    }
    return adjusted;
  };

  const getPastoralDayKey = (date: Date) => getLocalDateKey(getPastoralDayDate(date));
  const isAngelusStatKey = (value?: string) =>
    value === 'angelus' ||
    value === 'regina-caeli' ||
    value === 'regina-coeli' ||
    value === 'reginaCoeli' ||
    value === 'angelus-regina-coeli';

  const getAngelusStatKeys = (subKey?: string) => {
    if (!subKey) return [];
    if (!isAngelusStatKey(subKey)) return [subKey];
    const keys = ['angelus', subKey];
    return Array.from(new Set(keys));
  };

  const buildPlanDeVidaCalendarStatsSummary = useCallback((calendar: Record<string, string[]>) => {
    let summary: UserStats = {
      ...defaultUserStats,
      prayersOpenedHistory: {},
      prayerDaysCount: {},
      prayerLastOpened: {},
      prayerLastIncrementTimestamp: {},
      planDeVidaCompletedHistory: {},
      totalPrayersOpened: 0,
    };

    const orderedDates = Object.keys(calendar).sort((a, b) => a.localeCompare(b));
    orderedDates.forEach((dateKey) => {
      const eventDate = parseEventDateFromDateKey(dateKey);
      if (!eventDate) return;

      const ids = Array.from(new Set((calendar[dateKey] ?? []).filter((value): value is string => typeof value === 'string' && value.length > 0))).sort();
      ids.forEach((id) => {
        summary = applyPlanDeVidaAggregateIncrement(summary, id);
        summary = applyPrayerOpenIncrement({
          prev: summary,
          subKey: id,
          eventDate,
          allPrayers,
          getPrayerById,
          getRootPlanDeVidaId,
          getPastoralDayKey,
          getPastoralDayDate,
          getLocalDateKey,
          isAngelusStatKey,
          getAngelusStatKeys,
          updateTimestamp: false,
        });
      });
    });

    // Ensure totalPrayersOpened matches total checks
    let totalChecks = 0;
    Object.values(calendar).forEach(dayList => {
      totalChecks += dayList.length;
    });
    summary.totalPrayersOpened = totalChecks;

    const massSummary = summarizeMassCalendar(calendar);
    summary.massStreak = massSummary.massStreak;
    summary.massDaysCount = massSummary.massDaysCount;
    summary.lastMassDate = massSummary.lastMassDate;

    return summary;
  }, [allPrayers, getPrayerById, getRootPlanDeVidaId]);

  const mergeDateKey = (currentValue: string | undefined, previousCalendarValue: string | undefined, nextCalendarValue: string | undefined) => {
    if (!currentValue) return nextCalendarValue;
    if (currentValue === previousCalendarValue) return nextCalendarValue;
    if (!nextCalendarValue) return currentValue;
    return currentValue.localeCompare(nextCalendarValue) >= 0 ? currentValue : nextCalendarValue;
  };

  const applyPlanDeVidaCalendarStatsSync = useCallback((
    stats: UserStats,
    previousCalendar: Record<string, string[]>,
    nextCalendar: Record<string, string[]>
  ): UserStats => {
    const previousSummary = buildPlanDeVidaCalendarStatsSummary(previousCalendar);
    const nextSummary = buildPlanDeVidaCalendarStatsSummary(nextCalendar);

    const nextStats: UserStats = {
      ...stats,
      prayersOpenedHistory: { ...stats.prayersOpenedHistory },
      prayerDaysCount: { ...stats.prayerDaysCount },
      prayerLastOpened: { ...stats.prayerLastOpened },
      planDeVidaCompletedHistory: { ...stats.planDeVidaCompletedHistory },
    };

    const numericKeys: Array<
      'totalPrayersOpened' |
      'rosaryCount' |
      'angelusCount' |
      'examinationCount' |
      'planDeVidaCompletedTotal'
    > = [
      'totalPrayersOpened',
      'rosaryCount',
      'angelusCount',
      'examinationCount',
      'planDeVidaCompletedTotal',
    ];

    numericKeys.forEach((key) => {
      nextStats[key] = Math.max(0, (stats[key] || 0) - (previousSummary[key] || 0) + (nextSummary[key] || 0));
    });

    const mergeCountMap = (
      target: Record<string, number>,
      previousMap: Record<string, number>,
      nextMap: Record<string, number>
    ) => {
      const keys = new Set([...Object.keys(previousMap), ...Object.keys(nextMap)]);
      keys.forEach((key) => {
        const baseValue = target[key] || 0;
        const mergedValue = Math.max(0, baseValue - (previousMap[key] || 0) + (nextMap[key] || 0));
        if (mergedValue > 0) {
          target[key] = mergedValue;
          return;
        }
        delete target[key];
      });
    };

    mergeCountMap(nextStats.prayersOpenedHistory, previousSummary.prayersOpenedHistory, nextSummary.prayersOpenedHistory);
    mergeCountMap(nextStats.prayerDaysCount, previousSummary.prayerDaysCount, nextSummary.prayerDaysCount);
    mergeCountMap(nextStats.planDeVidaCompletedHistory, previousSummary.planDeVidaCompletedHistory, nextSummary.planDeVidaCompletedHistory);

    const lastOpenedKeys = new Set([
      ...Object.keys(previousSummary.prayerLastOpened),
      ...Object.keys(nextSummary.prayerLastOpened),
    ]);
    lastOpenedKeys.forEach((key) => {
      const mergedValue = mergeDateKey(
        nextStats.prayerLastOpened[key],
        previousSummary.prayerLastOpened[key],
        nextSummary.prayerLastOpened[key]
      );
      if (mergedValue) {
        nextStats.prayerLastOpened[key] = mergedValue;
        return;
      }
      delete nextStats.prayerLastOpened[key];
    });

    const calendarHasCompleteMassHistory = hasCompleteMassCalendarHistory(stats, {
      massStreak: previousSummary.massStreak,
      massDaysCount: previousSummary.massDaysCount,
      lastMassDate: previousSummary.lastMassDate,
    });
    if (
      calendarHasCompleteMassHistory &&
      ((stats.lastMassDate ?? null) === (previousSummary.lastMassDate ?? null) || !stats.lastMassDate)
    ) {
      nextStats.lastMassDate = nextSummary.lastMassDate;
      nextStats.massStreak = nextSummary.massStreak;
      nextStats.massDaysCount = nextSummary.massDaysCount;
    }

    return nextStats;
  }, [buildPlanDeVidaCalendarStatsSummary]);

  useEffect(() => {
    if (!isLoaded) return;
    const calendarMass = summarizeMassCalendar(planDeVidaCalendar);
    if (!calendarMass.lastMassDate) return;

    setUserStats((stats) => reconcileMassStreakFromCalendar(stats, calendarMass));
    setGlobalUserStats((stats) => reconcileMassStreakFromCalendar(stats, calendarMass));
  }, [isLoaded, planDeVidaCalendar]);

  const incrementGlobalStat = (key: keyof UserStats, subKey?: string, options?: StatIncrementOptions) => {
    setGlobalUserStats(prev => {
        if (key === 'prayersOpenedHistory' && subKey) {
            return applyPrayerOpenIncrement({
              prev,
              subKey,
              eventDate: options?.eventDate ?? new Date(),
              allPrayers,
              getPrayerById,
              getRootPlanDeVidaId,
              getPastoralDayKey,
              getPastoralDayDate,
              getLocalDateKey,
              isAngelusStatKey,
              getAngelusStatKeys,
              updateTimestamp: false,
            });
        }

        if (typeof prev[key] === 'number') {
            return { ...prev, [key]: (prev[key] as number) + 1 };
        }

        return prev;
    });
  };

  const incrementStat = (key: keyof UserStats, subKey?: string, options?: StatIncrementOptions) => {
    // Check freeze time (1 hour)
    if (key === 'prayersOpenedHistory' && subKey) {
        const now = Date.now();
        const forcedDateKey = options?.eventDate ? getPastoralDayKey(options.eventDate) : null;
        const cooldownKey = isAngelusStatKey(subKey) ? 'angelus' : subKey;
        const lastIncrement = userStats.prayerLastIncrementTimestamp?.[cooldownKey] || 0;
        if (now - lastIncrement < 3600000) { // 1 hour = 3600000 ms
            // Even when the counter is throttled, keep Plan de Vida check sync in UI.
            const rootId = getRootPlanDeVidaId(subKey);
            if (rootId) {
              isIncrementSyncingPlanRef.current = true;
              togglePlanDeVidaItem(rootId, true, true, forcedDateKey);
              isIncrementSyncingPlanRef.current = false;
            }
            pushDevLiveTrace({
              level: 'info',
              source: 'stats',
              message: 'Incremento bloqueado por ventana de 1 hora.',
              data: `key=${String(key)}; subKey=${subKey}`,
            });
            return;
        }
    }

    // Always increment global stats too
    incrementGlobalStat(key, subKey, options);
    pushDevLiveTrace({
      level: 'info',
      source: 'stats',
      message: 'Estadistica incrementada.',
      data: `key=${String(key)}${subKey ? `; subKey=${subKey}` : ''}`,
    });

    if (key === 'prayersOpenedHistory' && subKey) {
        // Side effect: mark only the owning Plan de Vida root, when one exists.
        const rootId = getRootPlanDeVidaId(subKey);
        if (rootId) {
            isIncrementSyncingPlanRef.current = true;
            togglePlanDeVidaItem(rootId, true, true, options?.eventDate ? getPastoralDayKey(options.eventDate) : null);
            isIncrementSyncingPlanRef.current = false;
        }
    }

    setUserStats(prev => {
      if (key === 'prayersOpenedHistory' && subKey) {
        return applyPrayerOpenIncrement({
          prev,
          subKey,
          eventDate: options?.eventDate ?? new Date(),
          allPrayers,
          getPrayerById,
          getRootPlanDeVidaId,
          getPastoralDayKey,
          getPastoralDayDate,
          getLocalDateKey,
          isAngelusStatKey,
          getAngelusStatKeys,
          updateTimestamp: true,
        });
      }
      
      if (typeof prev[key] === 'number') {
        return { ...prev, [key]: (prev[key] as number) + 1 };
      }
      
      return prev;
    });
  };

  useNotificationScheduling({
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
  });
  const { allHomeBackgrounds, activeThemeColors } = useHomeBackgroundRotation({
    isLoaded,
    userHomeBackgrounds,
    homeBackgroundId,
    setHomeBackgroundId,
    autoRotateBackground,
    lastBackgroundRotationDate,
    setLastBackgroundRotationDate,
    simulatedDate,
    isCustomThemeActive,
    customThemeColors,
  });


  return (
    <SettingsContext.Provider
      value={{
        isLoaded,
        theme,
        setTheme,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        homeBackgroundId,
        setHomeBackgroundId,
        autoRotateBackground,
        setAutoRotateBackground,
        perpetualBackgroundEnabled,
        setPerpetualBackgroundEnabled,
        allPrayers,
        userDevotions,
        addUserDevotion,
        removeUserDevotion,
        userPrayers,
        addUserPrayer,
        removeUserPrayer,
        userLetters,
        addUserLetter,
        removeUserLetter,
        updateUserPrayer,
        setPredefinedPrayerOverride,
        resetSettings,
        hardResetApp,
        alwaysShowPrayers,
        toggleAlwaysShowPrayer,
        isDeveloperMode,
        loginAsDeveloper,
        logoutDeveloper,
        isEditModeEnabled,
        setIsEditModeEnabled,
        removePredefinedPrayer,
        restorePredefinedPrayer,
        restoreAllPredefinedPrayers,
        hiddenPrayerIds,
        editedPrayerIds,
        getBackupSnapshot,
        importUserData,
        timerEnabled,
        setTimerEnabled,
        timerDuration,
        setTimerDuration,
        timerTime,
        timerActive,
        toggleTimer,
        resetTimer,
        startTimer,
        overlayPositions,
        setOverlayPosition,
        notificationsEnabled,
        setNotificationsEnabled,
        dailyReminders,
        addDailyReminder,
        updateDailyReminder,
        removeDailyReminder,
        cartasReminderEnabled,
        setCartasReminderEnabled,
        devTestNotificationEnabled,
        setDevTestNotificationEnabled,
        devLiveTraceEnabled,
        setDevLiveTraceEnabled,
        devLiveTraceEvents,
        clearDevLiveTraceEvents,
        pushDevLiveTrace,
        simulatedDate,
        setSimulatedDate,
        planDeVidaTrackerEnabled,
        setPlanDeVidaTrackerEnabled,
        planDeVidaProgress,
        togglePlanDeVidaItem,
        togglePlanDeVidaCalendarEntry,
        resetPlanDeVidaProgress,
        planDeVidaCalendar,
        isDistractionFree,
        toggleDistractionFree,
        userQuotes,
        addUserQuote,
        removeUserQuote,
        showTimerFinishedAlert,
        setShowTimerFinishedAlert,
        simulatedQuoteId,
        setSimulatedQuoteId,
        movableFeastsEnabled,
        setMovableFeastsEnabled,
        isCustomThemeActive,
        setIsCustomThemeActive,
        setCustomThemeColor,
        resetCustomTheme,
        pinchToZoomEnabled,
        setPinchToZoomEnabled,
        prayerTextZoom,
        setPrayerTextZoom,
        navMode,
        setNavMode,
        arrowBubbleSize,
        setArrowBubbleSize,
        smallWidgetMode,
        setSmallWidgetMode,
        appScale,
        setAppScale,
        shakeToOpenEnabled,
        setShakeToOpenEnabled,
        userHomeBackgrounds,
        allHomeBackgrounds,
        addUserHomeBackground,
        removeUserHomeBackground,
        categories,
        activeThemeColors,
        scrollPositions,
        setScrollPosition,
        prayerLanguagePreferences,
        prayerLanguageProfile,
        setPrayerLanguageProfile,
        setPrayerLanguagePreference,
        quoteOfTheDay,
        shownEasterEggQuoteIds,
        registerEasterEggQuote,
        saintOfTheDay,
        saintOfTheDayImage,
        saintOfTheDayPrayerId,
        overriddenFixedSaint,
        overriddenFixedSaintImage,
        customPlans,
        createCustomPlan,
        deleteCustomPlan,
        setCustomPlanName,
        addCustomPlanPrayer,
        removeCustomPlanPrayerAt,
        moveCustomPlanPrayer,
        userStats: simulatedStats ?? userStats,
        realUserStats: userStats,
        simulatedStats,
        setSimulatedStats,
        incrementStat,
        updateUserStats,
        globalUserStats,
        incrementGlobalStat,
        skipNotificationIfChecked,
        setSkipNotificationIfChecked,
        forceAnnuumSeason,
        setForceAnnuumSeason,
        showZeroStats,
        setShowZeroStats,
        hasViewedAnnuum,
        setHasViewedAnnuum,
        annuumFirstOpenedDate,
        setAnnuumFirstOpenedDate,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
