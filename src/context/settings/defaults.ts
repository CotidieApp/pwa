import type { Quote } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { CustomThemeColors, OverlayPositions, UserStats } from './types';

export const defaultThemeColors: CustomThemeColors = {
  primary: { h: 36, s: 88 },
  background: { h: 216, s: 33 },
  accent: { h: 45, s: 86 },
};

export const defaultHomeBackgroundId: string | null = (() => {
  const homeBackgrounds = PlaceHolderImages.filter((img) => img.id.startsWith('home-'));
  return homeBackgrounds[0]?.id ?? null;
})();

export const defaultAlwaysShowPrayers = ['cartas'];
export const defaultOverlayPositions: OverlayPositions = {
  timer: { x: 12, y: 74 },
  planNav: { x: 12, y: 130 },
  AnnuumBubble: { x: 16, y: 48 },
};

export const defaultUserStats: UserStats = {
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

export const FULL_BACKUP_KEYS = [
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

export const getForcedDailyQuote = (date: Date): Quote | null => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return FORCED_DAILY_QUOTES[`${month}-${day}`] ?? null;
};
