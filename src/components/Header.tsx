'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Expand, Minimize, Search, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import Timer from '@/components/Timer';

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('button, input, textarea, select, a, [role="button"], [data-no-drag="true"]')
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  floatBackButton?: boolean;
  onBack: () => void;
  showPrevNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  showResetButton?: boolean;
  onReset?: () => void;
  showDistractionFreeButton?: boolean;
  isDistractionFree?: boolean;
  onToggleDistractionFree?: () => void;
  showSearchButton?: boolean;
  onToggleSearch?: () => void;
  showEditButton?: boolean;
  onEdit?: () => void;
  editDisabled?: boolean;
};

const DragHandle = () => {
  return (
    <div className="flex items-center px-1.5 select-none">
      <div className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-primary-foreground/60"
          />
        ))}
      </div>
    </div>
  );
};

export default function Header({ 
  title, 
  showBackButton, 
  floatBackButton = false,
  onBack,
  showPrevNext = false,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  showResetButton = false,
  onReset,
  showDistractionFreeButton = false,
  isDistractionFree = false,
  onToggleDistractionFree,
  showSearchButton = false,
  onToggleSearch,
  showEditButton = false,
  onEdit,
  editDisabled = false,
}: HeaderProps) {

  const { isDistractionFree: isGlobalDistractionFree, timerEnabled, overlayPositions, setOverlayPosition } =
    useSettings();

  const shouldFloatTimer = timerEnabled;
  const shouldFloatNavControls = showPrevNext || floatBackButton;

  const useDraggableOverlay = (
    initialPosition: { x: number; y: number },
    onCommit?: (pos: { x: number; y: number }) => void
  ) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ x: number; y: number }>(initialPosition);
    const posRef = useRef(pos);
    const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
      posRef.current = pos;
    }, [pos]);

    useEffect(() => {
      if (isDragging) return;
      if (pos.x === initialPosition.x && pos.y === initialPosition.y) return;
      setPos(initialPosition);
    }, [initialPosition.x, initialPosition.y, isDragging, pos.x, pos.y]);

    const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
      if (isInteractiveTarget(e.target)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        pointerId: e.pointerId,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      setIsDragging(true);
    }, []);

    useEffect(() => {
      if (!isDragging) return;

      const handleMove = (e: PointerEvent) => {
        const drag = dragRef.current;
        const el = ref.current;
        if (!drag || !el) return;
        const rect = el.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);
        const nextX = clamp(e.clientX - drag.offsetX, 0, maxX);
        const nextY = clamp(e.clientY - drag.offsetY, 0, maxY);
        setPos({ x: nextX, y: nextY });
      };

      const handleUp = (e: PointerEvent) => {
        const drag = dragRef.current;
        const el = ref.current;
        if (!drag) return;
        if (el) {
          try {
            if (el.hasPointerCapture(drag.pointerId)) el.releasePointerCapture(drag.pointerId);
          } catch {}
        }
        dragRef.current = null;
        setIsDragging(false);
        onCommit?.(posRef.current);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
      };
    }, [isDragging]);

    return { ref, pos, onPointerDown };
  };

  const timerOverlay = useDraggableOverlay(overlayPositions.timer, (pos) =>
    setOverlayPosition('timer', pos)
  );
  const planNavOverlay = useDraggableOverlay(overlayPositions.planNav, (pos) =>
    setOverlayPosition('planNav', pos)
  );

  // Si está en modo sin distracciones, solo mostrar botón para salir
  if (isGlobalDistractionFree) {
    return (
      <div className="fixed top-2 right-2 z-30 mt-[env(safe-area-inset-top)]">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground bg-black/30 hover:bg-black/50"
          onClick={onToggleDistractionFree}
          title="Salir del modo sin distracciones"
        >
          <Minimize />
        </Button>
      </div>
    );
  }

  return (
    <>
      {shouldFloatTimer && (
        <div
          ref={timerOverlay.ref}
          className="fixed z-40 rounded-xl bg-primary text-primary-foreground shadow-lg border border-primary-foreground/10 p-1 pl-2 flex items-center gap-2 touch-none"
          style={{ left: timerOverlay.pos.x, top: timerOverlay.pos.y }}
          onPointerDown={timerOverlay.onPointerDown}
        >
          <DragHandle />
          <Timer />
        </div>
      )}

      {shouldFloatNavControls && (
        <div
          ref={planNavOverlay.ref}
          className="fixed z-40 rounded-xl bg-primary text-primary-foreground shadow-lg border border-primary-foreground/10 p-1 pl-2 flex items-center gap-1 touch-none"
          style={{ left: planNavOverlay.pos.x, top: planNavOverlay.pos.y }}
          onPointerDown={planNavOverlay.onPointerDown}
        >
          <DragHandle />
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={onBack}
              title="Salir"
            >
              <ArrowLeft />
            </Button>
          )}
          {showPrevNext && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={onPrev}
                disabled={prevDisabled}
                title="Anterior"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={onNext}
                disabled={nextDisabled}
                title="Siguiente"
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-30 flex items-center min-h-[calc(4rem+env(safe-area-inset-top))] shrink-0 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]",
          "bg-primary text-primary-foreground shadow-md border-b border-primary-foreground/10"
        )}
      >
        <div className="w-full max-w-6xl mx-auto px-4 relative flex items-center justify-between">
        <h1
          className={cn(
            "absolute inset-x-0 text-center pointer-events-none",
            "font-headline font-semibold tracking-tight",
            "text-lg sm:text-xl",
            "px-20 leading-tight whitespace-normal break-words"
          )}
        >
          {title}
        </h1>

        <div className="flex items-center gap-2 min-w-0 max-w-[45%] z-10">
          <div className="w-10 flex justify-start shrink-0">
            {showBackButton && !shouldFloatNavControls && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground -ml-2 hover:bg-transparent hover:text-primary-foreground active:bg-primary-foreground/15"
                onClick={onBack}
                title="Volver"
              >
                <ArrowLeft />
              </Button>
            )}
          </div>
        </div>

        <div className="w-auto flex items-center justify-end gap-1 z-10">
          {showSearchButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
              onClick={onToggleSearch}
              title="Buscar en este texto"
            >
              <Search />
            </Button>
          )}

          {showEditButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
              onClick={onEdit}
              disabled={editDisabled}
              title="Editar"
            >
              <Pencil />
            </Button>
          )}

          {showDistractionFreeButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
              onClick={onToggleDistractionFree}
              title={
                isDistractionFree
                  ? "Salir del modo sin distracciones"
                  : "Entrar en modo sin distracciones"
              }
            >
              {isDistractionFree ? <Minimize /> : <Expand />}
            </Button>
          )}

          {showResetButton && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
              onClick={onReset}
              title="Reiniciar progreso"
            >
              <RotateCcw className="size-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
