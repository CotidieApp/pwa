import type { Prayer } from '@/lib/types';
import {
  defaultThemeColors,
  defaultOverlayPositions,
  defaultUserStats,
  defaultAlwaysShowPrayers,
  defaultHomeBackgroundId,
  FULL_BACKUP_KEYS,
} from './defaults';
import type {
  CustomPlan,
  PredefinedPrayerOverrideData,
  ThemeColor,
  OverlayPosition,
  OverlayPositions,
  DailyReminder,
  DevTraceLevel,
  DevTraceEvent,
  UserStats,
  PrayerLanguageMode,
  PrayerLanguageProfiles,
  Theme,
  NavMode,
  ArrowBubbleSize,
  SmallWidgetMode,
  CustomThemeColors,
} from './types';

export const isCustomPlanPayload = (data: any): data is Partial<CustomPlan> & { name: string; prayerIds: string[] } => {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    Array.isArray(data.prayerIds) &&
    data.prayerIds.length > 0
  );
};

export const isFullAppStatePayload = (data: any): boolean => {
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

export const applyPredefinedPrayerState = (
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

export const isFiniteNumber = (value: any): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const hasOwnKey = (value: Record<string, any>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const normalizeNullableString = (value: any): string | null =>
  typeof value === 'string' ? value : null;

export const normalizeBoolean = (value: any, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeNumber = (value: any, fallback = 0) =>
  isFiniteNumber(value) ? value : fallback;

export const normalizeSmallWidgetMode = (value: any): SmallWidgetMode =>
  value === 'saint_priority' ? 'saint_priority' : 'full';

export const normalizeStringArray = (raw: any, requiredValues: string[] = []): string[] => {
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

export const normalizeNumberRecord = (raw: any): Record<string, number> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, number> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (isFiniteNumber(value)) {
      result[key] = value;
    }
  });
  return result;
};

export const normalizeStringRecord = (raw: any): Record<string, string> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, string> = {};
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }
  });
  return result;
};

export const normalizePrayerLanguageMode = (value: any): PrayerLanguageMode =>
  value === 'latin' || value === 'ambos' ? value : 'espanol';

export const emptyPrayerLanguageProfiles = (): PrayerLanguageProfiles => ({
  espanol: {},
  latin: {},
  ambos: {},
});

export const normalizePrayerLanguageProfiles = (
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

export const normalizePredefinedPrayerOverrides = (raw: any): Record<string, PredefinedPrayerOverrideData> => {
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

export const normalizeThemeColor = (raw: any, fallback: ThemeColor): ThemeColor => ({
  h: normalizeNumber(raw?.h, fallback.h),
  s: normalizeNumber(raw?.s, fallback.s),
});

export const normalizeThemeColorsValue = (raw: any): CustomThemeColors => ({
  primary: normalizeThemeColor(raw?.primary, defaultThemeColors.primary),
  background: normalizeThemeColor(raw?.background, defaultThemeColors.background),
  accent: normalizeThemeColor(raw?.accent, defaultThemeColors.accent),
});

export const normalizeOverlayPositionValue = (raw: any, fallback: OverlayPosition): OverlayPosition => ({
  x: Math.max(0, Math.round(normalizeNumber(raw?.x, fallback.x))),
  y: Math.max(0, Math.round(normalizeNumber(raw?.y, fallback.y))),
});

export const normalizeOverlayPositionsValue = (raw: any): OverlayPositions => ({
  timer: normalizeOverlayPositionValue(raw?.timer, defaultOverlayPositions.timer),
  planNav: normalizeOverlayPositionValue(raw?.planNav, defaultOverlayPositions.planNav),
  AnnuumBubble: normalizeOverlayPositionValue(raw?.AnnuumBubble, defaultOverlayPositions.AnnuumBubble),
});

export const normalizeDailyRemindersValue = (raw: any): DailyReminder[] => {
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

export const normalizePlanDeVidaCalendarValue = (raw: any): Record<string, string[]> => {
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

export const normalizeDevTraceEventsValue = (raw: any): DevTraceEvent[] => {
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

export const normalizeUserStatsValue = (raw: any): UserStats => {
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

export const isGenericCustomPlanName = (value: string) =>
  /^Plan(?: personalizado)?(?: \d+)?$/i.test(value.trim());

export const normalizeCustomPlanDisplayName = (value: any): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 && !isGenericCustomPlanName(trimmed) ? trimmed : '';
};

export const normalizeCustomPlanComparable = (value: any) => ({
  name: normalizeCustomPlanDisplayName(value?.name),
  prayerIds: Array.isArray(value?.prayerIds)
    ? value.prayerIds.filter((item: unknown): item is string => typeof item === 'string')
    : [],
});

export const normalizeCustomPlansValue = (raw: any): Array<CustomPlan | null> => {
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

export const stableSortValue = (value: any): any => {
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

export const stableSerialize = (value: any) => JSON.stringify(stableSortValue(value));

export const normalizeBackupState = (raw: any) => {
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

export const normalizePartialImportPayload = (raw: any) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const normalized = normalizeBackupState(source);
  return FULL_BACKUP_KEYS.reduce((acc, key) => {
    if (hasOwnKey(source, key)) {
      acc[key] = normalized[key];
    }
    return acc;
  }, {} as Record<string, any>);
};

export const pickSnapshotKeys = (snapshot: Record<string, any>, keys: string[]) => {
  return keys.reduce((acc, key) => {
    if (hasOwnKey(snapshot, key)) {
      acc[key] = snapshot[key];
    }
    return acc;
  }, {} as Record<string, any>);
};
