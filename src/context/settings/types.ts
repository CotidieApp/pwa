import type {
  Prayer,
  Quote,
  ImagePlaceholder,
  Category,
  SaintOfTheDay,
} from '@/lib/types';
import type { SmallWidgetDisplayMode } from '@/plugins/BackgroundActions';

export type Theme = 'light' | 'dark';
export type FontSize = number;
export type ArrowBubbleSize = 'sm' | 'md' | 'lg';
export type NavMode = 'bubble' | 'touch';
export type SmallWidgetMode = SmallWidgetDisplayMode;
export type PrayerLanguageMode = 'espanol' | 'latin' | 'ambos';
export type PrayerLanguageProfiles = Record<PrayerLanguageMode, Record<string, string>>;
export type OverlayPosition = { x: number; y: number };
export type OverlayPositions = { timer: OverlayPosition; planNav: OverlayPosition; AnnuumBubble: OverlayPosition };
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

export type StatIncrementOptions = {
  eventDate?: Date;
};

export type ThemeColor = { h: number; s: number };
export type CustomThemeColors = {
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

export type PredefinedPrayerOverrideData = {
  title: string;
  content?: string;
  imageUrl?: string;
};

export type ImportResult = {
  status: 'applied' | 'duplicate' | 'invalid';
  kind: 'custom-plan' | 'full' | 'partial';
  title: string;
  description?: string;
  destructive?: boolean;
};

export type Settings = {
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
