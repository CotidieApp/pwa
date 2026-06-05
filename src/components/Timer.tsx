
'use client';

import React, { useEffect, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pause, Pencil, Play, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Timer() {
  const {
    timerEnabled,
    timerActive,
    timerTime,
    timerDuration,
    setTimerEnabled,
    setTimerDuration,
    toggleTimer,
    resetTimer,
  } = useSettings();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(`${timerDuration}`);

  if (!timerEnabled) {
    return null;
  }

  useEffect(() => {
    if (!isEditOpen) return;
    setDraftMinutes(`${timerDuration}`);
  }, [isEditOpen, timerDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveDuration = () => {
    const parsed = Number.parseInt(draftMinutes, 10);
    const nextDuration = Number.isFinite(parsed) ? Math.max(1, parsed) : timerDuration;
    setTimerDuration(nextDuration);
    setIsEditOpen(false);
    toast({ title: 'Duración del temporizador guardada.' });
  };

  return (
    <div className="flex items-center gap-1 text-primary-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
        onClick={toggleTimer}
        title={timerActive ? 'Pausar' : 'Iniciar'}
      >
        {timerActive ? <Pause className="size-5" /> : <Play className="size-5" />}
      </Button>
      <span
        className={cn(
          'font-mono tabular-nums tracking-widest text-sm sm:text-base',
          timerTime === 0 && 'animate-pulse'
        )}
      >
        {formatTime(timerTime)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
        onClick={() => setIsEditOpen(true)}
        title="Editar duración"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
        onClick={resetTimer}
        title="Reiniciar"
      >
        <RotateCcw className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
        onClick={() => {
          setIsEditOpen(false);
          resetTimer();
          setTimerEnabled(false);
        }}
        title="Cerrar temporizador"
      >
        <X className="size-4" />
      </Button>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duración del temporizador</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="timer-duration-inline">Minutos</Label>
            <Input
              id="timer-duration-inline"
              type="number"
              inputMode="numeric"
              min={1}
              value={draftMinutes}
              onChange={(e) => setDraftMinutes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveDuration();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDuration}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    
