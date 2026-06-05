import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.benjamin.studio',
  appName: 'Cotidie',
  webDir: 'out',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_cotidie',
    },
  },
};

export default config;
