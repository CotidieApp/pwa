'use client';

import React from 'react';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import ContentSettings from './settings/ContentSettings';
import DeveloperSettings from './settings/DeveloperSettings';
import { Card, CardTitle } from '@/components/ui/card';
import * as Icon from 'lucide-react';

export type SettingsSection = 'contenido' | 'notificaciones' | 'apariencia' | 'informacion';

interface SettingsProps {
  onOpenDeveloperDashboard?: () => void;
  showAnnuumEntry?: boolean;
  onShowAnnuum?: () => void;
  activeSection: SettingsSection | null;
  onSectionChange: (section: SettingsSection | null) => void;
}

const sections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'contenido', label: 'Contenido', icon: Icon.BookOpen },
  { id: 'notificaciones', label: 'Notificaciones', icon: Icon.Bell },
  { id: 'apariencia', label: 'Apariencia', icon: Icon.Palette },
  { id: 'informacion', label: 'Información', icon: Icon.Info },
];
export const getSettingsSectionLabel = (section: SettingsSection) =>
  sections.find((entry) => entry.id === section)?.label ?? 'Ajustes';

export default function Settings({
  onOpenDeveloperDashboard,
  onShowAnnuum,
  showAnnuumEntry,
  activeSection,
  onSectionChange,
}: SettingsProps) {
  const active = sections.find((section) => section.id === activeSection);

  if (activeSection && active) {
    return (
      <div className="space-y-4 px-4 pb-20">
        {activeSection === 'contenido' && <ContentSettings />}
        {activeSection === 'notificaciones' && <NotificationSettings />}
        {activeSection === 'apariencia' && <AppearanceSettings />}
        {activeSection === 'informacion' && <DeveloperSettings onOpenDashboard={onOpenDeveloperDashboard} />}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-20">
      {sections.map((section) => (
        <Card
          key={section.id}
          className="bg-card/80 p-4 shadow-md backdrop-blur-sm border-border/50 cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={() => onSectionChange(section.id)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <section.icon className="size-5 shrink-0 text-primary" />
              <CardTitle className="font-headline text-base font-normal truncate">
                {section.label}
              </CardTitle>
            </div>
            <Icon.ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </Card>
      ))}
      {showAnnuumEntry ? (
        <Card
          className="motion-safe:animate-pulse border-amber-400/70 bg-amber-400/15 p-4 shadow-md backdrop-blur-sm cursor-pointer hover:bg-amber-400/25 transition-colors"
          onClick={onShowAnnuum}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Icon.Sparkles className="size-5 shrink-0 text-amber-600 dark:text-amber-300" />
              <CardTitle className="font-headline text-base font-normal text-amber-950 dark:text-amber-100">
                Cotidie Annuum
              </CardTitle>
            </div>
            <Icon.ChevronRight className="size-4 shrink-0 text-amber-700 dark:text-amber-200" />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
