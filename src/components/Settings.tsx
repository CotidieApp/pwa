'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import ContentSettings from './settings/ContentSettings';
import DeveloperSettings from './settings/DeveloperSettings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as Icon from 'lucide-react';

type SettingsTab = 'visual' | 'alertas' | 'datos' | 'otros';

interface SettingsProps {
  onOpenDeveloperDashboard?: () => void;
  onShowWrapped?: () => void;
}

export default function Settings({ onOpenDeveloperDashboard, onShowWrapped }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('visual');
  const containerRef = useRef<HTMLDivElement>(null);

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'visual', label: 'Visual', icon: Icon.Palette },
    { id: 'alertas', label: 'Alertas', icon: Icon.Bell },
    { id: 'datos', label: 'Datos', icon: Icon.Database },
    { id: 'otros', label: 'Otros', icon: Icon.Settings2 },
  ];

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  // Gesture state with axis-lock to avoid accidental horizontal tab changes while scrolling vertically.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchCurrent = useRef<{ x: number; y: number } | null>(null);
  const lockAxis = useRef<'x' | 'y' | null>(null);
  const AXIS_LOCK_THRESHOLD = 14;
  const SWIPE_THRESHOLD = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.targetTouches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchCurrent.current = { x: t.clientX, y: t.clientY };
    lockAxis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const t = e.targetTouches[0];
    if (!start || !t) return;

    touchCurrent.current = { x: t.clientX, y: t.clientY };
    if (lockAxis.current) return;

    const dx = Math.abs(t.clientX - start.x);
    const dy = Math.abs(t.clientY - start.y);
    if (dx < AXIS_LOCK_THRESHOLD && dy < AXIS_LOCK_THRESHOLD) return;
    lockAxis.current = dx > dy ? 'x' : 'y';
  };

  const onTouchEnd = () => {
    const start = touchStart.current;
    const end = touchCurrent.current;
    if (!start || !end || lockAxis.current !== 'x') {
      touchStart.current = null;
      touchCurrent.current = null;
      lockAxis.current = null;
      return;
    }

    const distance = start.x - end.x;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    if (isLeftSwipe && activeIndex < tabs.length - 1) {
        setActiveTab(tabs[activeIndex + 1].id);
    }

    if (isRightSwipe && activeIndex > 0) {
        setActiveTab(tabs[activeIndex - 1].id);
    }

    touchStart.current = null;
    touchCurrent.current = null;
    lockAxis.current = null;
  };

  // Scroll to top when tab changes
  useEffect(() => {
    const scrollContainer = document.querySelector('[data-app-scroll-container="true"]');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  return (
    <div 
        className="space-y-6 pb-20"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      <div className="flex p-1 bg-secondary/20 rounded-lg overflow-x-auto no-scrollbar gap-1 sticky top-0 z-10 backdrop-blur-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 min-w-[80px] rounded-md transition-all",
                isActive ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="overflow-hidden min-h-[500px]" ref={containerRef}>
        <div 
            className="flex w-full transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
            {tabs.map((tab) => (
                <div key={tab.id} className="w-full shrink-0 px-1">
                    {tab.id === 'visual' && <AppearanceSettings />}
                    {tab.id === 'alertas' && <NotificationSettings />}
                    {tab.id === 'datos' && <ContentSettings onShowWrapped={onShowWrapped} />}
                    {tab.id === 'otros' && <DeveloperSettings onOpenDashboard={onOpenDeveloperDashboard} />}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
