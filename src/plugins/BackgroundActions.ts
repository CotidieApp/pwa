import { registerPlugin } from '@capacitor/core';

export type PendingMarkPrayedResult = {
  ids: string[];
};

export type BackgroundActionsPlugin = {
  getPendingMarkPrayed: () => Promise<PendingMarkPrayedResult>;
};

const BackgroundActions = registerPlugin<BackgroundActionsPlugin>('BackgroundActions', {
  web: () => ({
    getPendingMarkPrayed: async () => ({ ids: [] }),
  }),
});

export default BackgroundActions;
