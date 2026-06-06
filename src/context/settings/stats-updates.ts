import type { Prayer } from '@/lib/types';
import type { UserStats } from '@/context/SettingsContext';

type PrayerLookup = (id: string, list: Prayer[]) => Prayer | null;
type RootLookup = (id: string) => string | null;
type DateKeyBuilder = (date: Date) => string;
type PastoralDateBuilder = (date: Date) => Date;
type AngelusKeyCheck = (value?: string) => boolean;
type AngelusKeyList = (value?: string) => string[];

export const applyPlanDeVidaAggregateIncrement = (prev: UserStats, id: string): UserStats => ({
  ...prev,
  totalPrayersOpened: (prev.totalPrayersOpened || 0) + 1,
  planDeVidaCompletedTotal: (prev.planDeVidaCompletedTotal || 0) + 1,
  planDeVidaCompletedHistory: {
    ...(prev.planDeVidaCompletedHistory || {}),
    [id]: ((prev.planDeVidaCompletedHistory || {})[id] || 0) + 1,
  },
});

export const applyPrayerOpenIncrement = ({
  prev,
  subKey,
  eventDate,
  allPrayers,
  getPrayerById,
  getRootPlanDeVidaId,
  getPastoralDayKey,
  getPastoralDayDate,
  getLocalDateKey,
  isAngelusStatKey,
  getAngelusStatKeys,
  updateTimestamp,
}: {
  prev: UserStats;
  subKey: string;
  eventDate: Date;
  allPrayers: Prayer[];
  getPrayerById: PrayerLookup;
  getRootPlanDeVidaId: RootLookup;
  getPastoralDayKey: DateKeyBuilder;
  getPastoralDayDate: PastoralDateBuilder;
  getLocalDateKey: DateKeyBuilder;
  isAngelusStatKey: AngelusKeyCheck;
  getAngelusStatKeys: AngelusKeyList;
  updateTimestamp: boolean;
}): UserStats => {
  const history = { ...prev.prayersOpenedHistory };
  const statKeys = getAngelusStatKeys(subKey);
  for (const statKey of statKeys) {
    history[statKey] = (history[statKey] || 0) + 1;
  }

  const hour = eventDate.getHours();
  const isNight = hour >= 20 || hour < 4;
  const isMorning = hour >= 4 && hour < 12;

  const isRosary = subKey === 'rosario' || subKey === 'santo-rosario';
  const isAngelus = isAngelusStatKey(subKey);
  const isExamination = subKey === 'examen-conciencia' || subKey === 'examen-noche';

  const todayKey = getPastoralDayKey(eventDate);
  const lastOpened = prev.prayerLastOpened?.[subKey];

  const newPrayerLastOpened = { ...(prev.prayerLastOpened || {}) };
  const newPrayerDaysCount = { ...(prev.prayerDaysCount || {}) };

  if (lastOpened !== todayKey) {
    for (const statKey of statKeys) {
      newPrayerLastOpened[statKey] = todayKey;
      newPrayerDaysCount[statKey] = (newPrayerDaysCount[statKey] || 0) + 1;
    }
  }

  let newMassStreak = prev.massStreak || 0;
  let newMassDaysCount = prev.massDaysCount || 0;
  let newLastMassDate = prev.lastMassDate;

  const prayer = getPrayerById(subKey, allPrayers);
  const isMassPrayer = subKey === 'santa-misa';

  if (isMassPrayer && newLastMassDate !== todayKey) {
    const yesterday = getPastoralDayDate(eventDate);
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

  let newMorningDaysCount = prev.morningDaysCount || 0;
  let newLastMorningDate = prev.lastMorningPrayerDate;
  if (isMorning && newLastMorningDate !== todayKey) {
    newLastMorningDate = todayKey;
    newMorningDaysCount += 1;
  }

  let newNightDaysCount = prev.nightDaysCount || 0;
  let newLastNightDate = prev.lastNightPrayerDate;
  if (isNight && newLastNightDate !== todayKey) {
    newLastNightDate = todayKey;
    newNightDaysCount += 1;
  }

  const next: UserStats = {
    ...prev,
    prayersOpenedHistory: history,
    massStreak: newMassStreak,
    massDaysCount: newMassDaysCount,
    morningDaysCount: newMorningDaysCount,
    nightDaysCount: newNightDaysCount,
    lastMassDate: newLastMassDate,
    lastMorningPrayerDate: newLastMorningDate,
    lastNightPrayerDate: newLastNightDate,
    rosaryCount: isRosary ? (prev.rosaryCount || 0) + 1 : (prev.rosaryCount || 0),
    angelusCount: isAngelus ? (prev.angelusCount || 0) + 1 : (prev.angelusCount || 0),
    examinationCount: isExamination ? (prev.examinationCount || 0) + 1 : (prev.examinationCount || 0),
    prayerLastOpened: newPrayerLastOpened,
    prayerDaysCount: newPrayerDaysCount,
  };

  if (!updateTimestamp) return next;

  const timestamps = { ...(prev.prayerLastIncrementTimestamp || {}) };
  const nowTs = Date.now();
  for (const statKey of statKeys) {
    timestamps[statKey] = nowTs;
  }

  return {
    ...next,
    prayerLastIncrementTimestamp: timestamps,
  };
};
