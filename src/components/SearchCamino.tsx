'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

type CaminoSearchState = {
  term: string;
  activeIndex: number;
  resultsCount: number;
};

type SearchCaminoProps = {
  prayerContent: string;
  searchState: CaminoSearchState;
  setSearchState: (state: CaminoSearchState) => void;
  onClose: () => void;
};

export default function SearchCamino({
  prayerContent,
  searchState,
  setSearchState,
  onClose,
}: SearchCaminoProps) {
  const [localTerm, setLocalTerm] = useState(searchState.term);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useSettings();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const countMatches = useCallback((term: string) => {
    if (!term.trim()) return 0;
    const regex = new RegExp(`^${term}\\.`, 'gm');
    const matches = prayerContent.match(regex);
    return matches ? matches.length : 0;
  }, [prayerContent]);

  const triggerSearch = useCallback(() => {
    const total = countMatches(localTerm);
    setSearchState({
      term: localTerm,
      activeIndex: total > 0 ? 0 : -1,
      resultsCount: total,
    });
  }, [localTerm, countMatches, setSearchState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch();
    }
  };

  const handleNext = () => {
    if (searchState.resultsCount === 0) return;
    setSearchState({
      ...searchState,
      activeIndex: (searchState.activeIndex + 1) % searchState.resultsCount,
    });
  };

  const handlePrev = () => {
    if (searchState.resultsCount === 0) return;
    setSearchState({
      ...searchState,
      activeIndex:
        (searchState.activeIndex - 1 + searchState.resultsCount) %
        searchState.resultsCount,
    });
  };

  const handleClose = () => {
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      setLocalTerm(value);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:max-w-6xl mx-auto bg-background/90 backdrop-blur-sm shadow-t-lg z-30 p-2 border-t border-border/50 animate-in slide-in-from-bottom-full duration-300">
      <div className="container mx-auto px-4 flex items-center gap-2">
        <Search className="size-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          placeholder="Buscar punto (ej: 301)..."
          value={localTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-grow bg-transparent border-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClose}
          title="Cerrar buscador"
        >
          <X className="size-4" />
        </Button>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{searchState.resultsCount > 0 ? searchState.activeIndex + 1 : 0}</span>
          <span>/</span>
          <span>{searchState.resultsCount}</span>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrev}
            disabled={searchState.resultsCount === 0}
          >
            <ChevronUp className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
            disabled={searchState.resultsCount === 0}
          >
            <ChevronDown className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
