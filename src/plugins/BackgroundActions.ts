import { registerPlugin } from '@capacitor/core';

export type PendingMarkPrayedResult = {
  items: Array<{
    id: string;
    dateKey?: string | null;
  }>;
};

export type BackgroundActionsPlugin = {
  getPendingMarkPrayed: () => Promise<PendingMarkPrayedResult>;
};

const BackgroundActions = registerPlugin<BackgroundActionsPlugin>('BackgroundActions', {
  web: () => ({
    getPendingMarkPrayed: async () => ({ items: [] }),
  }),
});

export default BackgroundActions;
