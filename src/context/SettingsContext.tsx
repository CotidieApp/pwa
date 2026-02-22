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
import { LocalNotifications } from '@capacitor/local-notifications';
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
import { getMovableFeast, getEasterDate } from '@/lib/movable-feasts';
import { persistence } from '@/lib/persistence';
import { fixedNotifications, type FixedNotificationEntry } from '@/lib/fixed-notifications';

const saintsData = saintsDataRaw as { saints: SaintOfTheDay[] };

type Theme = 'light' | 'dark';
type FontSize = number;
type ArrowBubbleSize = 'sm' | 'md' | 'lg';
type OverlayPosition = { x: number; y: number };
type OverlayPositions = { timer: OverlayPosition; planNav: OverlayPosition; wrappedBubble: OverlayPosition };

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

  importUserData: (data: any, options?: { silent?: boolean }) => void;

  timerEnabled: boolean;
  setTimerEnabled: (enabled: boolean) => void;
  timerDuration: number;
  setTimerDuration: (duration: number) => void;
  timerTime: number;
  timerActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;

  overlayPositions: OverlayPositions;
  setOverlayPosition: (key: keyof OverlayPositions, pos: OverlayPosition) => void;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  dailyReminders: DailyReminder[];
  addDailyReminder: () => void;
  updateDailyReminder: (id: string, patch: Partial<Omit<DailyReminder, 'id' | 'createdAt'>>) => void;
  removeDailyReminder: (id: string) => void;
  devTestNotificationEnabled: boolean;
  setDevTestNotificationEnabled: (enabled: boolean) => void;

  simulatedDate: string | null;
  setSimulatedDate: (date: string | null) => void;

  planDeVidaTrackerEnabled: boolean;
  setPlanDeVidaTrackerEnabled: (enabled: boolean) => void;
  planDeVidaProgress: string[];
  togglePlanDeVidaItem: (id: string, force?: boolean) => void;
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

  arrowBubbleSize: ArrowBubbleSize;
  setArrowBubbleSize: (size: ArrowBubbleSize) => void;

  userHomeBackgrounds: ImagePlaceholder[];
  allHomeBackgrounds: ImagePlaceholder[];

  addUserHomeBackground: (image: Omit<ImagePlaceholder, 'id' | 'isUserDefined'>) => void;
  removeUserHomeBackground: (id: string) => void;

  categories: Category[];

  activeThemeColors: CustomThemeColors;

  scrollPositions: { [key: string]: number };
  setScrollPosition: (prayerId: string, position: number) => void;

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

  forceWrappedSeason: boolean;
  setForceWrappedSeason: (force: boolean) => void;

  showZeroStats: boolean;
  setShowZeroStats: (show: boolean) => void;

  userStats: UserStats; // Effective stats (simulated or real)
  realUserStats: UserStats; // Always real stats
  simulatedStats: UserStats | null;
  setSimulatedStats: (stats: UserStats | null) => void;

  incrementStat: (key: keyof UserStats, subKey?: string) => void;
  updateUserStats: (newStats: UserStats) => void;
  globalUserStats: UserStats;
  incrementGlobalStat: (key: keyof UserStats, subKey?: string) => void;

  hasViewedWrapped: boolean;
  setHasViewedWrapped: (viewed: boolean) => void;
};

const SettingsContext = createContext<Settings | undefined>(undefined);
const SAVED_STATE_KEY = 'cotidie_app_state';
const PENDING_IMPORT_STORAGE_KEY = 'cotidie_pending_import';

const isCustomPlanPayload = (data: any): data is Partial<CustomPlan> & { name: string; prayerIds: string[] } => {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    Array.isArray(data.prayerIds)
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
      Array.isArray(data.customPlans))
  );
};

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
  wrappedBubble: { x: 16, y: 48 },
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
  const [lastBackgroundRotationDate, setLastBackgroundRotationDate] = useState<string | null>(null);

  const [hiddenPrayerIds, setHiddenPrayerIds] = useState<string[]>([]);
  const [editedPrayerIds, setEditedPrayerIds] = useState<string[]>([]);

  const [userDevotions, setUserDevotions] = useState<Prayer[]>([]);
  const [userPrayers, setUserPrayers] = useState<Prayer[]>([]);
  const [userLetters, setUserLetters] = useState<Prayer[]>([]);

  const [alwaysShowPrayers, setAlwaysShowPrayers] =
    useState<string[]>(defaultAlwaysShowPrayers);

  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(false);

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

  const [movableFeastsEnabled, setMovableFeastsEnabled] = useState(true);

  const [customThemeColors, setCustomThemeColors] =
    useState<CustomThemeColors>(defaultThemeColors);
  const [isCustomThemeActive, setIsCustomThemeActive] = useState(false);

  const [pinchToZoomEnabled, setPinchToZoomEnabled] = useState(true);
  const [arrowBubbleSize, setArrowBubbleSize] = useState<ArrowBubbleSize>('sm');

  const [userHomeBackgrounds, setUserHomeBackgrounds] = useState<ImagePlaceholder[]>([]);
  const [scrollPositions, setScrollPositions] = useState<{ [k: string]: number }>({});

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
  
  const [forceWrappedSeason, setForceWrappedSeason] = useState(false);
  
  const [simulatedQuoteId, setSimulatedQuoteId] = useState<string | null>(null);

  const [customPlans, setCustomPlans] = useState<Array<CustomPlan | null>>([null, null, null, null]);

  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [dailyReminders, setDailyReminders] = useState<DailyReminder[]>([]);
  const [devTestNotificationEnabled, setDevTestNotificationEnabledState] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(defaultUserStats);
  const [globalUserStats, setGlobalUserStats] = useState<UserStats>(defaultUserStats);
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [simulatedStats, setSimulatedStats] = useState<UserStats | null>(null);

  const [showZeroStats, setShowZeroStats] = useState(false);
  const [hasViewedWrapped, setHasViewedWrapped] = useState(false);

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
      wrappedBubble: normalizeOverlayPosition(raw?.wrappedBubble, defaultOverlayPositions.wrappedBubble),
    }),
    [normalizeOverlayPosition]
  );

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
          setTheme(s.theme ?? 'light');
          if (typeof s.fontSize === 'number' && Number.isFinite(s.fontSize)) {
            setFontSize(Math.round(s.fontSize));
          } else if (s.fontSize === 'large') {
            setFontSize(18);
          } else {
            setFontSize(15);
          }
          setFontFamily(s.fontFamily ?? 'literata');

          const savedHomeBackgroundId =
            typeof s.homeBackgroundId === 'string' ? s.homeBackgroundId : null;
          const savedLastRotationDate =
            typeof s.lastBackgroundRotationDate === 'string' ? s.lastBackgroundRotationDate : null;

          const resolvedHomeBackgroundId = savedHomeBackgroundId ?? defaultHomeBackgroundId;
          setHomeBackgroundId(resolvedHomeBackgroundId);
          setAutoRotateBackground(s.autoRotateBackground ?? true);
          setLastBackgroundRotationDate(savedLastRotationDate);

          setHiddenPrayerIds(s.hiddenPrayerIds ?? []);
          setEditedPrayerIds(s.editedPrayerIds ?? []);
          setUserDevotions(s.userDevotions ?? []);
          setUserPrayers(s.userPrayers ?? []);
          setUserLetters(s.userLetters ?? []);

          const asp = s.alwaysShowPrayers ?? [];
          if (!asp.includes('cartas')) asp.push('cartas');
          setAlwaysShowPrayers(asp);

          setIsDeveloperMode(s.isDeveloperMode ?? false);
          setIsEditModeEnabled(s.isEditModeEnabled ?? false);

          setTimerEnabled(s.timerEnabled ?? false);
          setTimerDuration(s.timerDuration ?? 15);
          setTimerTime((s.timerDuration ?? 15) * 60);
          setOverlayPositions(normalizeOverlayPositions(s.overlayPositions));

          setPlanDeVidaTrackerEnabled(s.planDeVidaTrackerEnabled ?? true);
          setPlanDeVidaProgress(s.planDeVidaProgress ?? []);
          const calendarRaw =
            s.planDeVidaCalendar && typeof s.planDeVidaCalendar === 'object'
              ? s.planDeVidaCalendar
              : {};
          setPlanDeVidaCalendar(calendarRaw);
          setLastResetTimestamp(s.lastResetTimestamp ?? Date.now());

          setUserQuotes(s.userQuotes ?? []);
          setMovableFeastsEnabled(s.movableFeastsEnabled ?? true);

          setCustomThemeColors(s.customThemeColors ?? defaultThemeColors);
          setIsCustomThemeActive(s.isCustomThemeActive ?? false);

          setPinchToZoomEnabled(s.pinchToZoomEnabled ?? true);
          setArrowBubbleSize(s.arrowBubbleSize === 'md' || s.arrowBubbleSize === 'lg' ? s.arrowBubbleSize : 'sm');

          const resolvedUserHomeBackgrounds = Array.isArray(s.userHomeBackgrounds) ? s.userHomeBackgrounds : [];
          setUserHomeBackgrounds(resolvedUserHomeBackgrounds);
          setScrollPositions(s.scrollPositions ?? {});

          setQuoteOfTheDay(s.quoteOfTheDay ?? null);
          setRecentQuoteIds(s.recentQuoteIds ?? []);
          setLastQuoteDate(s.lastQuoteDate ?? null);

          setShownEasterEggQuoteIds(s.shownEasterEggQuoteIds ?? []);

          setHasViewedWrapped(s.hasViewedWrapped ?? false);

          setSaintOfTheDay(s.saintOfTheDay ?? null);
          setSaintOfTheDayImage(s.saintOfTheDayImage ?? null);
          setLastSaintUpdate(s.lastSaintUpdate ?? null);

          const rawCustomPlans = Array.isArray(s.customPlans) ? s.customPlans : [];
          const normalizedPlans: Array<CustomPlan | null> = [null, null, null, null];
          for (const entry of rawCustomPlans) {
            if (!entry || typeof entry !== 'object') continue;
            const slot = (entry as any).slot;
            if (slot !== 1 && slot !== 2 && slot !== 3 && slot !== 4) continue;
            const nameCandidate = typeof (entry as any).name === 'string' ? (entry as any).name : '';
            const trimmedName = nameCandidate.trim();
            const name = trimmedName.length > 0 && !/^Plan personalizado\b/i.test(trimmedName) ? trimmedName : '';
            const prayerIds = Array.isArray((entry as any).prayerIds)
              ? (entry as any).prayerIds.filter((x: any) => typeof x === 'string')
              : [];
            const id = typeof (entry as any).id === 'string' ? (entry as any).id : `custom-plan-${slot}-${Date.now()}`;
            const createdAt = typeof (entry as any).createdAt === 'number' ? (entry as any).createdAt : Date.now();
            normalizedPlans[slot - 1] = { id, slot, name, prayerIds, createdAt };
          }
          setCustomPlans(normalizedPlans);

          setNotificationsEnabledState(s.notificationsEnabled ?? true);
          setDailyReminders(normalizeDailyReminders(s.dailyReminders));
          setDevTestNotificationEnabledState(Boolean(s.devTestNotificationEnabled));
          
          const currentYear = new Date().getFullYear();
          const savedStatsYear = typeof s.statsYear === 'number' ? s.statsYear : currentYear;

          // Handle Year Reset (Jan 1st)
          if (savedStatsYear !== currentYear) {
             // Reset yearly stats
             setUserStats(defaultUserStats);
             setStatsYear(currentYear);
             setHasViewedWrapped(false); // Reset wrapped view for new year
             
             // Initialize global stats from old userStats if global didn't exist
             // (Migration for existing users: assume previous stats were global)
             if (!s.globalUserStats) {
                 setGlobalUserStats({
                     ...defaultUserStats,
                     ...(s.userStats || {}),
                     prayersOpenedHistory: s.userStats?.prayersOpenedHistory || {},
                 });
             } else {
                 setGlobalUserStats({
                     ...defaultUserStats,
                     ...(s.globalUserStats || {}),
                     prayersOpenedHistory: s.globalUserStats?.prayersOpenedHistory || {},
                 });
             }
          } else {
              setUserStats({
                ...defaultUserStats,
                ...(s.userStats || {}),
                prayersOpenedHistory: s.userStats?.prayersOpenedHistory || {},
              });
              setStatsYear(savedStatsYear);
              
              if (s.globalUserStats) {
                 setGlobalUserStats({
                     ...defaultUserStats,
                     ...(s.globalUserStats || {}),
                     prayersOpenedHistory: s.globalUserStats?.prayersOpenedHistory || {},
                 });
              } else {
                 // First run with new code but same year: treat current stats as global too
                 setGlobalUserStats({
                     ...defaultUserStats,
                     ...(s.userStats || {}),
                     prayersOpenedHistory: s.userStats?.prayersOpenedHistory || {},
                 });
              }
          }

          const placeholderHomeBackgrounds = PlaceHolderImages.filter((img) => img.id.startsWith('home-'));
          const resolvedUrl =
            (resolvedHomeBackgroundId
              ? [...placeholderHomeBackgrounds, ...resolvedUserHomeBackgrounds].find((img) => img.id === resolvedHomeBackgroundId)?.imageUrl ?? null
              : null) ?? placeholderHomeBackgrounds[0]?.imageUrl ?? null;

          if (resolvedUrl && typeof document !== 'undefined') {
            const escaped = resolvedUrl.replace(/"/g, '\\"');
            document.documentElement.style.setProperty('--home-bg-image', `url("${escaped}")`);
          }
          if (resolvedUrl) {
            try {
              window.localStorage.setItem('cotidie_home_bg_url', resolvedUrl);
            } catch {}
          }
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

    saveState({
      theme,
      fontSize,
      fontFamily,
      homeBackgroundId,
      autoRotateBackground,
      lastBackgroundRotationDate,
      hiddenPrayerIds,
      editedPrayerIds,
      userDevotions,
      userPrayers,
      userLetters,
      alwaysShowPrayers,
      isDeveloperMode,
      isEditModeEnabled,
      timerEnabled,
      timerDuration,
      overlayPositions,
      notificationsEnabled,
      dailyReminders,
      devTestNotificationEnabled,
      planDeVidaTrackerEnabled,
      planDeVidaProgress,
      planDeVidaCalendar,
      lastResetTimestamp,
      userQuotes,
      movableFeastsEnabled,
      customThemeColors,
      isCustomThemeActive,
      pinchToZoomEnabled,
      arrowBubbleSize,
      userHomeBackgrounds,
      scrollPositions,
      quoteOfTheDay,
      recentQuoteIds,
      lastQuoteDate,
      shownEasterEggQuoteIds,
      saintOfTheDay,
      saintOfTheDayImage,
      lastSaintUpdate,
      customPlans,
      userStats,
      globalUserStats,
      statsYear,
      forceWrappedSeason,
      showZeroStats,
    });
  }, [
    isLoaded,
    theme,
    fontSize,
    fontFamily,
    homeBackgroundId,
    autoRotateBackground,
    lastBackgroundRotationDate,
    hiddenPrayerIds,
    editedPrayerIds,
    userDevotions,
    userPrayers,
    userLetters,
    alwaysShowPrayers,
    isDeveloperMode,
    isEditModeEnabled,
    timerEnabled,
    timerDuration,
    overlayPositions,
    notificationsEnabled,
    dailyReminders,
    devTestNotificationEnabled,
    planDeVidaTrackerEnabled,
    planDeVidaProgress,
    planDeVidaCalendar,
    lastResetTimestamp,
    userQuotes,
    movableFeastsEnabled,
    customThemeColors,
    isCustomThemeActive,
    pinchToZoomEnabled,
    arrowBubbleSize,
    userHomeBackgrounds,
    scrollPositions,
    quoteOfTheDay,
    recentQuoteIds,
    lastQuoteDate,
    shownEasterEggQuoteIds,
    saintOfTheDay,
    saintOfTheDayImage,
    lastSaintUpdate,
    customPlans,
    userStats,
    globalUserStats,
    statsYear,
    forceWrappedSeason,
    showZeroStats,
    hasViewedWrapped,
    saveState,
  ]);

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

  const setDevTestNotificationEnabled = (enabled: boolean) => {
    setDevTestNotificationEnabledState(enabled);
    toast({
      title: enabled
        ? 'Notificacion de prueba activada (cada 5 minutos).'
        : 'Notificacion de prueba desactivada.',
    });
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
    // TODO: Implement override logic for predefined prayers
    console.warn('setPredefinedPrayerOverride not implemented', id, data);
    toast({ title: 'Función no implementada aún.' });
  };

  const resetSettings = () => {
    setTheme('light');
    setFontSize(15);
    setHomeBackgroundId(defaultHomeBackgroundId);
    setOverlayPositions(defaultOverlayPositions);
    setArrowBubbleSize('sm');
    setMovableFeastsEnabled(true);
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
      return true;
    }
    return false;
  };

  const logoutDeveloper = () => {
    setIsDeveloperMode(false);
    setIsEditModeEnabled(false);
    setDevTestNotificationEnabledState(false);
  };

  const removePredefinedPrayer = (id: string) => {
    setHiddenPrayerIds(prev => [...prev, id]);
  };

  const restorePredefinedPrayer = (id: string) => {
    setHiddenPrayerIds(prev => prev.filter(p => p !== id));
  };

  const restoreAllPredefinedPrayers = () => {
    setHiddenPrayerIds([]);
    setEditedPrayerIds([]);
    toast({ title: 'Oraciones predeterminadas restauradas.' });
  };

  const importUserData = (data: any, options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!data || typeof data !== 'object') {
      if (!silent) {
        toast({ variant: 'destructive', title: 'Error al importar', description: 'El archivo no es válido.' });
      }
      return;
    }

    const isFullAppState = isFullAppStatePayload(data);

    if (!isFullAppState) {
      if (data.userDevotions) setUserDevotions(data.userDevotions);
      if (data.userPrayers) setUserPrayers(data.userPrayers);
      if (data.userLetters) setUserLetters(data.userLetters);
      if (data.userQuotes) setUserQuotes(data.userQuotes);
      if (Array.isArray(data.userHomeBackgrounds)) setUserHomeBackgrounds(data.userHomeBackgrounds);
      if (typeof data.homeBackgroundId === 'string') {
        setHomeBackgroundId(data.homeBackgroundId);
      }
      if (typeof data.autoRotateBackground === 'boolean') {
        setAutoRotateBackground(data.autoRotateBackground);
      }
      if (!silent) {
        toast({ title: 'Datos importados.' });
      }
      return;
    }

    setTheme(data.theme ?? 'light');
    if (typeof data.fontSize === 'number' && Number.isFinite(data.fontSize)) {
      setFontSize(Math.round(data.fontSize));
    } else if (data.fontSize === 'large') {
      setFontSize(18);
    } else {
      setFontSize(15);
    }
    setFontFamily(data.fontFamily ?? 'literata');

    setHomeBackgroundId(data.homeBackgroundId ?? defaultHomeBackgroundId);
    setAutoRotateBackground(data.autoRotateBackground ?? true);
    setLastBackgroundRotationDate(data.lastBackgroundRotationDate ?? null);

    setHiddenPrayerIds(Array.isArray(data.hiddenPrayerIds) ? data.hiddenPrayerIds : []);
    setEditedPrayerIds(Array.isArray(data.editedPrayerIds) ? data.editedPrayerIds : []);

    setUserDevotions(Array.isArray(data.userDevotions) ? data.userDevotions : []);
    setUserPrayers(Array.isArray(data.userPrayers) ? data.userPrayers : []);
    setUserLetters(Array.isArray(data.userLetters) ? data.userLetters : []);

    const asp = Array.isArray(data.alwaysShowPrayers) ? data.alwaysShowPrayers : [];
    if (!asp.includes('cartas')) asp.push('cartas');
    setAlwaysShowPrayers(asp);

    setIsDeveloperMode(data.isDeveloperMode ?? false);
    setIsEditModeEnabled(data.isEditModeEnabled ?? false);

    setTimerEnabled(data.timerEnabled ?? false);
    setTimerDuration(typeof data.timerDuration === 'number' ? data.timerDuration : 15);
    setTimerActive(false);
    setTimerTime((typeof data.timerDuration === 'number' ? data.timerDuration : 15) * 60);
    setOverlayPositions(normalizeOverlayPositions(data.overlayPositions));

    setPlanDeVidaTrackerEnabled(data.planDeVidaTrackerEnabled ?? true);
    setPlanDeVidaProgress(Array.isArray(data.planDeVidaProgress) ? data.planDeVidaProgress : []);
    setPlanDeVidaCalendar(
      data.planDeVidaCalendar && typeof data.planDeVidaCalendar === 'object'
        ? data.planDeVidaCalendar
        : {}
    );
    setLastResetTimestamp(typeof data.lastResetTimestamp === 'number' ? data.lastResetTimestamp : Date.now());

    setUserQuotes(Array.isArray(data.userQuotes) ? data.userQuotes : []);
    setMovableFeastsEnabled(data.movableFeastsEnabled ?? true);

    setCustomThemeColors(data.customThemeColors ?? defaultThemeColors);
    setIsCustomThemeActive(data.isCustomThemeActive ?? false);
    setPinchToZoomEnabled(data.pinchToZoomEnabled ?? true);
    setArrowBubbleSize(data.arrowBubbleSize === 'md' || data.arrowBubbleSize === 'lg' ? data.arrowBubbleSize : 'sm');

    setUserHomeBackgrounds(Array.isArray(data.userHomeBackgrounds) ? data.userHomeBackgrounds : []);
    setScrollPositions(data.scrollPositions && typeof data.scrollPositions === 'object' ? data.scrollPositions : {});

    setQuoteOfTheDay(data.quoteOfTheDay ?? null);
    setRecentQuoteIds(Array.isArray(data.recentQuoteIds) ? data.recentQuoteIds : []);
    setLastQuoteDate(typeof data.lastQuoteDate === 'string' ? data.lastQuoteDate : null);

    setShownEasterEggQuoteIds(Array.isArray(data.shownEasterEggQuoteIds) ? data.shownEasterEggQuoteIds : []);

    setSaintOfTheDay(data.saintOfTheDay ?? null);
          setSaintOfTheDayImage(data.saintOfTheDayImage ?? null);
          setLastSaintUpdate(typeof data.lastSaintUpdate === 'string' ? data.lastSaintUpdate : null);
          // No necesitamos persistir overriddenFixedSaint, se recalcula

    const rawCustomPlans = Array.isArray(data.customPlans) ? data.customPlans : [];
    const normalizedPlans: Array<CustomPlan | null> = [null, null, null, null];
    for (const entry of rawCustomPlans) {
      if (!entry || typeof entry !== 'object') continue;
      const slot = (entry as any).slot;
      if (slot !== 1 && slot !== 2 && slot !== 3 && slot !== 4) continue;
      const nameCandidate = typeof (entry as any).name === 'string' ? (entry as any).name : '';
      const trimmedName = nameCandidate.trim();
      const name = trimmedName.length > 0 && !/^Plan personalizado\b/i.test(trimmedName) ? trimmedName : '';
      const prayerIds = Array.isArray((entry as any).prayerIds)
        ? (entry as any).prayerIds.filter((x: any) => typeof x === 'string')
        : [];
      const id = typeof (entry as any).id === 'string' ? (entry as any).id : `custom-plan-${slot}-${Date.now()}`;
      const createdAt = typeof (entry as any).createdAt === 'number' ? (entry as any).createdAt : Date.now();
      normalizedPlans[slot - 1] = { id, slot, name, prayerIds, createdAt };
    }
    setCustomPlans(normalizedPlans);

    if (!silent) {
      toast({ title: 'Datos importados.' });
    }
  };

  const importCustomPlanPayload = useCallback((data: any) => {
    if (!isCustomPlanPayload(data)) return false;
    const normalizedPrayerIds = data.prayerIds.filter((x: unknown): x is string => typeof x === 'string');
    if (normalizedPrayerIds.length === 0) return false;

    const preferredSlot = data.slot === 1 || data.slot === 2 || data.slot === 3 || data.slot === 4 ? data.slot : null;
    setCustomPlans((prev) => {
      const next = [...prev];
      const firstEmpty = next.findIndex((entry) => !entry);
      const targetSlot =
        (preferredSlot && !next[preferredSlot - 1] && preferredSlot) ||
        (firstEmpty >= 0 ? ((firstEmpty + 1) as 1 | 2 | 3 | 4) : (preferredSlot ?? 1));
      const trimmed = data.name.trim();
      const name = trimmed.length > 0 && !/^Plan personalizado\b/i.test(trimmed) ? trimmed : `Plan ${targetSlot}`;
      next[targetSlot - 1] = {
        id: `custom-plan-${targetSlot}-${Date.now()}`,
        slot: targetSlot,
        name,
        prayerIds: normalizedPrayerIds,
        createdAt: Date.now(),
      };
      return next;
    });
    return true;
  }, []);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const consumePendingImport = () => {
      try {
        const raw = window.localStorage.getItem(PENDING_IMPORT_STORAGE_KEY);
        if (!raw || raw === lastProcessedPendingImportRef.current) return;

        lastProcessedPendingImportRef.current = raw;
        window.localStorage.removeItem(PENDING_IMPORT_STORAGE_KEY);

        const parsed = JSON.parse(raw);
        if (importCustomPlanPayload(parsed)) {
          toast({ title: 'Plan personalizado cargado con éxito.' });
          return;
        }
        importUserData(parsed, { silent: true });
        toast({ title: 'Respaldo cargado con éxito.' });
      } catch {
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
  }, [isLoaded, importCustomPlanPayload, importUserData, toast]);

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

  const togglePlanDeVidaItem = (id: string, force?: boolean) => {
     const now = simulatedDate ? new Date(simulatedDate) : new Date();
     const yyyy = now.getFullYear();
     const mm = String(now.getMonth() + 1).padStart(2, '0');
     const dd = String(now.getDate()).padStart(2, '0');
     const dateKey = `${yyyy}-${mm}-${dd}`;

     setPlanDeVidaProgress(prev => {
        const isChecked = prev.includes(id);
        const nextChecked = force !== undefined ? force : !isChecked;

        setPlanDeVidaCalendar(prevCalendar => {
          const existing = Array.isArray(prevCalendar[dateKey]) ? prevCalendar[dateKey] : [];
          if (nextChecked) {
            if (existing.includes(id)) return prevCalendar;
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

        if (nextChecked) {
          return isChecked ? prev : [...prev, id];
        }
        return prev.filter(p => p !== id);
     });
  };

  const resetPlanDeVidaProgress = () => {
    setPlanDeVidaProgress([]);
    setLastResetTimestamp(Date.now());
  };

  // Plan de Vida daily reset
  useEffect(() => {
    const now = new Date();
    const last = new Date(lastResetTimestamp);
    if (now.getDate() !== last.getDate()) {
        resetPlanDeVidaProgress();
    }
  }, [lastResetTimestamp]);

  useEffect(() => {
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    const dateKey = now.toISOString().slice(0, 10);
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

  const registerEasterEggQuote = (quoteId: string | null, reset?: boolean) => {
     if (reset) {
         setShownEasterEggQuoteIds([]);
     } else if (quoteId) {
         setShownEasterEggQuoteIds(prev => [...prev, quoteId]);
     }
  };

  // Combined prayers list
  const allPrayers = useMemo(() => {
    return [
      ...initialPrayers.filter(p => !hiddenPrayerIds.includes(p.id!)),
      ...userDevotions,
      ...userPrayers,
      ...userLetters,
    ];
  }, [initialPrayers, hiddenPrayerIds, userDevotions, userPrayers, userLetters]);

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

  const incrementGlobalStat = (key: keyof UserStats, subKey?: string) => {
    setGlobalUserStats(prev => {
        // Reuse logic? Or copy-paste for safety.
        // It's safer to just replicate the increment logic for global stats
        // but without side effects (like plan de vida toggling)
        if (key === 'prayersOpenedHistory' && subKey) {
            const history = { ...prev.prayersOpenedHistory };
            history[subKey] = (history[subKey] || 0) + 1;
            
            const now = new Date();
            const hour = now.getHours();
            const isNight = hour >= 20 || hour < 4; // Expanded range for Night (8PM - 4AM)
            const isMorning = hour >= 4 && hour < 12; // Expanded range for Morning (4AM - 12PM)

            const isRosary = subKey === 'rosario' || subKey === 'santo-rosario';
            const isAngelus =
              subKey === 'angelus' ||
              subKey === 'regina-caeli' ||
              subKey === 'angelus-regina-coeli';
            const isExamination = subKey === 'examen-conciencia' || subKey === 'examen-noche';
            
            const todayKey = getLocalDateKey(now);
            const lastOpened = prev.prayerLastOpened?.[subKey];
            
            const newPrayerLastOpened = { ...(prev.prayerLastOpened || {}) };
            const newPrayerDaysCount = { ...(prev.prayerDaysCount || {}) };
            
            if (lastOpened !== todayKey) {
                 newPrayerLastOpened[subKey] = todayKey;
                 newPrayerDaysCount[subKey] = (newPrayerDaysCount[subKey] || 0) + 1;
            }

            let newMassStreak = prev.massStreak || 0;
            let newMassDaysCount = prev.massDaysCount || 0;
            let newLastMassDate = prev.lastMassDate;

            // Morning Stats (No streak, just total days)
            let newMorningDaysCount = prev.morningDaysCount || 0;
            let newLastMorningDate = prev.lastMorningPrayerDate;

            // Night Stats (No streak, just total days)
            let newNightDaysCount = prev.nightDaysCount || 0;
            let newLastNightDate = prev.lastNightPrayerDate;

            const prayer = getPrayerById(subKey, allPrayers);
            
            // Mass Logic
            const isMassPrayer = 
                subKey === 'santa-misa' || 
                subKey === 'antes-misa' || 
                subKey === 'despues-misa' || 
                subKey === 'misal' ||
                (prayer?.categoryId === 'santa-misa') ||
                (getRootPlanDeVidaId(subKey) === 'santa-misa');

            if (isMassPrayer) {
                 if (newLastMassDate !== todayKey) {
                     const yesterday = new Date(now);
                     yesterday.setDate(yesterday.getDate() - 1);
                     const yesterdayKey = getLocalDateKey(yesterday);
                     
                     if (newLastMassDate === yesterdayKey) {
                         newMassStreak += 1;
                     } else {
                         newMassStreak = 1;
                     }
                     newLastMassDate = todayKey;
                     newMassDaysCount += 1;
                 }
            }

            // Morning Logic
            if (isMorning) {
                if (newLastMorningDate !== todayKey) {
                    newLastMorningDate = todayKey;
                    newMorningDaysCount += 1;
                }
            }

            // Night Logic
            if (isNight) {
                if (newLastNightDate !== todayKey) {
                    newLastNightDate = todayKey;
                    newNightDaysCount += 1;
                }
            }
            
            return { 
              ...prev, 
              prayersOpenedHistory: history,
              totalPrayersOpened: prev.totalPrayersOpened + 1,
              // Update specific requested stats
              massStreak: newMassStreak,
              massDaysCount: newMassDaysCount,
              morningDaysCount: newMorningDaysCount,
              nightDaysCount: newNightDaysCount,
              // Update dates
              lastMassDate: newLastMassDate,
              lastMorningPrayerDate: newLastMorningDate,
              lastNightPrayerDate: newLastNightDate,
              // Keep others updating in background just in case
              rosaryCount: isRosary ? (prev.rosaryCount || 0) + 1 : (prev.rosaryCount || 0),
              angelusCount: isAngelus ? (prev.angelusCount || 0) + 1 : (prev.angelusCount || 0),
              examinationCount: isExamination ? (prev.examinationCount || 0) + 1 : (prev.examinationCount || 0),
              prayerLastOpened: newPrayerLastOpened,
              prayerDaysCount: newPrayerDaysCount,
            };
        }
        
        if (typeof prev[key] === 'number') {
            return { ...prev, [key]: (prev[key] as number) + 1 };
        }
        
        return prev;
    });
  };

  const incrementStat = (key: keyof UserStats, subKey?: string) => {
    // Check freeze time (1 hour)
    if (key === 'prayersOpenedHistory' && subKey) {
        const now = Date.now();
        const lastIncrement = userStats.prayerLastIncrementTimestamp?.[subKey] || 0;
        if (now - lastIncrement < 3600000) { // 1 hour = 3600000 ms
            return;
        }
    }

    // Always increment global stats too
    incrementGlobalStat(key, subKey);

    if (key === 'prayersOpenedHistory' && subKey) {
        // Side effect: Mark Plan de Vida item as checked
        const rootId = getRootPlanDeVidaId(subKey);
        if (rootId) {
            togglePlanDeVidaItem(rootId, true);
        }
    }

    setUserStats(prev => {
      if (key === 'prayersOpenedHistory' && subKey) {
        const history = { ...prev.prayersOpenedHistory };
        history[subKey] = (history[subKey] || 0) + 1;
        
        // Update timestamp
        const timestamps = { ...(prev.prayerLastIncrementTimestamp || {}) };
        timestamps[subKey] = Date.now();

        // Check for time-based stats
        const now = new Date();
        const hour = now.getHours();
        const isNight = hour >= 20 || hour < 4; // Expanded range for Night (8PM - 4AM)
        const isMorning = hour >= 4 && hour < 12; // Expanded range for Morning (4AM - 12PM)

        // Specific prayer type checks
        const isRosary = subKey === 'rosario' || subKey === 'santo-rosario';
        const isAngelus =
          subKey === 'angelus' ||
          subKey === 'regina-caeli' ||
          subKey === 'angelus-regina-coeli';
        const isExamination = subKey === 'examen-conciencia' || subKey === 'examen-noche';
        
        // Track unique days for this prayer/devotion
        const todayKey = getLocalDateKey(now);
        const lastOpened = prev.prayerLastOpened?.[subKey];
        
        const newPrayerLastOpened = { ...(prev.prayerLastOpened || {}) };
        const newPrayerDaysCount = { ...(prev.prayerDaysCount || {}) };
        
        if (lastOpened !== todayKey) {
             newPrayerLastOpened[subKey] = todayKey;
             newPrayerDaysCount[subKey] = (newPrayerDaysCount[subKey] || 0) + 1;
        }

        // Mass Stats
        let newMassStreak = prev.massStreak || 0;
        let newMassDaysCount = prev.massDaysCount || 0;
        let newLastMassDate = prev.lastMassDate;

        const prayer = getPrayerById(subKey, allPrayers);
        const isMassPrayer = 
            subKey === 'santa-misa' || 
            subKey === 'antes-misa' || 
            subKey === 'despues-misa' || 
            subKey === 'misal' ||
            (prayer?.categoryId === 'santa-misa') ||
            (getRootPlanDeVidaId(subKey) === 'santa-misa');

        if (isMassPrayer) {
             if (newLastMassDate !== todayKey) {
                 const yesterday = new Date(now);
                 yesterday.setDate(yesterday.getDate() - 1);
                 const yesterdayKey = getLocalDateKey(yesterday);
                 
                 if (newLastMassDate === yesterdayKey) {
                     newMassStreak += 1;
                 } else {
                     newMassStreak = 1;
                 }
                 newLastMassDate = todayKey;
                 newMassDaysCount += 1;
             }
        }

        // Morning Stats (Total Days)
        let newMorningDaysCount = prev.morningDaysCount || 0;
        let newLastMorningDate = prev.lastMorningPrayerDate;

        if (isMorning) {
            if (newLastMorningDate !== todayKey) {
                newLastMorningDate = todayKey;
                newMorningDaysCount += 1;
            }
        }

        // Night Stats (Total Days)
        let newNightDaysCount = prev.nightDaysCount || 0;
        let newLastNightDate = prev.lastNightPrayerDate;

        if (isNight) {
            if (newLastNightDate !== todayKey) {
                newLastNightDate = todayKey;
                newNightDaysCount += 1;
            }
        }
        
        return { 
          ...prev, 
          prayersOpenedHistory: history,
          totalPrayersOpened: prev.totalPrayersOpened + 1,
          
          // Updated Stats
          massStreak: newMassStreak,
          massDaysCount: newMassDaysCount,
          morningDaysCount: newMorningDaysCount,
          nightDaysCount: newNightDaysCount,
          
          // Updated Dates
          lastMassDate: newLastMassDate,
          lastMorningPrayerDate: newLastMorningDate,
          lastNightPrayerDate: newLastNightDate,

          // Other Counts
          rosaryCount: isRosary ? (prev.rosaryCount || 0) + 1 : (prev.rosaryCount || 0),
          angelusCount: isAngelus ? (prev.angelusCount || 0) + 1 : (prev.angelusCount || 0),
          examinationCount: isExamination ? (prev.examinationCount || 0) + 1 : (prev.examinationCount || 0),
          
          prayerLastOpened: newPrayerLastOpened,
          prayerDaysCount: newPrayerDaysCount,
          prayerLastIncrementTimestamp: timestamps,
        };
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

  const daysInMonth = (year: number, monthIndex: number) =>
    new Date(year, monthIndex + 1, 0).getDate();

  const addMonthsClamped = (date: Date, months: number) => {
    const year = date.getFullYear();
    const month = date.getMonth() + months;
    const targetYear = year + Math.floor(month / 12);
    const targetMonth = ((month % 12) + 12) % 12;
    const maxDay = daysInMonth(targetYear, targetMonth);
    const day = Math.min(date.getDate(), maxDay);
    return new Date(
      targetYear,
      targetMonth,
      day,
      date.getHours(),
      date.getMinutes(),
      0,
      0
    );
  };

  const addYearsClamped = (date: Date, years: number) => {
    const targetYear = date.getFullYear() + years;
    const maxDay = daysInMonth(targetYear, date.getMonth());
    const day = Math.min(date.getDate(), maxDay);
    return new Date(
      targetYear,
      date.getMonth(),
      day,
      date.getHours(),
      date.getMinutes(),
      0,
      0
    );
  };

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  type FixedDateKind = 'daily' | 'monthly' | 'yearly' | 'once' | 'relative-monthly';
  type RelativeMonthlySpec = {
    weekday: number;
    ordinal: '1' | '2' | '3' | '4' | 'u';
    hours: number;
    minutes: number;
  };
  type ParsedFixedDate = { kind: FixedDateKind; date: Date; relative?: RelativeMonthlySpec };

  const weekdayByLetter: Record<string, number> = {
    d: 0,
    l: 1,
    m: 2,
    w: 3,
    j: 4,
    v: 5,
    s: 6,
  };

  const getNthWeekdayOfMonth = (year: number, monthIndex: number, weekday: number, nth: number) => {
    const first = new Date(year, monthIndex, 1);
    const firstDow = first.getDay();
    const delta = (weekday - firstDow + 7) % 7;
    const day = 1 + delta + (nth - 1) * 7;
    return new Date(year, monthIndex, day);
  };

  const getLastWeekdayOfMonth = (year: number, monthIndex: number, weekday: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0);
    const lastDow = lastDay.getDay();
    const delta = (lastDow - weekday + 7) % 7;
    const day = lastDay.getDate() - delta;
    return new Date(year, monthIndex, day);
  };

  const buildRelativeMonthlyDate = (
    year: number,
    monthIndex: number,
    spec: RelativeMonthlySpec
  ) => {
    const candidate =
      spec.ordinal === 'u'
        ? getLastWeekdayOfMonth(year, monthIndex, spec.weekday)
        : getNthWeekdayOfMonth(year, monthIndex, spec.weekday, Number(spec.ordinal));
    candidate.setHours(spec.hours, spec.minutes, 0, 0);
    return candidate;
  };

  const parseFixedNotificationDate = (value: string, now: Date): ParsedFixedDate | null => {
    const full = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (full) {
      const [, dd, mm, yyyy, hh, min] = full;
      const day = Number(dd);
      const month = Number(mm);
      const year = Number(yyyy);
      const hours = Number(hh);
      const minutes = Number(min);
      if (![day, month, year, hours, minutes].every(Number.isFinite)) return null;
      if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const maxDay = daysInMonth(year, month - 1);
      if (day > maxDay) return null;
      const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return Number.isNaN(date.getTime()) ? null : { kind: 'once', date };
    }

    const dayMonth = value.match(/^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
    if (dayMonth) {
      const [, dd, mm, hh, min] = dayMonth;
      const day = Number(dd);
      const month = Number(mm);
      const hours = Number(hh);
      const minutes = Number(min);
      if (![day, month, hours, minutes].every(Number.isFinite)) return null;
      if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const year = now.getFullYear();
      const maxDay = daysInMonth(year, month - 1);
      const clampedDay = Math.min(day, maxDay);
      const date = new Date(year, month - 1, clampedDay, hours, minutes, 0, 0);
      return Number.isNaN(date.getTime()) ? null : { kind: 'yearly', date };
    }

    const dayOnly = value.match(/^(\d{2})\s+(\d{2}):(\d{2})$/);
    if (dayOnly) {
      const [, dd, hh, min] = dayOnly;
      const day = Number(dd);
      const hours = Number(hh);
      const minutes = Number(min);
      if (![day, hours, minutes].every(Number.isFinite)) return null;
      if (day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const year = now.getFullYear();
      const monthIndex = now.getMonth();
      const maxDay = daysInMonth(year, monthIndex);
      const clampedDay = Math.min(day, maxDay);
      const date = new Date(year, monthIndex, clampedDay, hours, minutes, 0, 0);
      return Number.isNaN(date.getTime()) ? null : { kind: 'monthly', date };
    }

    const relative = value.match(/^([lmwjvsd])([1234u])\s+(\d{2}):(\d{2})$/i);
    if (relative) {
      const [, letter, ordinal, hh, min] = relative;
      const weekday = weekdayByLetter[String(letter).toLowerCase()];
      const hours = Number(hh);
      const minutes = Number(min);
      if (typeof weekday !== 'number') return null;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const spec: RelativeMonthlySpec = {
        weekday,
        ordinal: ordinal.toLowerCase() as RelativeMonthlySpec['ordinal'],
        hours,
        minutes,
      };
      const date = buildRelativeMonthlyDate(now.getFullYear(), now.getMonth(), spec);
      return Number.isNaN(date.getTime())
        ? null
        : { kind: 'relative-monthly', date, relative: spec };
    }

    const timeOnly = value.match(/^(\d{2}):(\d{2})$/);
    if (timeOnly) {
      const [, hh, min] = timeOnly;
      const hours = Number(hh);
      const minutes = Number(min);
      if (![hours, minutes].every(Number.isFinite)) return null;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      return Number.isNaN(date.getTime()) ? null : { kind: 'daily', date };
    }

    return null;
  };

  const addByKind = (date: Date, kind: FixedDateKind, relative?: RelativeMonthlySpec) => {
    switch (kind) {
      case 'daily':
        return addDays(date, 1);
      case 'monthly':
        return addMonthsClamped(date, 1);
      case 'yearly':
        return addYearsClamped(date, 1);
      case 'relative-monthly': {
        if (!relative) return addMonthsClamped(date, 1);
        const baseMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const nextMonth = addMonthsClamped(baseMonth, 1);
        return buildRelativeMonthlyDate(nextMonth.getFullYear(), nextMonth.getMonth(), relative);
      }
      case 'once':
      default:
        return date;
    }
  };

  const getNextOccurrence = (
    base: Date,
    kind: FixedDateKind,
    now: Date,
    relative?: RelativeMonthlySpec
  ) => {
    if (kind === 'relative-monthly' && relative) {
      let next = buildRelativeMonthlyDate(now.getFullYear(), now.getMonth(), relative);
      if (next.getTime() < now.getTime()) {
        const nextMonth = addMonthsClamped(new Date(now.getFullYear(), now.getMonth(), 1), 1);
        next = buildRelativeMonthlyDate(nextMonth.getFullYear(), nextMonth.getMonth(), relative);
      }
      return next;
    }
    let next = new Date(base);
    if (kind === 'once') return next;
    while (next.getTime() < now.getTime()) {
      next = addByKind(next, kind);
    }
    return next;
  };

  const weekdayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const weekdayShort = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const monthShort = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];

  const formatTemplate = (template: string, date: Date) => {
    const pad2 = (n: number) => String(n).padStart(2, '0');

    const buildReplacements = (base: Date): Record<string, string> => {
      const year = base.getFullYear();
      const month = base.getMonth() + 1;
      const day = base.getDate();
      const hours = base.getHours();
      const minutes = base.getMinutes();
      const isoDate = `${year}-${pad2(month)}-${pad2(day)}`;
      const dateEs = `${pad2(day)}/${pad2(month)}/${year}`;
      const time = `${pad2(hours)}:${pad2(minutes)}`;
      const isoDateTime = `${isoDate} ${time}`;

      return {
        year: String(year),
        month: pad2(month),
        day: pad2(day),
        hour: pad2(hours),
        minute: pad2(minutes),
        weekday: weekdayNames[base.getDay()],
        weekday_short: weekdayShort[base.getDay()],
        month_name: monthNames[base.getMonth()],
        month_short: monthShort[base.getMonth()],
        date: dateEs,
        date_iso: isoDate,
        time,
        datetime: `${dateEs} ${time}`,
        datetime_iso: isoDateTime,
      };
    };

    const applyOffset = (base: Date, key: string, offset: number) => {
      if (!Number.isFinite(offset) || offset === 0) return new Date(base);
      switch (key) {
        case 'year':
          return addYearsClamped(base, offset);
        case 'month':
        case 'month_name':
        case 'month_short':
          return addMonthsClamped(base, offset);
        case 'day':
        case 'date':
        case 'date_iso':
        case 'weekday':
        case 'weekday_short':
        case 'datetime':
        case 'datetime_iso':
          return addDays(base, offset);
        case 'hour': {
          const next = new Date(base);
          next.setHours(next.getHours() + offset);
          return next;
        }
        case 'minute': {
          const next = new Date(base);
          next.setMinutes(next.getMinutes() + offset);
          return next;
        }
        default:
          return new Date(base);
      }
    };

    return template.replace(/\{([a-z_]+)([+-]\d+)?\}/gi, (match, key, delta) => {
      const k = String(key).toLowerCase();
      const offset = delta ? Number(delta) : 0;
      if (k === 'year' && Number.isFinite(offset) && Math.abs(offset) >= 1000) {
        return String(date.getFullYear() + offset);
      }
      const base = Number.isFinite(offset) && offset !== 0 ? applyOffset(date, k, offset) : date;
      const replacements = buildReplacements(base);
      return Object.prototype.hasOwnProperty.call(replacements, k) ? replacements[k] : match;
    });
  };

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
    const fixedActive = notificationsEnabled ? fixedNotifications : [];

    const sync = async () => {
      const now = new Date();
      const platform = Capacitor.getPlatform();
      const maxTotal = platform === 'ios' ? 60 : 180;
      const totalSources = active.length + fixedActive.length;
      const horizonDays = Math.min(30, Math.max(1, Math.floor(maxTotal / Math.max(1, totalSources))));
      const horizonEnd = new Date(now);
      horizonEnd.setDate(now.getDate() + horizonDays);

      const pending = await LocalNotifications.getPending().catch(() => null);
      const pendingIds =
        pending && Array.isArray((pending as any).notifications)
          ? ((pending as any).notifications as Array<{ id: number }>).map((n) => n.id).filter(Number.isFinite)
          : [];
      if (pendingIds.length > 0) {
        await LocalNotifications.cancel({ notifications: pendingIds.map((id) => ({ id })) });
      }

      if (!notificationsEnabled || (active.length === 0 && fixedActive.length === 0)) return;

      const currentPerms = await LocalNotifications.checkPermissions();
      const perms = currentPerms.display === 'granted'
        ? currentPerms
        : await LocalNotifications.requestPermissions();

      if (perms.display !== 'granted') {
        toast({
          variant: 'destructive',
          title: 'Notificaciones desactivadas',
          description: 'No hay permiso para mostrar notificaciones.',
        });
        return;
      }

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

      await ensureAndroidNotificationChannel();

      const icon = theme === 'dark' ? 'small_icon_white' : 'small_icon_black';
      const isAndroid = platform === 'android';

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
          const id = toNotificationId(`cotidie:${r.id}:${dateKey}`);
          notifications.push({
            id,
            title: getReminderTitle(r.target),
            body: message,
            channelId: 'cotidie-reminders',
            smallIcon: icon,
            schedule: {
              at: fireAt,
              allowWhileIdle: true,
            },
            extra: { target: r.target, reminderId: r.id, date: dateKey },
          });
        }
      }

      if (fixedActive.length > 0) {
        fixedActive.forEach((entry: FixedNotificationEntry, index: number) => {
          if (entry.devOnly && !isDeveloperMode) return;
          const parsed = parseFixedNotificationDate(entry.date, now);
          if (!parsed) {
            console.warn('Invalid fixed notification date', entry);
            return;
          }
          let next = getNextOccurrence(parsed.date, parsed.kind, now, parsed.relative);
          while (next.getTime() <= horizonEnd.getTime()) {
            const dateKey = toDateKey(next);
            const id = toNotificationId(`fixed:${index}:${entry.date}:${dateKey}`);
            let imagePath: string | null = null;
            if (typeof entry.image === 'string') {
              if (entry.image.startsWith('./')) {
                imagePath = `/images/${entry.image.slice(2)}`;
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
              largeIcon: imageDrawable ?? undefined,
              attachments: imagePath ? [imagePath] : undefined,
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
                route: entry.route ?? null,
              },
            });
            if (parsed.kind === 'once') break;
            next = addByKind(next, parsed.kind, parsed.relative);
          }
        });
      }

      if (devTestNotificationEnabled && isDeveloperMode) {
        const devImagePath = '/icons/icon.png';
        const devImageDrawable = toAndroidDrawableResource(devImagePath);
        // 12 recurring notifications per hour -> every 5 minutes (:00, :05, ... :55).
        for (let minute = 0; minute < 60; minute += 5) {
          const id = toNotificationId(`dev:test:5m:${minute}`);
          notifications.push({
            id,
            title: 'Notificacion de prueba (Dev)',
            body: 'Recordatorio automatico cada 5 minutos.',
            channelId: 'cotidie-reminders',
            smallIcon: icon,
            largeIcon: devImageDrawable,
            attachments: [devImagePath],
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
        if (fireAt.getTime() < now.getTime() || fireAt.getTime() > horizonEnd.getTime()) return;
        const dateKey = toDateKey(fireAt);
        const id = toNotificationId(`fixed:${key}:${year}:${dateKey}`);
        notifications.push({
          id,
          title: formatTemplate(title, fireAt),
          body: formatTemplate(body, fireAt),
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          largeIcon: icon,
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

      const getWrappedSeasonStartForYear = (year: number) => {
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
        const start = getWrappedSeasonStartForYear(year);
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
        if (fireAt.getTime() < now.getTime() || fireAt.getTime() > horizonEnd.getTime()) return;
        const dateKey = toDateKey(fireAt);
        const id = toNotificationId(`fixed:easter:${year}:${dateKey}`);
        notifications.push({
          id,
          title: formatTemplate('Domingo de Resurrección', fireAt),
          body: formatTemplate('¡Cristo ha resucitado! Feliz Pascua.', fireAt),
          channelId: 'cotidie-reminders',
          smallIcon: icon,
          largeIcon: icon,
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
      scheduleMovable(now.getFullYear(), 7, 'Domingo de la Divina Misericordia', 'Segundo Domingo de Pascua. Confia en la misericordia del Senor y acercate a su perdon.', 'divine-mercy', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 7, 'Domingo de la Divina Misericordia', 'Segundo Domingo de Pascua. Confia en la misericordia del Senor y acercate a su perdon.', 'divine-mercy', 9, 0);
      scheduleMovable(now.getFullYear(), 39, 'Ascension del Senor', 'Solemnidad. Jesucristo sube al cielo y nos invita a elevar el corazon y la esperanza.', 'ascension', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 39, 'Ascension del Senor', 'Solemnidad. Jesucristo sube al cielo y nos invita a elevar el corazon y la esperanza.', 'ascension', 9, 0);
      scheduleMovable(now.getFullYear(), 49, 'Pentecostes', 'Solemnidad. Invoca al Espiritu Santo y deja que renueve tu vida.', 'pentecost', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 49, 'Pentecostes', 'Solemnidad. Invoca al Espiritu Santo y deja que renueve tu vida.', 'pentecost', 9, 0);
      scheduleMovable(now.getFullYear(), 56, 'Santisima Trinidad', 'Solemnidad. Alaba al Padre, al Hijo y al Espiritu Santo con fe y gratitud.', 'trinity', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 56, 'Santisima Trinidad', 'Solemnidad. Alaba al Padre, al Hijo y al Espiritu Santo con fe y gratitud.', 'trinity', 9, 0);
      scheduleMovable(now.getFullYear(), 60, 'Corpus Christi', 'Solemnidad del Cuerpo y la Sangre de Cristo. Adora la Eucaristia y renueva tu amor por ella.', 'corpus-christi', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 60, 'Corpus Christi', 'Solemnidad del Cuerpo y la Sangre de Cristo. Adora la Eucaristia y renueva tu amor por ella.', 'corpus-christi', 9, 0);
      scheduleMovable(now.getFullYear(), 68, 'Sagrado Corazon de Jesus', 'Solemnidad. Consagra tu corazon al Corazon de Jesus y confia en su amor.', 'sacred-heart', 9, 0);
      scheduleMovable(now.getFullYear() + 1, 68, 'Sagrado Corazon de Jesus', 'Solemnidad. Consagra tu corazon al Corazon de Jesus y confia en su amor.', 'sacred-heart', 9, 0);
      const annuumYearsAhead = 10;
      for (let i = 0; i <= annuumYearsAhead; i++) {
        scheduleCotidieAnnuumStart(now.getFullYear() + i);
      }

      try {
        await LocalNotifications.schedule({ notifications });
      } catch {
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
    devTestNotificationEnabled,
    getReminderTitle,
    buildDefaultReminderMessage,
    ensureAndroidNotificationChannel,
    isDeveloperMode,
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
    const fixed = saintsData.saints.find(s => s.month === currentMonth && s.day === currentDay);

    // Priority logic based on user setting
    // If enabled: Movable takes precedence (e.g. Ash Wednesday > San Simeón)
    // If disabled: Fixed takes precedence (e.g. San Simeón > Ash Wednesday)
    const effectiveSaint = movableFeastsEnabled 
      ? (movable || fixed) 
      : (fixed || movable);

    const dow = now.getDay(); // 0..6
    const dayImageId = `saintoftheday-${dow}`;
    const dayImage = PlaceHolderImages.find(img => img.id === dayImageId) || null;

    let image = dayImage;
    if (currentMonth === 12 && (currentDay === 24 || currentDay === 25)) {
      const christmasImage = PlaceHolderImages.find((img) => img.id === 'christmas-image') || null;
      image = christmasImage || dayImage;
    } else {
      const saintImageBySubstring: Array<{match: string; id: string}> = [
        { match: 'Alberto Hurtado', id: 'sanalbertohurtado-image' },
        { match: 'Francisco de Sales', id: 'sanfranciscodesales-image' },
        { match: 'Agustín, obispo y doctor', id: 'sanagustindehipona-image' },
        { match: 'Santo Tomás de Aquino', id: 'santotomasdeaquino-image' },
        { match: 'Benjamín', id: 'sanbenjamin-image' },
        { match: 'Natividad del Señor', id: 'nativity-image' },
      ];

      const marianNamePattern =
        /(Nuestra Señora|Virgen María|Inmaculada Concepción|Asunción de la Virgen|Presentación de la Virgen|Natividad de la Virgen|Visitación de la Virgen)/i;
      const marianImage = PlaceHolderImages.find((img) => img.id === 'saintoftheday-6') || dayImage;
      const isMarian = Boolean(
        (effectiveSaint as any)?.type === 'marian' || (effectiveSaint?.name && marianNamePattern.test(effectiveSaint.name))
      );

      if (isMarian) {
        image = marianImage;
      } else if (effectiveSaint && effectiveSaint.name) {
        const found = saintImageBySubstring.find(entry => effectiveSaint.name.includes(entry.match));
        const mapped = found ? PlaceHolderImages.find(img => img.id === found.id) : null;
        image = mapped || dayImage;
      }
    }

    const sameSaint =
      saintOfTheDay?.name === effectiveSaint?.name &&
      saintOfTheDay?.type === (effectiveSaint as any)?.type;
    const sameImage =
      saintOfTheDayImage?.id === image?.id &&
      saintOfTheDayImage?.imageUrl === image?.imageUrl;

    if (lastSaintUpdate === dateKey && sameSaint && sameImage) return;

    setSaintOfTheDay(effectiveSaint || null);
    setSaintOfTheDayImage(image || null);
    setLastSaintUpdate(dateKey);
  }, [simulatedDate, lastSaintUpdate, movableFeastsEnabled, saintOfTheDay, saintOfTheDayImage]);

  return (
    <SettingsContext.Provider
      value={{
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
        importUserData,
        timerEnabled,
        setTimerEnabled,
        timerDuration,
        setTimerDuration,
        timerTime,
        timerActive,
        toggleTimer,
        resetTimer,
        overlayPositions,
        setOverlayPosition,
        notificationsEnabled,
        setNotificationsEnabled,
        dailyReminders,
        addDailyReminder,
        updateDailyReminder,
        removeDailyReminder,
        devTestNotificationEnabled,
        setDevTestNotificationEnabled,
        simulatedDate,
        setSimulatedDate,
        planDeVidaTrackerEnabled,
        setPlanDeVidaTrackerEnabled,
        planDeVidaProgress,
        togglePlanDeVidaItem,
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
        arrowBubbleSize,
        setArrowBubbleSize,
        userHomeBackgrounds,
        allHomeBackgrounds,
        addUserHomeBackground,
        removeUserHomeBackground,
        categories,
        activeThemeColors,
        scrollPositions,
        setScrollPosition,
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
        forceWrappedSeason,
        setForceWrappedSeason,
        showZeroStats,
        setShowZeroStats,
        hasViewedWrapped,
        setHasViewedWrapped,
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
