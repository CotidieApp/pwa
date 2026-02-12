"use client";

import { SettingsProvider } from './SettingsContext';
import ThemeManager from '@/components/ThemeManager';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeManager>
        {children}
      </ThemeManager>
    </SettingsProvider>
  );
}
