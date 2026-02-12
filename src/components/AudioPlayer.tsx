'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    }

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    // Events
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
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
      
      {title && <div className="text-sm font-medium text-muted-foreground text-center mb-2">{title}</div>}

      <div className="flex flex-col gap-2">
         <Slider
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
             <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-muted-foreground">
                 {isMuted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
             </Button>
             <Slider 
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
                            audioRef.current.play();
                            setIsPlaying(true);
                        }
                    }
                }}
                className="h-8 w-8 text-muted-foreground"
            >
                <RotateCcw className="size-4" />
             </Button>
          </div>
      </div>
    </div>
  );
}
