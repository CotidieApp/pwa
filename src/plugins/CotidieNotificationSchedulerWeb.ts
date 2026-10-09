import { WebPlugin } from '@capacitor/core';
import type { NotificationScheduleStatus } from './CotidieNotificationScheduler';

export class CotidieNotificationSchedulerWeb extends WebPlugin {
  async replaceSchedule(): Promise<NotificationScheduleStatus> { return this.getScheduleStatus(); }
  async getScheduleStatus(): Promise<NotificationScheduleStatus> { return { status: 'empty', reason: 'web', nextAlarmAt: null }; }
  async resumeSchedule(): Promise<NotificationScheduleStatus> { return this.getScheduleStatus(); }
  async clearSchedule(): Promise<void> {}
}
