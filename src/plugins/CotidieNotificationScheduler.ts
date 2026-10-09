import { registerPlugin } from '@capacitor/core';

export type CotidieScheduledEvent = {
  id: number;
  at: number;
  title: string;
  body: string;
  channelId: string;
  smallIcon: string;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
  sourceId?: string;
};

export type CotidieDailyRule = Omit<CotidieScheduledEvent, 'id' | 'at'> & {
  sourceId: string;
  /** Omitirlo significa que la regla se repite cada hora en `minute`. */
  hour?: number;
  minute: number;
  skipDateKeys?: string[];
};

export type NotificationScheduleStatus = { status: 'scheduled' | 'empty' | 'blocked'; reason: string; nextAlarmAt: number | null };
type CotidieNotificationSchedulerPlugin = {
  replaceSchedule(options: { events: CotidieScheduledEvent[]; dailyRules: CotidieDailyRule[]; activeEventSources: string[] }): Promise<NotificationScheduleStatus>;
  getScheduleStatus(): Promise<NotificationScheduleStatus>;
  resumeSchedule(): Promise<NotificationScheduleStatus>;
  clearSchedule(): Promise<void>;
};

const CotidieNotificationScheduler = registerPlugin<CotidieNotificationSchedulerPlugin>(
  'CotidieNotificationScheduler',
  { web: () => import('./CotidieNotificationSchedulerWeb').then((m) => new m.CotidieNotificationSchedulerWeb()) },
);

export default CotidieNotificationScheduler;
