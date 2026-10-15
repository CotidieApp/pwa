'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  initialTime?: number;
  progressKey?: string;
  onProgressChange?: (key: string, currentTime: number, duration: number) => void;
  onCheckpoint?: () => void;
}

export function AudioPlayer({ src, title, initialTime = 0, progressKey, onProgressChange, onCheckpoint }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const restoredForSrcRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef(onProgressChange);
  const initialTimeRef = useRef(initialTime);
  const checkpointRef = useRef(onCheckpoint);
  useEffect(() => { progressRef.current = onProgressChange; initialTimeRef.current = initialTime; checkpointRef.current = onCheckpoint; }, [onProgressChange, initialTime, onCheckpoint]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      const initialTime = initialTimeRef.current;
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      let nextTime = audio.currentTime;
      if (restoredForSrcRef.current !== src) {
        const canRestore =
          Number.isFinite(initialTime) &&
          initialTime > 10 &&
          nextDuration > 0 &&
          nextDuration - initialTime > 10;
        if (canRestore) {
          audio.currentTime = initialTime;
          nextTime = initialTime;
        }
        restoredForSrcRef.current = src;
      }
      setDuration(nextDuration);
      setCurrentTime(nextTime);
      if (progressKey) progressRef.current?.(progressKey, nextTime, nextDuration);
    }

    const setAudioTime = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setCurrentTime(audio.currentTime);
      if (progressKey) progressRef.current?.(progressKey, audio.currentTime, nextDuration);
    };
    const handleEnded = () => { setIsPlaying(false); setAudioTime(); checkpointRef.current?.(); };
    const handlePlay = () => { setIsPlaying(true); setError(null); };
    const handlePause = () => { setIsPlaying(false); setAudioTime(); checkpointRef.current?.(); };
    const handleError = () => { setIsPlaying(false); setError('No se pudo reproducir este audio. Comprueba el archivo e intenta nuevamente.'); };

    restoredForSrcRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new media source requires resetting the UI before subscribing to that audio element's events.
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setError(null);
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    if (audio.readyState >= 1) setAudioData();

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    }
  }, [progressKey, src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
    } else {
      void audio.play().catch(() => { setIsPlaying(false); setError('No se pudo iniciar el audio. Pulsa reproducir para reintentar.'); });
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolume = (value: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      const newVol = value[0];
      audio.volume = newVol;
      setVolume(newVol);
      setIsMuted(newVol === 0);
  };
  
  const toggleMute = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isMuted) {
          audio.volume = volume || 1;
          setVolume(volume || 1);
          setIsMuted(false);
      } else {
          audio.volume = 0;
          setIsMuted(true);
      }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4 mb-6">
      <audio ref={audioRef} src={src} preload="metadata" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      
      {title && <div className="text-sm font-medium text-muted-foreground text-center mb-2">{title}</div>}

      <div className="flex flex-col gap-2">
         <Slider
            aria-label="Posición del audio"
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer"
         />
         <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
         </div>
      </div>

      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 w-1/3">
             <Button aria-label={isMuted ? 'Activar sonido' : 'Silenciar'} variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-muted-foreground">
                 {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
             </Button>
             <Slider 
                aria-label="Volumen"
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolume}
                className="w-20"
             />
          </div>

          <div className="flex items-center justify-center gap-4 w-1/3">
            <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
            >
                {isPlaying ? <Pause className="fill-primary text-primary size-5" /> : <Play className="fill-primary text-primary size-5 ml-1" />}
            </Button>
          </div>

          <div className="w-1/3 flex justify-end">
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        if (!isPlaying) {
                            void audioRef.current.play().catch(() => { setIsPlaying(false); setError('No se pudo iniciar el audio.'); });
                        }
                    }
                }}
                className="h-8 w-8 text-muted-foreground"
                aria-label="Reiniciar audio"
            >
                <RotateCcw className="size-4" />
             </Button>
          </div>
      </div>
    </div>
  );
}

