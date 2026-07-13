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
import saintsDataRaw from '@/lib/saints-data.json';
import { resolveDevotionDayMatch } from '@/lib/devotion-day-images';
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

const saintsData = saintsDataRaw as { saints: SaintOfTheDay[] };
const NOTIFICATION_ACTION_TYPE_ID = 'cotidie-prayer-actions';
const CARTAS_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const CARTAS_REMINDER_REACTIVATION_DELAY_MS = 60 * 1000;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_ANDROID = 1;
const MONTHLY_FIXED_NOTIFICATION_OCCURRENCES_IOS = 12;
const NOTIFICATION_SCHEDULE_BATCH_SIZE = 24;
const ANDROID_NOTIFICATION_SCHEDULE_LIMIT = 32;
const IOS_NOTIFICATION_SCHEDULE_LIMIT = 60;
const FORCED_DAILY_QUOTES: Record<string, Quote> = {
  '06-26': {
    id: 'forced-quote-06-26',
    text: 'Que busques a Cristo, que encuentres a Cristo, que ames a Cristo.',
    author: 'San Josemaría Escrivá',
  },
  '10-22': {
    id: 'forced-quote-10-22',
    text: 'No tengáis miedo de mirarlo a Él ¡Mirad al Señor!',
    author: 'San Juan Pablo II',
  },
};

const getForcedDailyQuote = (date: Date): Quote | null => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return FORCED_DAILY_QUOTES[`${month}-${day}`] ?? null;
};

type Theme = 'light' | 'dark';
type FontSize = number;
type ArrowBubbleSize = 'sm' | 'md' | 'lg';
type NavMode = 'bubble' | 'touch';
type SmallWidgetMode = SmallWidgetDisplayMode;
export type PrayerLanguageMode = 'espanol' | 'latin' | 'ambos';
type PrayerLanguageProfiles = Record<PrayerLanguageMode, Record<string, string>>;
type OverlayPosition = { x: number; y: number };
type OverlayPositions = { timer: OverlayPosition; planNav: OverlayPosition; AnnuumBubble: OverlayPosition };
export type DevTraceLevel = 'info' | 'warn' | 'error';
export type DevTraceEvent = {
  id: string;
  ts: number;
  level: DevTraceLevel;
  source: string;
  message: string;
  data?: string;
};

export type DailyReminder = {
  id: string;
  notificationId: number;
  enabled: boolean;
  target: { type: 'prayer'; id: string } | { type: 'category'; id: string };
  time: { hours: number; minutes: number };
  message: string;
  createdAt: number;
};

export type UserStats = {
  daysActive: number;
  lastActiveDate: string | null;
  // Specific requested stats
  massStreak: number;
  massDaysCount: number;
  morningDaysCount: number;
  nightDaysCount: number;
  // Helper dates for streaks
  lastMassDate: string | null;
  lastNightPrayerDate: string | null;
  lastMorningPrayerDate: string | null;
  // Other stats (kept for compatibility or potential future use, but not displayed)
  totalPrayersOpened: number;
  prayersOpenedHistory: Record<string, number>;
  prayerDaysCount: Record<string, number>;
  prayerLastOpened: Record<string, string>;
  prayerLastIncrementTimestamp: Record<string, number>;
  lettersWritten: number;
  devotionsCreated: number;
  prayersCreated: number;
  saintQuotesOpened: number;
  rosaryCount: number;
  examinationCount: number;
  angelusCount: number;
  planDeVidaCompletedTotal: number;
  planDeVidaCompletedHistory: Record<string, number>;
};

type StatIncrementOptions = {
  eventDate?: Date;
};

type ThemeColor = { h: number; s: number };
type CustomThemeColors = {
  primary: ThemeColor;
  background: ThemeColor;
  accent: ThemeColor;
};

export type CustomPlan = {
  id: string;
  slot: 1 | 2 | 3 | 4;
  name: string;
  prayerIds: string[];
  createdAt: number;
};

type Settings = {
  isLoaded: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontSize: FontSize;
  setFontSize: (f: FontSize) => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;

  homeBackgroundId: string | null;
  setHomeBackgroundId: (id: string | null) => void;
  autoRotateBackground: boolean;
  setAutoRotateBackground: (enabled: boolean) => void;
  perpetualBackgroundEnabled: boolean;
  setPerpetualBackgroundEnabled: (enabled: boolean) => void;

  allPrayers: Prayer[];
  userDevotions: Prayer[];
  addUserDevotion: (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => void;
  removeUserDevotion: (id: string) => void;

  userPrayers: Prayer[];
  addUserPrayer: (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => void;
  removeUserPrayer: (id: string) => void;

  userLetters: Prayer[];
  addUserLetter: (p: Omit<Prayer, 'id' | 'isUserDefined'> & { imageUrl?: string }) => void;
  removeUserLetter: (id: string) => void;

  updateUserPrayer: (id: string, data: { title: string; content: string; imageUrl?: string }) => void;
  setPredefinedPrayerOverride: (id: string, data: { title: string; content: string; imageUrl?: string }) => void;

  resetSettings: () => void;
  hardResetApp: () => void;

  alwaysShowPrayers: string[];
  toggleAlwaysShowPrayer: (id: string) => void;

  isDeveloperMode: boolean;
  loginAsDeveloper: (user: string, pass: string) => boolean;
  logoutDeveloper: () => void;

  isEditModeEnabled: boolean;
  setIsEditModeEnabled: (enabled: boolean) => void;

  removePredefinedPrayer: (id: string) => void;
  restorePredefinedPrayer: (id: string) => void;
  restoreAllPredefinedPrayers: () => void;

  hiddenPrayerIds: string[];
  editedPrayerIds: string[];

  getBackupSnapshot: () => any;
  importUserData: (
    data: any,
    options?: { silent?: boolean; preferredCustomPlanSlot?: 1 | 2 | 3 | 4 | null }
  ) => ImportResult;

  skipNotificationIfChecked: boolean;
  setSkipNotificationIfChecked: (enabled: boolean) => void;

  timerEnabled: boolean;
  setTimerEnabled: (enabled: boolean) => void;
  timerDuration: number;
  setTimerDuration: (duration: number) => void;
  timerTime: number;
  timerActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  startTimer: () => void;

  overlayPositions: OverlayPositions;
  setOverlayPosition: (key: keyof OverlayPositions, pos: OverlayPosition) => void;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  dailyReminders: DailyReminder[];
  addDailyReminder: () => void;
  updateDailyReminder: (id: string, patch: Partial<Omit<DailyReminder, 'id' | 'createdAt'>>) => void;
  removeDailyReminder: (id: string) => void;
  cartasReminderEnabled: boolean;
  setCartasReminderEnabled: (enabled: boolean) => void;
  devTestNotificationEnabled: boolean;
  setDevTestNotificationEnabled: (enabled: boolean) => void;
  devLiveTraceEnabled: boolean;
  setDevLiveTraceEnabled: (enabled: boolean) => void;
  devLiveTraceEvents: DevTraceEvent[];
  clearDevLiveTraceEvents: () => void;
  pushDevLiveTrace: (event: Omit<DevTraceEvent, 'id' | 'ts'>) => void;

  simulatedDate: string | null;
  setSimulatedDate: (date: string | null) => void;

  planDeVidaTrackerEnabled: boolean;
  setPlanDeVidaTrackerEnabled: (enabled: boolean) => void;
  planDeVidaProgress: string[];
  togglePlanDeVidaItem: (id: string, force?: boolean, skipStatIncrement?: boolean, eventDateKey?: string | null) => void;
  togglePlanDeVidaCalendarEntry: (dateKey: string, id: string) => void;
  resetPlanDeVidaProgress: () => void;
  planDeVidaCalendar: Record<string, string[]>;

  isDistractionFree: boolean;
  toggleDistractionFree: () => void;

  userQuotes: Quote[];
  addUserQuote: (quote: Omit<Quote, 'id' | 'isUserDefined'>) => void;
  removeUserQuote: (id: string) => void;

  showTimerFinishedAlert: boolean;
  setShowTimerFinishedAlert: (show: boolean) => void;

  simulatedQuoteId: string | null;
  setSimulatedQuoteId: (id: string | null) => void;

  movableFeastsEnabled: boolean;
  setMovableFeastsEnabled: (enabled: boolean) => void;

  isCustomThemeActive: boolean;
  setIsCustomThemeActive: (active: boolean) => void;
  setCustomThemeColor: (colorType: keyof CustomThemeColors, newColor: ThemeColor) => void;
  resetCustomTheme: () => void;

  pinchToZoomEnabled: boolean;
  setPinchToZoomEnabled: (enabled: boolean) => void;

  prayerTextZoom: number;
  setPrayerTextZoom: (zoom: number) => void;

  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;

  arrowBubbleSize: ArrowBubbleSize;
  setArrowBubbleSize: (size: ArrowBubbleSize) => void;
  smallWidgetMode: SmallWidgetMode;
  setSmallWidgetMode: (mode: SmallWidgetMode) => void;

  appScale: number;
  setAppScale: (scale: number) => void;

  shakeToOpenEnabled: boolean;
  setShakeToOpenEnabled: (enabled: boolean) => void;

  userHomeBackgrounds: ImagePlaceholder[];
  allHomeBackgrounds: ImagePlaceholder[];

  addUserHomeBackground: (image: Omit<ImagePlaceholder, 'id' | 'isUserDefined'>) => void;
  removeUserHomeBackground: (id: string) => void;

  categories: Category[];

  activeThemeColors: CustomThemeColors;

  scrollPositions: { [key: string]: number };
  setScrollPosition: (prayerId: string, position: number) => void;
  prayerLanguagePreferences: Record<string, string>;
  prayerLanguageProfile: PrayerLanguageMode;
  setPrayerLanguageProfile: (profile: PrayerLanguageMode) => void;
  setPrayerLanguagePreference: (prayerId: string, language: string) => void;

  quoteOfTheDay: Quote | null;

  shownEasterEggQuoteIds: string[];
  registerEasterEggQuote: (quoteId: string | null, reset?: boolean) => void;

  saintOfTheDay: SaintOfTheDay | null;
  saintOfTheDayImage: ImagePlaceholder | null;
  saintOfTheDayPrayerId: string | null;
  
  // Nuevo: Santo fijo oculto (para funcionalidad "peek")
  overriddenFixedSaint: SaintOfTheDay | null;
  overriddenFixedSaintImage: ImagePlaceholder | null;

  customPlans: Array<CustomPlan | null>;
  createCustomPlan: (slot: 1 | 2 | 3 | 4, name: string) => void;
  deleteCustomPlan: (slot: 1 | 2 | 3 | 4) => void;
  setCustomPlanName: (slot: 1 | 2 | 3 | 4, name: string) => void;
  addCustomPlanPrayer: (slot: 1 | 2 | 3 | 4, prayerId: string) => void;
  removeCustomPlanPrayerAt: (slot: 1 | 2 | 3 | 4, index: number) => void;
  moveCustomPlanPrayer: (slot: 1 | 2 | 3 | 4, fromIndex: number, toIndex: number) => void;

  forceAnnuumSeason: boolean;
  setForceAnnuumSeason: (force: boolean) => void;

  showZeroStats: boolean;
  setShowZeroStats: (show: boolean) => void;

  userStats: UserStats; // Effective stats (simulated or real)
  realUserStats: UserStats; // Always real stats
  simulatedStats: UserStats | null;
  setSimulatedStats: (stats: UserStats | null) => void;

  incrementStat: (key: keyof UserStats, subKey?: string, options?: StatIncrementOptions) => void;
  updateUserStats: (newStats: UserStats) => void;
  globalUserStats: UserStats;
  incrementGlobalStat: (key: keyof UserStats, subKey?: string, options?: StatIncrementOptions) => void;

  hasViewedAnnuum: boolean;
  setHasViewedAnnuum: (viewed: boolean) => void;
  annuumFirstOpenedDate: string | null;
  setAnnuumFirstOpenedDate: (date: string | null) => void;
};

const SettingsContext = createContext<Settings | undefined>(undefined);
const SAVED_STATE_KEY = 'cotidie_app_state';
const PENDING_IMPORT_STORAGE_KEY = 'cotidie_pending_import';

const isCustomPlanPayload = (data: any): data is Partial<CustomPlan> & { name: string; prayerIds: string[] } => {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    Array.isArray(data.prayerIds) &&
    data.prayerIds.length > 0
  );
};

const isFullAppStatePayload = (data: any): boolean => {
  return (
    !!data &&
    typeof data === 'object' &&
    (typeof data.theme === 'string' ||
      typeof data.fontSize === 'string' ||
      typeof data.fontSize === 'number' ||
      typeof data.fontFamily === 'string' ||
      typeof data.timerDuration === 'number' ||
      typeof data.notificationsEnabled === 'boolean' ||
      typeof data.isDeveloperMode === 'boolean' ||
      Array.isArray(data.customPlans))
  );
};

type PredefinedPrayerOverrideData = {
  title: string;
  content?: string;
  imageUrl?: string;
};

type ImportResult = {
  status: 'applied' | 'duplicate' | 'invalid';
  kind: 'custom-plan' | 'full' | 'partial';
  title: string;
  description?: string;
  destructive?: boolean;
};

const applyPredefinedPrayerState = (
  prayers: Prayer[],
  hiddenIds: string[],
  overrides: Record<string, PredefinedPrayerOverrideData>
): Prayer[] =>
  prayers
    .filter((prayer) => !prayer.id || !hiddenIds.includes(prayer.id))
    .map((prayer) => {
      const override = prayer.id ? overrides[prayer.id] : undefined;
      const nestedPrayers = prayer.prayers?.length
        ? applyPredefinedPrayerState(prayer.prayers, hiddenIds, overrides)
        : prayer.prayers;

      return {
        ...prayer,
        ...(override ?? {}),
        ...(nestedPrayers ? { prayers: nestedPrayers } : {}),
      };
    });

const defaultThemeColors: CustomThemeColors = {
  primary: { h: 36, s: 88 },
  background: { h: 216, s: 33 },
  accent: { h: 45, s: 86 },
};

const defaultHomeBackgroundId: string | null = (() => {
  const homeBackgrounds = PlaceHolderImages.filter((img) => img.id.startsWith('home-'));
  return homeBackgrounds[0]?.id ?? null;
})();

const defaultAlwaysShowPrayers = ['cartas'];
const defaultOverlayPositions: OverlayPositions = {
  timer: { x: 12, y: 74 },
  planNav: { x: 12, y: 130 },
  AnnuumBubble: { x: 16, y: 48 },
};

const defaultUserStats: UserStats = {
  daysActive: 0,
  lastActiveDate: null,
  massStreak: 0,
  massDaysCount: 0,
  morningDaysCount: 0,
  nightDaysCount: 0,
  lastMassDate: null,
  lastNightPrayerDate: null,
  lastMorningPrayerDate: null,
  totalPrayersOpened: 0,
  prayersOpenedHistory: {},
  prayerDaysCount: {},
  prayerLastOpened: {},
  prayerLastIncrementTimestamp: {},
  lettersWritten: 0,
  devotionsCreated: 0,
  prayersCreated: 0,
  saintQuotesOpened: 0,
  rosaryCount: 0,
  examinationCount: 0,
  angelusCount: 0,
  planDeVidaCompletedTotal: 0,
  planDeVidaCompletedHistory: {},
};

const isFiniteNumber = (value: any): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasOwnKey = (value: Record<string, any>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeNullableString = (value: any): string | null =>
  typeof value === 'string' ? value : null;

const normalizeBoolean = (value: any, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeNumber = (value: any, fallback = 0) =>
  isFiniteNumber(value) ? value : fallback;

const normalizeSmallWidgetMode = (value: any): SmallWidgetMode =>
  value === 'saint_priority' ? 'saint_priority' : 'full';

const normalizeStringArray = (raw: any, requiredValues: string[] = []): string[] => {
  const values = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  for (const requiredValue of requiredValues) {
    if (!values.includes(requiredValue)) {
      values.push(requiredValue);
    }
  }
  return values;
};

const normalizeNumberRecord = (raw: any): Record<string, number> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, number> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (isFiniteNumber(value)) {
      result[key] = value;
    }
  });
  return result;
};

const normalizeStringRecord = (raw: any): Record<string, string> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, string> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }
  });
  return result;
};

const normalizePrayerLanguageMode = (value: any): PrayerLanguageMode =>
  value === 'latin' || value === 'ambos' ? value : 'espanol';

const emptyPrayerLanguageProfiles = (): PrayerLanguageProfiles => ({
  espanol: {},
  latin: {},
  ambos: {},
});

const normalizePrayerLanguageProfiles = (
  rawProfiles: any,
  legacyPreferences: any,
): PrayerLanguageProfiles => {
  const source = rawProfiles && typeof rawProfiles === 'object' && !Array.isArray(rawProfiles)
    ? rawProfiles
    : null;
  if (!source) {
    return {
      ...emptyPrayerLanguageProfiles(),
      espanol: normalizeStringRecord(legacyPreferences),
    };
  }
  return {
    espanol: normalizeStringRecord(source.espanol),
    latin: normalizeStringRecord(source.latin),
    ambos: normalizeStringRecord(source.ambos),
  };
};

const normalizePredefinedPrayerOverrides = (raw: any): Record<string, PredefinedPrayerOverrideData> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, PredefinedPrayerOverrideData> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const title = typeof (value as any).title === 'string' ? (value as any).title : '';
    const content = typeof (value as any).content === 'string' ? (value as any).content : undefined;
    const imageUrl = typeof (value as any).imageUrl === 'string' ? (value as any).imageUrl : undefined;
    result[key] = {
      title,
      ...(content !== undefined ? { content } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };
  });
  return result;
};

const normalizeThemeColor = (raw: any, fallback: ThemeColor): ThemeColor => ({
  h: normalizeNumber(raw?.h, fallback.h),
  s: normalizeNumber(raw?.s, fallback.s),
});

const normalizeThemeColorsValue = (raw: any): CustomThemeColors => ({
  primary: normalizeThemeColor(raw?.primary, defaultThemeColors.primary),
  background: normalizeThemeColor(raw?.background, defaultThemeColors.background),
  accent: normalizeThemeColor(raw?.accent, defaultThemeColors.accent),
});

const normalizeOverlayPositionValue = (raw: any, fallback: OverlayPosition): OverlayPosition => ({
  x: Math.max(0, Math.round(normalizeNumber(raw?.x, fallback.x))),
  y: Math.max(0, Math.round(normalizeNumber(raw?.y, fallback.y))),
});

const normalizeOverlayPositionsValue = (raw: any): OverlayPositions => ({
  timer: normalizeOverlayPositionValue(raw?.timer, defaultOverlayPositions.timer),
  planNav: normalizeOverlayPositionValue(raw?.planNav, defaultOverlayPositions.planNav),
  AnnuumBubble: normalizeOverlayPositionValue(raw?.AnnuumBubble, defaultOverlayPositions.AnnuumBubble),
});

const normalizeDailyRemindersValue = (raw: any): DailyReminder[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const reminder = entry as any;
      const hours = Math.min(23, Math.max(0, Math.floor(normalizeNumber(reminder.time?.hours, 9))));
      const minutes = Math.min(59, Math.max(0, Math.floor(normalizeNumber(reminder.time?.minutes, 0))));
      const notificationId = Math.max(1, Math.floor(normalizeNumber(reminder.notificationId, index + 1)));
      const targetType = reminder.target?.type === 'prayer' ? 'prayer' : 'category';
      const targetId = typeof reminder.target?.id === 'string' && reminder.target.id.trim().length > 0
        ? reminder.target.id
        : 'devociones';
      return {
        id: typeof reminder.id === 'string' && reminder.id.trim().length > 0 ? reminder.id : 'imported-reminder-' + index,
        notificationId,
        enabled: normalizeBoolean(reminder.enabled, true),
        target: { type: targetType, id: targetId } as DailyReminder['target'],
        time: { hours, minutes },
        message: typeof reminder.message === 'string' ? reminder.message : '',
        createdAt: Math.floor(normalizeNumber(reminder.createdAt, 0)),
      } satisfies DailyReminder;
    })
    .filter(Boolean) as DailyReminder[];
};

const normalizePlanDeVidaCalendarValue = (raw: any): Record<string, string[]> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, string[]> = {};
  Object.entries(source).forEach(([key, value]) => {
    const normalized = normalizeStringArray(value);
    if (normalized.length > 0) {
      result[key] = normalized;
    }
  });
  return result;
};

const normalizeDevTraceEventsValue = (raw: any): DevTraceEvent[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const item = entry as any;
      const level: DevTraceLevel = item.level === 'warn' || item.level === 'error' ? item.level : 'info';
      return {
        id: typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : 'trace-' + index,
        ts: Math.floor(normalizeNumber(item.ts, 0)),
        level,
        source: typeof item.source === 'string' ? item.source : 'import',
        message: typeof item.message === 'string' ? item.message : '',
        ...(typeof item.data === 'string' ? { data: item.data } : {}),
      } satisfies DevTraceEvent;
    })
    .filter(Boolean) as DevTraceEvent[];
};

const normalizeUserStatsValue = (raw: any): UserStats => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    daysActive: normalizeNumber(source.daysActive, defaultUserStats.daysActive),
    lastActiveDate: normalizeNullableString(source.lastActiveDate),
    massStreak: normalizeNumber(source.massStreak, defaultUserStats.massStreak),
    massDaysCount: normalizeNumber(source.massDaysCount, defaultUserStats.massDaysCount),
    morningDaysCount: normalizeNumber(source.morningDaysCount, defaultUserStats.morningDaysCount),
    nightDaysCount: normalizeNumber(source.nightDaysCount, defaultUserStats.nightDaysCount),
    lastMassDate: normalizeNullableString(source.lastMassDate),
    lastNightPrayerDate: normalizeNullableString(source.lastNightPrayerDate),
    lastMorningPrayerDate: normalizeNullableString(source.lastMorningPrayerDate),
    totalPrayersOpened: normalizeNumber(source.totalPrayersOpened, defaultUserStats.totalPrayersOpened),
    prayersOpenedHistory: normalizeNumberRecord(source.prayersOpenedHistory),
    prayerDaysCount: normalizeNumberRecord(source.prayerDaysCount),
    prayerLastOpened: normalizeStringRecord(source.prayerLastOpened),
    prayerLastIncrementTimestamp: normalizeNumberRecord(source.prayerLastIncrementTimestamp),
    lettersWritten: normalizeNumber(source.lettersWritten, defaultUserStats.lettersWritten),
    devotionsCreated: normalizeNumber(source.devotionsCreated, defaultUserStats.devotionsCreated),
    prayersCreated: normalizeNumber(source.prayersCreated, defaultUserStats.prayersCreated),
    saintQuotesOpened: normalizeNumber(source.saintQuotesOpened, defaultUserStats.saintQuotesOpened),
    rosaryCount: normalizeNumber(source.rosaryCount, defaultUserStats.rosaryCount),
    examinationCount: normalizeNumber(source.examinationCount, defaultUserStats.examinationCount),
    angelusCount: normalizeNumber(source.angelusCount, defaultUserStats.angelusCount),
    planDeVidaCompletedTotal: normalizeNumber(source.planDeVidaCompletedTotal, defaultUserStats.planDeVidaCompletedTotal),
    planDeVidaCompletedHistory: normalizeNumberRecord(source.planDeVidaCompletedHistory),
  };
};

const isGenericCustomPlanName = (value: string) =>
  /^Plan(?: personalizado)?(?: \d+)?$/i.test(value.trim());

const normalizeCustomPlanDisplayName = (value: any): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 && !isGenericCustomPlanName(trimmed) ? trimmed : '';
};

const normalizeCustomPlanComparable = (value: any) => ({
  name: normalizeCustomPlanDisplayName(value?.name),
  prayerIds: Array.isArray(value?.prayerIds)
    ? value.prayerIds.filter((item: unknown): item is string => typeof item === 'string')
    : [],
});

const normalizeCustomPlansValue = (raw: any): Array<CustomPlan | null> => {
  const normalized: Array<CustomPlan | null> = [null, null, null, null];
  if (!Array.isArray(raw)) return normalized;
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const entryAny = entry as any;
    const slot = entryAny.slot === 1 || entryAny.slot === 2 || entryAny.slot === 3 || entryAny.slot === 4 ? entryAny.slot : null;
    if (!slot || normalized[slot - 1]) return;
    const prayerIds = Array.isArray(entryAny.prayerIds)
      ? entryAny.prayerIds.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    normalized[slot - 1] = {
      id:
        typeof entryAny.id === 'string' && entryAny.id.trim().length > 0
          ? entryAny.id
          : 'custom-plan-' + slot + '-import-' + index,
      slot,
      name: normalizeCustomPlanDisplayName(entryAny.name),
      prayerIds,
      createdAt: Math.floor(normalizeNumber(entryAny.createdAt, 0)),
    };
  });
  return normalized;
};

const FULL_BACKUP_KEYS = [
  'theme',
  'fontSize',
  'fontFamily',
  'homeBackgroundId',
  'autoRotateBackground',
  'perpetualBackgroundEnabled',
  'lastBackgroundRotationDate',
  'hiddenPrayerIds',
  'editedPrayerIds',
  'predefinedPrayerOverrides',
  'userDevotions',
  'userPrayers',
  'userLetters',
  'alwaysShowPrayers',
  'isDeveloperMode',
  'isEditModeEnabled',
  'timerEnabled',
  'timerDuration',
  'timerTime',
  'timerActive',
  'overlayPositions',
  'simulatedDate',
  'planDeVidaTrackerEnabled',
  'planDeVidaProgress',
  'planDeVidaCalendar',
  'lastResetTimestamp',
  'isDistractionFree',
  'userQuotes',
  'showTimerFinishedAlert',
  'movableFeastsEnabled',
  'customThemeColors',
  'isCustomThemeActive',
  'pinchToZoomEnabled',
  'prayerTextZoom',
  'appScale',
  'navMode',
  'arrowBubbleSize',
  'smallWidgetMode',
  'userHomeBackgrounds',
  'scrollPositions',
  'prayerLanguagePreferences',
  'prayerLanguageProfile',
  'prayerLanguageProfiles',
  'quoteOfTheDay',
  'recentQuoteIds',
  'lastQuoteDate',
  'shownEasterEggQuoteIds',
  'saintOfTheDay',
  'saintOfTheDayImage',
  'lastSaintUpdate',
  'simulatedQuoteId',
  'customPlans',
  'notificationsEnabled',
  'dailyReminders',
  'cartasReminderEnabled',
  'cartasReminderAnchorAt',
  'shakeToOpenEnabled',
  'devTestNotificationEnabled',
  'devLiveTraceEnabled',
  'devLiveTraceEvents',
  'userStats',
  'globalUserStats',
  'statsYear',
  'simulatedStats',
  'forceAnnuumSeason',
  'showZeroStats',
  'hasViewedAnnuum',
  'annuumFirstOpenedDate',
] as const;

const stableSortValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(stableSortValue);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableSortValue(value[key]);
        return acc;
      }, {} as Record<string, any>);
  }
  return value;
};

const stableSerialize = (value: any) => JSON.stringify(stableSortValue(value));

const normalizeBackupState = (raw: any) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const timerDuration = Math.max(1, Math.floor(normalizeNumber(source.timerDuration, 15)));
  const timerTime = Math.max(0, Math.floor(normalizeNumber(source.timerTime, timerDuration * 60)));
  const theme: Theme = source.theme === 'dark' ? 'dark' : 'light';
  const fontSize = isFiniteNumber(source.fontSize)
    ? Math.round(source.fontSize)
    : source.fontSize === 'large'
      ? 18
      : 15;
  const navMode: NavMode = 'touch';
  const arrowBubbleSize: ArrowBubbleSize =
    source.arrowBubbleSize === 'md' || source.arrowBubbleSize === 'lg' ? source.arrowBubbleSize : 'sm';
  const smallWidgetMode = normalizeSmallWidgetMode(source.smallWidgetMode);
  const prayerLanguageProfile = normalizePrayerLanguageMode(source.prayerLanguageProfile);
  const prayerLanguageProfiles = normalizePrayerLanguageProfiles(
    source.prayerLanguageProfiles,
    source.prayerLanguagePreferences,
  );
  return {
    theme,
    fontSize,
    fontFamily: typeof source.fontFamily === 'string' && source.fontFamily.trim().length > 0 ? source.fontFamily : 'literata',
    homeBackgroundId: normalizeNullableString(source.homeBackgroundId) ?? defaultHomeBackgroundId,
    autoRotateBackground: normalizeBoolean(source.autoRotateBackground, true),
    perpetualBackgroundEnabled: normalizeBoolean(source.perpetualBackgroundEnabled),
    lastBackgroundRotationDate: normalizeNullableString(source.lastBackgroundRotationDate),
    hiddenPrayerIds: normalizeStringArray(source.hiddenPrayerIds),
    editedPrayerIds: normalizeStringArray(source.editedPrayerIds),
    predefinedPrayerOverrides: normalizePredefinedPrayerOverrides(source.predefinedPrayerOverrides),
    userDevotions: Array.isArray(source.userDevotions) ? source.userDevotions : [],
    userPrayers: Array.isArray(source.userPrayers) ? source.userPrayers : [],
    userLetters: Array.isArray(source.userLetters) ? source.userLetters : [],
    alwaysShowPrayers: normalizeStringArray(source.alwaysShowPrayers, defaultAlwaysShowPrayers),
    isDeveloperMode: normalizeBoolean(source.isDeveloperMode),
    isEditModeEnabled: normalizeBoolean(source.isEditModeEnabled),
    timerEnabled: normalizeBoolean(source.timerEnabled),
    timerDuration,
    timerTime,
    timerActive: normalizeBoolean(source.timerActive) && timerTime > 0,
    overlayPositions: normalizeOverlayPositionsValue(source.overlayPositions),
    simulatedDate: normalizeNullableString(source.simulatedDate),
    planDeVidaTrackerEnabled: normalizeBoolean(source.planDeVidaTrackerEnabled, true),
    planDeVidaProgress: normalizeStringArray(source.planDeVidaProgress),
    planDeVidaCalendar: normalizePlanDeVidaCalendarValue(source.planDeVidaCalendar),
    lastResetTimestamp: Math.floor(normalizeNumber(source.lastResetTimestamp, Date.now())),
    isDistractionFree: normalizeBoolean(source.isDistractionFree),
    userQuotes: Array.isArray(source.userQuotes) ? source.userQuotes : [],
    showTimerFinishedAlert: normalizeBoolean(source.showTimerFinishedAlert),
    movableFeastsEnabled: normalizeBoolean(source.movableFeastsEnabled, true),
    customThemeColors: normalizeThemeColorsValue(source.customThemeColors),
    isCustomThemeActive: normalizeBoolean(source.isCustomThemeActive),
    pinchToZoomEnabled: normalizeBoolean(source.pinchToZoomEnabled, true),
    prayerTextZoom: isFiniteNumber(source.prayerTextZoom) ? Math.min(2, Math.max(0.5, Number(source.prayerTextZoom))) : 1,
    appScale: isFiniteNumber(source.appScale) ? Math.min(1.5, Math.max(0.7, Number(source.appScale))) : 1,
    navMode,
    arrowBubbleSize,
    smallWidgetMode,
    userHomeBackgrounds: Array.isArray(source.userHomeBackgrounds) ? source.userHomeBackgrounds : [],
    scrollPositions: normalizeNumberRecord(source.scrollPositions),
    prayerLanguagePreferences: prayerLanguageProfiles[prayerLanguageProfile],
    prayerLanguageProfile,
    prayerLanguageProfiles,
    quoteOfTheDay: source.quoteOfTheDay ?? null,
    recentQuoteIds: normalizeStringArray(source.recentQuoteIds),
    lastQuoteDate: normalizeNullableString(source.lastQuoteDate),
    shownEasterEggQuoteIds: normalizeStringArray(source.shownEasterEggQuoteIds),
    saintOfTheDay: source.saintOfTheDay ?? null,
    saintOfTheDayImage: source.saintOfTheDayImage ?? null,
    lastSaintUpdate: normalizeNullableString(source.lastSaintUpdate),
    simulatedQuoteId: normalizeNullableString(source.simulatedQuoteId),
    customPlans: normalizeCustomPlansValue(source.customPlans),
    notificationsEnabled: normalizeBoolean(source.notificationsEnabled, true),
    dailyReminders: normalizeDailyRemindersValue(source.dailyReminders),
    cartasReminderEnabled: normalizeBoolean(source.cartasReminderEnabled, true),
    cartasReminderAnchorAt: Math.max(1, Math.floor(normalizeNumber(source.cartasReminderAnchorAt, Date.now()))),
    shakeToOpenEnabled: normalizeBoolean(source.shakeToOpenEnabled, true),
    devTestNotificationEnabled: normalizeBoolean(source.devTestNotificationEnabled),
    devLiveTraceEnabled: normalizeBoolean(source.devLiveTraceEnabled),
    devLiveTraceEvents: normalizeDevTraceEventsValue(source.devLiveTraceEvents),
    skipNotificationIfChecked: normalizeBoolean(source.skipNotificationIfChecked, true),
    userStats: normalizeUserStatsValue(source.userStats),
    globalUserStats: normalizeUserStatsValue(source.globalUserStats),
    statsYear: Math.floor(normalizeNumber(source.statsYear, new Date().getFullYear())),
    simulatedStats: source.simulatedStats == null ? null : normalizeUserStatsValue(source.simulatedStats),
    forceAnnuumSeason: normalizeBoolean(source.forceAnnuumSeason),
    showZeroStats: normalizeBoolean(source.showZeroStats),
    hasViewedAnnuum: normalizeBoolean(source.hasViewedAnnuum),
    annuumFirstOpenedDate: normalizeNullableString(source.annuumFirstOpenedDate),
  };
};

const normalizePartialImportPayload = (raw: any) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = normalizeBackupState(source);
  return FULL_BACKUP_KEYS.reduce((acc, key) => {
    if (hasOwnKey(source, key)) {
      acc[key] = normalized[key];
    }
    return acc;
  }, {} as Record<string, any>);
};

const pickSnapshotKeys = (snapshot: Record<string, any>, keys: string[]) => {
  return keys.reduce((acc, key) => {
    if (hasOwnKey(snapshot, key)) {
      acc[key] = snapshot[key];
    }
    return acc;
  }, {} as Record<string, any>);
};

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
  const [saintRefreshClock, setSaintRefreshClock] = useState(() => Date.now());
  
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
    setPlanDeVidaProgress(snapshot.planDeVidaProgress);
    setPlanDeVidaCalendar(snapshot.planDeVidaCalendar);
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
    setUserStats(snapshot.userStats);
    setGlobalUserStats(snapshot.globalUserStats);
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
  const DEV_TRACE_MAX_EVENTS = 400;

  const pushDevLiveTrace = useCallback((event: Omit<DevTraceEvent, 'id' | 'ts'>) => {
    if (!isDeveloperMode || !devLiveTraceEnabled) return;
    const normalizedLevel: DevTraceLevel =
      event.level === 'error' || event.level === 'warn' ? event.level : 'info';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextEvent: DevTraceEvent = {
      id,
      ts: Date.now(),
      level: normalizedLevel,
      source: String(event.source || 'app'),
      message: String(event.message || ''),
      data: typeof event.data === 'string' && event.data.trim().length > 0 ? event.data : undefined,
    };
    setDevLiveTraceEvents((prev) => {
      const next = [...prev, nextEvent];
      return next.length > DEV_TRACE_MAX_EVENTS ? next.slice(next.length - DEV_TRACE_MAX_EVENTS) : next;
    });
  }, [devLiveTraceEnabled, isDeveloperMode]);

  const clearDevLiveTraceEvents = useCallback(() => {
    setDevLiveTraceEvents([]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isDeveloperMode || !devLiveTraceEnabled) return;

    const onError = (event: ErrorEvent) => {
      pushDevLiveTrace({
        level: 'error',
        source: 'window.error',
        message: event.message || 'Error no controlado.',
        data:
          typeof event.filename === 'string' && event.filename
            ? `${event.filename}:${event.lineno}:${event.colno}`
            : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason instanceof Error
            ? event.reason.message
            : 'Promise rechazada sin detalle';
      pushDevLiveTrace({
        level: 'error',
        source: 'window.unhandledrejection',
        message: reason,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [devLiveTraceEnabled, isDeveloperMode, pushDevLiveTrace]);
  
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
            anyLN
              .checkExactNotificationSetting()
              .then((status: any) => {
                if (status?.exact_alarm === 'granted') return;
                toast({
                  title: 'Activa alarmas exactas',
                  description: 'Para que los recordatorios lleguen a la hora exacta, habilita "Alarmas exactas" para Cotidie.',
                });
                return anyLN.changeExactNotificationSetting();
              })
              .catch(() => {});
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
     const eventDate = parseEventDateFromDateKey(eventDateKey) ?? (simulatedDate ? new Date(simulatedDate) : new Date());
     const dateKey = eventDateKey ?? getPastoralDayKey(eventDate);

     setPlanDeVidaProgress(prev => {
        const isChecked = prev.includes(id);
        const nextChecked = force !== undefined ? force : !isChecked;
        let addedToCalendar = false;

        setPlanDeVidaCalendar(prevCalendar => {
          const existing = Array.isArray(prevCalendar[dateKey]) ? prevCalendar[dateKey] : [];
          if (nextChecked) {
            if (existing.includes(id)) return prevCalendar;
            addedToCalendar = true;
            return { ...prevCalendar, [dateKey]: [...existing, id] };
          }
          if (!existing.includes(id)) return prevCalendar;
          const nextList = existing.filter((item) => item !== id);
          if (nextList.length === 0) {
            const { [dateKey]: _removed, ...rest } = prevCalendar;
            return rest;
          }
          return { ...prevCalendar, [dateKey]: nextList };
        });

        if (addedToCalendar) {
          incrementPlanDeVidaAggregate(id);
        }

        if (nextChecked && !isChecked && !isIncrementSyncingPlanRef.current && !skipStatIncrement) {
          incrementStat('prayersOpenedHistory', id, { eventDate });
        }

        if (nextChecked !== isChecked || addedToCalendar) {
          pushDevLiveTrace({
            level: 'info',
            source: 'plan-de-vida',
            message: nextChecked ? 'Check marcado.' : 'Check desmarcado.',
            data: `id=${id}; date=${dateKey}`,
          });
        }

        if (nextChecked) {
          return isChecked ? prev : [...prev, id];
        }
        return prev.filter(p => p !== id);
     });
  };

  const togglePlanDeVidaCalendarEntry = (dateKey: string, id: string) => {
    if (!dateKey || !id) return;

    const currentDateKey = getPastoralDayKey(simulatedDate ? new Date(simulatedDate) : new Date());
    const previousCalendar = planDeVidaCalendarRef.current;
    const existing = Array.isArray(previousCalendar[dateKey]) ? previousCalendar[dateKey] : [];
    const nextChecked = !existing.includes(id);

    let nextCalendar: Record<string, string[]>;
    if (nextChecked) {
      nextCalendar = { ...previousCalendar, [dateKey]: [...existing, id] };
    } else {
      const nextList = existing.filter((item) => item !== id);
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
          return prev.includes(id) ? prev : [...prev, id];
        }
        return prev.filter((item) => item !== id);
      });
    }

    pushDevLiveTrace({
      level: 'info',
      source: 'plan-de-vida',
      message: nextChecked ? 'Check de calendario marcado.' : 'Check de calendario desmarcado.',
      data: `id=${id}; date=${dateKey}`,
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
            const targetId = rootId || subKey;
            if (targetId) {
              isIncrementSyncingPlanRef.current = true;
              togglePlanDeVidaItem(targetId, true, true, forcedDateKey);
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
        // Side effect: Mark Plan de Vida item as checked (root or same item).
        const rootId = getRootPlanDeVidaId(subKey);
        const targetId = rootId || subKey;
        if (targetId) {
            isIncrementSyncingPlanRef.current = true;
            togglePlanDeVidaItem(targetId, true, true, options?.eventDate ? getPastoralDayKey(options.eventDate) : null);
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

      const pending = await LocalNotifications.getPending().catch(() => null);
      const pendingIds =
        pending && Array.isArray((pending as any).notifications)
          ? ((pending as any).notifications as Array<{ id: number }>).map((n) => n.id).filter(Number.isFinite)
          : [];
      if (pendingIds.length > 0) {
        await LocalNotifications.cancel({ notifications: pendingIds.map((id) => ({ id })) }).catch((error) => {
          console.warn('Failed to cancel pending notifications', error);
        });
      }

      if (active.length === 0 && fixedActive.length === 0 && !cartasReminderActive) return;

      const currentPerms = await LocalNotifications.checkPermissions().catch((error) => {
        console.warn('Failed to check notification permissions', error);
        return null;
      });
      if (!currentPerms || currentPerms.display !== 'granted') {
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

      // Check for exact alarm permission on Android
      if (Capacitor.getPlatform() === 'android') {
        const anyLN = LocalNotifications as any;
        if (typeof anyLN.checkExactNotificationSetting === 'function') {
           const status = await anyLN.checkExactNotificationSetting().catch(() => null);
           if (status && status.exact_alarm !== 'granted') {
             // We don't want to spam the user, but we should probably warn them once or log it.
             // Ideally, we prompt them to fix it.
             console.warn('Exact alarm permission not granted. Notifications might be delayed.');
           }
        }
      }

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
    theme,
  ]);

  const allHomeBackgrounds = useMemo(() => {
      return [
        ...PlaceHolderImages.filter(img => img.id.startsWith('home-')),
        ...userHomeBackgrounds
      ];
  }, [userHomeBackgrounds]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isLoaded) return;

    const activeUrl = homeBackgroundId
      ? allHomeBackgrounds.find((img) => img.id === homeBackgroundId)?.imageUrl ?? null
      : null;
    const defaultUrl = defaultHomeBackgroundId
      ? PlaceHolderImages.find((img) => img.id === defaultHomeBackgroundId)?.imageUrl ?? null
      : null;
    const url = activeUrl ?? defaultUrl;

    if (!url) {
      document.documentElement.style.removeProperty('--home-bg-image');
      return;
    }

    const escaped = url.replace(/"/g, '\\"');
    document.documentElement.style.setProperty('--home-bg-image', `url("${escaped}")`);

    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem('cotidie_home_bg_url', url);
      }
    } catch {}
  }, [allHomeBackgrounds, homeBackgroundId, isLoaded]);

  const activeThemeColors = useMemo(() => {
      if (isCustomThemeActive) return customThemeColors;

      if (homeBackgroundId) {
        const activeBackground = allHomeBackgrounds.find(img => img.id === homeBackgroundId);
        if (activeBackground?.themeColors) return activeBackground.themeColors;
      }

      return defaultThemeColors;
  }, [isCustomThemeActive, customThemeColors, homeBackgroundId, allHomeBackgrounds]);

  useEffect(() => {
    if (!autoRotateBackground || !isLoaded) return;

    const getLocalDateKey = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const toUtcDayNumber = (d: Date) =>
      Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

    const toUtcDayNumberFromDateKey = (dateKey: string) => {
      const parts = dateKey.split('-');
      if (parts.length !== 3) return null;
      const yyyy = Number(parts[0]);
      const mm = Number(parts[1]);
      const dd = Number(parts[2]);
      if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
      return Math.floor(Date.UTC(yyyy, mm - 1, dd) / 86400000);
    };

    const getNow = () => (simulatedDate ? new Date(simulatedDate) : new Date());

    const getRotationIds = () => {
      const ids = allHomeBackgrounds.map((img) => img.id).filter(Boolean);
      if (!defaultHomeBackgroundId) return ids;
      const idx = ids.indexOf(defaultHomeBackgroundId);
      if (idx <= 0) return ids;
      return [ids[idx], ...ids.slice(0, idx), ...ids.slice(idx + 1)];
    };

    const applyDailyRotation = () => {
      const now = getNow();
      const dateKey = getLocalDateKey(now);
      if (lastBackgroundRotationDate === dateKey) return;

      const rotationIds = getRotationIds();
      if (rotationIds.length === 0) {
        setLastBackgroundRotationDate(dateKey);
        return;
      }

      if (!lastBackgroundRotationDate) {
        if (!homeBackgroundId) setHomeBackgroundId(rotationIds[0]);
        setLastBackgroundRotationDate(dateKey);
        return;
      }

      const lastUtcDay = toUtcDayNumberFromDateKey(lastBackgroundRotationDate);
      const todayUtcDay = toUtcDayNumber(now);
      const rawDiffDays = lastUtcDay === null ? 1 : todayUtcDay - lastUtcDay;
      const diffDays =
        rawDiffDays === 0 ? 1 : Number.isFinite(rawDiffDays) ? rawDiffDays : 1;

      const currentIndex = homeBackgroundId ? rotationIds.indexOf(homeBackgroundId) : -1;
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const shift = diffDays % rotationIds.length;
      const nextIndex = (baseIndex + shift + rotationIds.length) % rotationIds.length;

      setHomeBackgroundId(rotationIds[nextIndex]);
      setLastBackgroundRotationDate(dateKey);
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const delay = Math.max(0, next.getTime() - now.getTime());

      timeoutId = setTimeout(() => {
        applyDailyRotation();
        scheduleNextMidnight();
      }, delay);
    };

    applyDailyRotation();
    scheduleNextMidnight();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    autoRotateBackground,
    simulatedDate,
    lastBackgroundRotationDate,
    isLoaded,
    homeBackgroundId,
    allHomeBackgrounds,
  ]);

  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout> | null = null;
    let nativeListener: { remove: () => void } | null = null;
    let disposed = false;

    const refreshSaintDate = () => setSaintRefreshClock(Date.now());
    const scheduleMidnightRefresh = () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimeout = setTimeout(() => {
        refreshSaintDate();
        scheduleMidnightRefresh();
      }, Math.max(0, nextMidnight.getTime() - now.getTime()) + 50);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshSaintDate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleMidnightRefresh();

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refreshSaintDate();
      }).then((listener) => {
        if (disposed) {
          void listener.remove();
        } else {
          nativeListener = listener;
        }
      }).catch(() => undefined);
    }

    return () => {
      disposed = true;
      if (midnightTimeout) clearTimeout(midnightTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void nativeListener?.remove();
    };
  }, []);

  // Saints logic
  useEffect(() => {
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad2(currentMonth)}-${pad2(currentDay)}`;

    // 1. Check Movable Feasts first (Ash Wednesday, Easter, etc.)
    const easter = getEasterDate(now.getFullYear());
    const movable = getMovableFeast(now, easter);

    // 2. Check Fixed Saints
    const fixed = saintsData.saints.find(s => s.month === currentMonth && s.day === currentDay) || null;

    // Priority logic based on user setting
    // If enabled: Movable takes precedence (e.g. Ash Wednesday > San Simeón)
    // If disabled: Fixed takes precedence (e.g. San Simeón > Ash Wednesday)
    const effectiveSaintBase = movableFeastsEnabled
      ? (movable || fixed) 
      : (fixed || movable);

    // Task 16: Combine names if a movable feast overlaps a high importance fixed saint
    let effectiveSaint = effectiveSaintBase;
    if (movableFeastsEnabled && movable && fixed && fixed.isHighImportance && movable.name !== fixed.name) {
      effectiveSaint = {
        ...movable,
        name: `${movable.name} / ${fixed.name}`,
        bio: `**${movable.name}**: ${movable.bio}\n\n**${fixed.name}**: ${fixed.bio}`,
      };
    }

    const hiddenFixedSaint =
      movableFeastsEnabled && movable && fixed && !fixed.isHighImportance
        ? fixed
        : null;

    const dow = now.getDay(); // 0..6
    const dayImageId = `saintoftheday-${dow}`;
    const dayImage = PlaceHolderImages.find(img => img.id === dayImageId) || null;
    const marianNamePattern =
      /(Nuestra Señora|Virgen María|Inmaculada Concepción|Asunción de la Virgen|Presentación de la Virgen|Natividad de la Virgen|Visitación de la Virgen)/i;
    const marianImage = PlaceHolderImages.find((img) => img.id === 'saintoftheday-6') || dayImage;

    const resolveSaintVisuals = (saint: SaintOfTheDay | null) => {
      const devotionMatch = resolveDevotionDayMatch(saint);
      let image = dayImage;

      if (currentMonth === 12 && (currentDay === 24 || currentDay === 25)) {
        const christmasImage = PlaceHolderImages.find((img) => img.id === 'christmas-image') || null;
        image = christmasImage || dayImage;
      } else if (saint?.name?.includes('Pentecostés')) {
        image = PlaceHolderImages.find((img) => img.id === 'pentecost-image') || dayImage;
      } else if (saint?.name?.includes('Santísima Trinidad')) {
        image = PlaceHolderImages.find((img) => img.id === 'holy-trinity-image') || dayImage;
      } else if (saint?.name?.includes('Corpus Christi')) {
        image = PlaceHolderImages.find((img) => img.id === 'corpus-christi-image') || dayImage;
      } else if (saint?.name?.includes('Sagrado Corazón')) {
        image = PlaceHolderImages.find((img) => img.id === 'home-sacred-heart') || dayImage;
      } else if (saint?.name?.includes('Inmaculado Corazón')) {
        image = PlaceHolderImages.find((img) => img.id === 'home-immaculate-heart') || dayImage;
      } else {
        const isMarian = Boolean(
          (saint as any)?.type === 'marian' || (saint?.name && marianNamePattern.test(saint.name))
        );

        if (devotionMatch?.image) {
          image = devotionMatch.image;
        } else if (isMarian) {
          image = marianImage;
        }
      }

      return {
        image,
        prayerId: devotionMatch?.prayerId ?? null,
      };
    };

    const { image, prayerId } = resolveSaintVisuals(effectiveSaint);
    const hiddenFixedImage = hiddenFixedSaint
      ? resolveSaintVisuals(hiddenFixedSaint).image
      : null;
    const sameHiddenSaint =
      overriddenFixedSaint?.name === hiddenFixedSaint?.name &&
      overriddenFixedSaint?.type === (hiddenFixedSaint as any)?.type;
    const sameHiddenImage =
      overriddenFixedSaintImage?.id === hiddenFixedImage?.id &&
      overriddenFixedSaintImage?.imageUrl === hiddenFixedImage?.imageUrl;

    const sameSaint =
      saintOfTheDay?.name === effectiveSaint?.name &&
      saintOfTheDay?.type === (effectiveSaint as any)?.type;
    const sameImage =
      saintOfTheDayImage?.id === image?.id &&
      saintOfTheDayImage?.imageUrl === image?.imageUrl;
    const samePrayerId = saintOfTheDayPrayerId === prayerId;
    if (
      lastSaintUpdate === dateKey &&
      sameSaint &&
      sameImage &&
      samePrayerId &&
      sameHiddenSaint &&
      sameHiddenImage
    ) {
      return;
    }

    setSaintOfTheDay(effectiveSaint || null);
    setSaintOfTheDayImage(image || null);
    setSaintOfTheDayPrayerId(prayerId);
    setOverriddenFixedSaint(hiddenFixedSaint || null);
    setOverriddenFixedSaintImage(hiddenFixedImage || null);
    setLastSaintUpdate(dateKey);
  }, [
    simulatedDate,
    lastSaintUpdate,
    movableFeastsEnabled,
    saintOfTheDay,
    saintOfTheDayImage,
    saintOfTheDayPrayerId,
    overriddenFixedSaint,
    overriddenFixedSaintImage,
    saintRefreshClock,
  ]);

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
