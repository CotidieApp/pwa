'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useSettings } from '@/context/SettingsContext';
import Timer from '@/components/Timer';

const isInteractive = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('button, input, textarea, select, a, [role="button"]'));

export default function GlobalTimerOverlay() {
  const { timerEnabled, overlayPositions, setOverlayPosition } = useSettings();
  const [position, setPosition] = useState(overlayPositions.timer);
  const positionRef = useRef(position);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drag.current) {
      positionRef.current = overlayPositions.timer;
      setPosition(overlayPositions.timer);
    }
  }, [overlayPositions.timer]);

  if (!timerEnabled) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (isInteractive(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId || !element.current) return;
    const rect = element.current.getBoundingClientRect();
    const next = {
      x: Math.min(Math.max(0, event.clientX - drag.current.offsetX), Math.max(0, window.innerWidth - rect.width)),
      y: Math.min(Math.max(0, event.clientY - drag.current.offsetY), Math.max(0, window.innerHeight - rect.height)),
    };
    positionRef.current = next;
    setPosition(next);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setOverlayPosition('timer', positionRef.current);
  };

  return (
    <div
      ref={element}
      className="fixed z-[200] flex touch-none items-center gap-2 rounded-xl border border-primary-foreground/10 bg-primary p-1 pl-2 text-primary-foreground shadow-lg"
      style={{ left: position.x, top: position.y }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div className="grid grid-cols-2 gap-0.5 px-1.5" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1 w-1 rounded-full bg-primary-foreground/60" />)}
      </div>
      <Timer />
    </div>
  );
}
