'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ImmersiveIndexItem = {
  id: string;
  label: string;
  depth?: number;
  active: boolean;
  onSelect: () => void;
};

export type ImmersiveIndexSection = {
  title: string;
  items: ImmersiveIndexItem[];
};

type ImmersivePrayerIndexOverlayProps = {
  open: boolean;
  title: string;
  description: string;
  sections: ImmersiveIndexSection[];
  onClose: () => void;
  maxWidthClassName?: string;
};

export default function ImmersivePrayerIndexOverlay({
  open,
  title,
  description,
  sections,
  onClose,
  maxWidthClassName = 'max-w-lg',
}: ImmersivePrayerIndexOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-no-touch-nav
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          className={cn(
            'absolute left-4 right-4 top-16 z-50 mx-auto flex max-h-[min(70vh,540px)] flex-col overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-2xl backdrop-blur',
            maxWidthClassName
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-6">
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                          item.depth === 1 && 'pl-6',
                          item.active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/40 hover:bg-muted'
                        )}
                        onClick={item.onSelect}
                      >
                        <span className="pr-3">{item.label}</span>
                        {item.active && <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Actual</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
