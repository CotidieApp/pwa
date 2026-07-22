import { registerPlugin } from '@capacitor/core';

export type PendingMarkPrayedResult = {
  items: Array<{
    id: string;
    dateKey?: string | null;
  }>;
};

export type SmallWidgetDisplayMode = 'full' | 'saint_priority';

export type BackgroundActionsPlugin = {
  getPendingMarkPrayed: () => Promise<PendingMarkPrayedResult>;
  setSmallWidgetMode: (options: { mode: SmallWidgetDisplayMode }) => Promise<{ mode: SmallWidgetDisplayMode }>;
  setMovableFeastsEnabled: (options: { enabled: boolean }) => Promise<void>;
  refreshSaintWidgets: (options: {
    name: string;
    bio: string;
    prayerId?: string;
    imageId?: string;
    imageUrl?: string;
    backgroundColor?: string;
  }) => Promise<void>;
  setSystemBarAppearance: (options: {
    darkStatusIcons: boolean;
    darkNavigationIcons: boolean;
  }) => Promise<void>;
};

const BackgroundActions = registerPlugin<BackgroundActionsPlugin>('BackgroundActions', {
  web: () => ({
    getPendingMarkPrayed: async () => ({ items: [] }),
    setSmallWidgetMode: async (options: { mode: SmallWidgetDisplayMode }) => ({ mode: options.mode }),
    setMovableFeastsEnabled: async () => {},
    refreshSaintWidgets: async () => {},
    setSystemBarAppearance: async () => {},
  }),
});

export default BackgroundActions;
