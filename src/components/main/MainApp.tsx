'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Prayer, Category } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';

import Header from '@/components/Header';
import CartasIntro from '@/components/main/CartasIntro';
import PrayerList from '@/components/PrayerList';
import PrayerDetail from '@/components/PrayerDetail';
import Settings from '@/components/Settings';
import AddPrayerForm from '@/components/AddPrayerForm';
import { Button } from '@/components/ui/button';
import PrayerAccordion from '@/components/PrayerAccordion';
import HomePage from '../home/HomePage';
import CustomPlanView from '../plans/CustomPlanView';
import RosaryImmersive from '../RosaryImmersive';
import RosaryMeditated from '../RosaryMeditated';
import PlanDeVidaCalendar from '../plans/PlanDeVidaCalendar';
import ViaCrucisImmersive from '../ViaCrucisImmersive';
import EpubReader from '@/components/EpubReader';
import PersonalEpubLibrary from '@/components/PersonalEpubLibrary';
import SearchCamino from '@/components/SearchCamino';
import { AudioPlayer } from '@/components/AudioPlayer';
import { letanias as letaniasRosarioBase } from '@/lib/prayers/plan-de-vida/santo-rosario/letanias';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { AnimatePresence } from 'framer-motion';
import { isAnnuumSeason } from '@/lib/movable-feasts';
import AnnuumStory from '../AnnuumStory';
import Image from 'next/image';
import { Play } from 'lucide-react';
import * as Icon from 'lucide-react';
import DeveloperDashboard from '@/components/developer/DeveloperDashboard';
import { useToast } from '@/hooks/use-toast';
import { useNavPersistence } from '@/components/main/useNavPersistence';
import { initialState, loadPersistedNavState, persistNavState } from '@/components/main/navigation';
import type { NavigationState } from '@/components/main/navigation';
import { findPrayerIdByTitle, getPrayerPathIds, normalizeRouteSegment, resolvePlanPrayerId } from '@/components/main/prayer-navigation';
import { useAndroidBackButton, useNotificationActionBinding, useSharedImportBinding } from '@/components/main/useNativeAppBindings';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AddFormMode = 'devotion' | 'entry' | 'letter' | 'predefined';
const getInitialNavState = (): NavigationState => {
  return loadPersistedNavState();
};

const PENDING_IMPORT_STORAGE_KEY = 'cotidie_pending_import';
const PENDING_NAVIGATION_STORAGE_KEY = 'cotidie_pending_navigation';
const CUSTOM_PLAN_EXIT_CONFIRM_MS = 3000;
const DEFAULT_CAMINO_SEARCH_STATE = {
  term: '',
  activeIndex: -1,
  resultsCount: 0,
};


export default function MainApp() {
  const isInteractiveElement = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    return Boolean(
      el.closest(
        'button, a, input, textarea, select, [role="button"], [data-no-touch-nav]'
      )
    );
  };
  const [navState, setNavState] = useState<NavigationState>(() => getInitialNavState());
  const navStateRef = useRef(navState);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showAnnuum, setShowAnnuum] = useState(false);
  const [showLettersInfo, setShowLettersInfo] = useState(false);
  const [showErrorReport, setShowErrorReport] = useState(false);
  const [activeSpiritualReadingAudio, setActiveSpiritualReadingAudio] = useState<string | null>(null);
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const shakeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast, dismiss } = useToast();
  const dismissToastRef = useRef(dismiss);
  const [searchState, setSearchState] = useState(DEFAULT_CAMINO_SEARCH_STATE);
  const {
    allPrayers,
    userDevotions,
    addUserDevotion,
    removeUserDevotion,
    userPrayers,
    addUserPrayer,
    removeUserPrayer,
    updateUserPrayer,
    setPredefinedPrayerOverride,
    isDeveloperMode,
    removePredefinedPrayer,
    isDistractionFree,
    toggleDistractionFree,
    showTimerFinishedAlert,
    setShowTimerFinishedAlert,
    categories,
    togglePlanDeVidaItem,
    userLetters,
    addUserLetter,
    removeUserLetter,
    customPlans,
    createCustomPlan,
    incrementStat,
    simulatedDate,
    forceAnnuumSeason,
    overlayPositions,
    setOverlayPosition,
    hasViewedAnnuum,
    setHasViewedAnnuum,
    pushDevLiveTrace,
    navMode,
    cartasReminderEnabled,
    setCartasReminderEnabled,
    shakeToOpenEnabled,
  } = useSettings();
  const customPlanTouchNavEnabled = navMode === 'touch';
  const customPlanExitAdvanceRef = useRef<{
    slot: 1 | 2 | 3 | 4;
    index: number;
    expiresAt: number;
  } | null>(null);
  const lastProcessedPendingNavigationRef = useRef<string | null>(null);
  const customPlanExitToastIdRef = useRef<string | null>(null);
  const customPlanExitTimeoutRef = useRef<number | null>(null);
  const rosaryMeditatedBackHandlerRef = useRef<(() => boolean) | null>(null);
  const clearCustomPlanExitPrompt = useCallback(() => {
    customPlanExitAdvanceRef.current = null;
    if (customPlanExitTimeoutRef.current !== null) {
      window.clearTimeout(customPlanExitTimeoutRef.current);
      customPlanExitTimeoutRef.current = null;
    }
    if (customPlanExitToastIdRef.current) {
      dismissToastRef.current(customPlanExitToastIdRef.current);
      customPlanExitToastIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const { x, y, z } = acc;
      if (x == null || y == null || z == null) return;

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // Increased threshold for more insistence
      if (acceleration > 55) {
        if (now - lastShakeTimeRef.current > 400) { // Cooldown between individual shakes
          lastShakeTimeRef.current = now;
          shakeCountRef.current += 1;

          if (shakeResetTimeoutRef.current) clearTimeout(shakeResetTimeoutRef.current);
          shakeResetTimeoutRef.current = setTimeout(() => {
            shakeCountRef.current = 0;
          }, 2000); // Reset count after 2s of stillness

          if (shakeCountRef.current >= 3) {
            shakeCountRef.current = 0;
            setShowErrorReport(true);
            pushDevLiveTrace({
              level: 'info',
              source: 'shake',
              message: 'Triple agitación detectada, abriendo reporte de errores.',
            });
          }
        }
      }
    };

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') window.addEventListener('devicemotion', handleMotion);
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (shakeResetTimeoutRef.current) clearTimeout(shakeResetTimeoutRef.current);
    };
  }, [pushDevLiveTrace]);

  const [isDraggingAnnuum, setIsDraggingAnnuum] = useState(false);
  const AnnuumDragStart = useRef({ x: 0, y: 0 });
  const AnnuumStartPos = useRef({ x: 0, y: 0 });

  const handleAnnuumTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDraggingAnnuum(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    AnnuumDragStart.current = { x: clientX, y: clientY };
    AnnuumStartPos.current = { ...overlayPositions.AnnuumBubble };
  };

  const handleAnnuumTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingAnnuum) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - AnnuumDragStart.current.x;
    const dy = clientY - AnnuumDragStart.current.y;

    setOverlayPosition('AnnuumBubble', {
      x: AnnuumStartPos.current.x + dx,
      y: AnnuumStartPos.current.y + dy
    });
  };

  const handleAnnuumTouchEnd = () => {
    setIsDraggingAnnuum(false);
  };

  const isSeason = useMemo(() => {
    if (forceAnnuumSeason) return true;
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    return isAnnuumSeason(now);
  }, [simulatedDate, forceAnnuumSeason]);

  useEffect(() => {
    navStateRef.current = navState;
  }, [navState]);
  useEffect(() => {
    dismissToastRef.current = dismiss;
  }, [dismiss]);
  useEffect(() => {
    clearCustomPlanExitPrompt();
  }, [clearCustomPlanExitPrompt, navState.activeView, navState.customPlanPrayerSlot, navState.customPlanPrayerIndex]);
  useNavPersistence(navStateRef);

  useEffect(() => {
    persistNavState(navState);
  }, [navState]);

  // Effect to handle browser history (popstate for back/forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const nextState = (event.state as NavigationState | null) ?? null;
      const isCustomPlanContext =
        nextState?.activeView === 'customPlan' ||
        (nextState?.activeView === 'prayer' && nextState.customPlanPrayerSlot !== null);

      if (isCustomPlanContext) {
        window.history.replaceState(initialState, '');
        setNavState(initialState);
        return;
      }

      if (nextState) {
        setNavState(nextState);
        return;
      }

      setNavState(initialState);
    };

    window.addEventListener('popstate', handlePopState);
    // Set initial state in history
    window.history.replaceState(initialState, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Effect to push new state to history when navState changes
  useEffect(() => {
    // Only push state if it's different from the current history state
    // This check is a bit simplistic but prevents loops on popstate
    if (JSON.stringify(navState) === JSON.stringify(window.history.state)) return;
    const previousState = window.history.state as NavigationState | null;
    const isCustomPlanPrayer = navState.activeView === 'prayer' && navState.customPlanPrayerSlot !== null;
    const shouldReplace = isCustomPlanPrayer && previousState?.activeView !== 'home';
    if (shouldReplace) {
      window.history.replaceState(navState, '');
      return;
    }
    window.history.pushState(navState, '');
  }, [navState]);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, [navState.activeView]);

  const getPrayerById = useCallback((id: string, list: Prayer[]): Prayer | null => {
    const findRecursively = (targetId: string, currentList: Prayer[]): Prayer | null => {
      for (const prayer of currentList) {
        if (prayer.id === targetId) return prayer;
        if (prayer.prayers) {
          const found = findRecursively(targetId, prayer.prayers);
          if (found) return found;
        }
      }
      return null;
    };
    return findRecursively(id, list);
  }, []);

  const buildPrayerPath = useCallback((pathIds: string[]) => {
    if (!pathIds || pathIds.length === 0) return [] as Prayer[];

    const path: Prayer[] = [];
    let currentList = allPrayers;

    for (const id of pathIds) {
      const prayer = getPrayerById(id, currentList);
      if (!prayer) break;
      path.push(prayer);
      currentList = prayer.prayers || [];
    }

    return path;
  }, [allPrayers, getPrayerById]);

  const getCategoryIdForPrayerPath = useCallback((pathIds: string[]) => {
    const rootId = pathIds[0];
    if (!rootId) return null;
    return getPrayerById(rootId, allPrayers)?.categoryId ?? null;
  }, [allPrayers, getPrayerById]);

  const buildCategoryNavState = useCallback((categoryId: string | null): NavigationState => {
    if (!categoryId) return initialState;
    return {
      ...initialState,
      activeView: categoryId === 'ajustes' ? 'settings' : 'category',
      selectedCategoryId: categoryId,
    };
  }, []);

  const buildPrayerNavState = useCallback((pathIds: string[]): NavigationState => ({
    ...initialState,
    activeView: 'prayer',
    selectedCategoryId: getCategoryIdForPrayerPath(pathIds),
    prayerPathIds: pathIds,
  }), [getCategoryIdForPrayerPath]);

  const replaceNavState = useCallback((nextState: NavigationState) => {
    window.history.replaceState(nextState, '');
    setNavState(nextState);
  }, []);

  const handleBack = useCallback(() => {
    const currentState = navStateRef.current;
    const currentPrayerId = currentState.prayerPathIds[currentState.prayerPathIds.length - 1] ?? null;

    if (currentState.activeView === 'home') {
      return;
    }

    if (
      currentState.activeView === 'prayer' &&
      currentPrayerId === 'letanias' &&
      currentState.rosaryReturnMode === 'selection'
    ) {
      replaceNavState({
        ...initialState,
        activeView: 'rosary',
      });
      return;
    }

    if (currentState.activeView === 'prayer' && currentState.customPlanPrayerSlot !== null) {
      replaceNavState(initialState);
      return;
    }

    if (currentState.activeView === 'customPlan') {
      replaceNavState(initialState);
      return;
    }

    if (currentState.activeView === 'rosaryMeditated' && rosaryMeditatedBackHandlerRef.current?.()) {
      return;
    }

    if (
      currentState.activeView === 'viaCrucis' ||
      currentState.activeView === 'rosary' ||
      currentState.activeView === 'planCalendar'
    ) {
      replaceNavState(buildCategoryNavState('plan-de-vida'));
      return;
    }

    if (currentState.activeView === 'rosaryMeditated') {
      replaceNavState(buildCategoryNavState('plan-de-vida'));
      return;
    }

    if (currentState.activeView === 'developer') {
      replaceNavState(buildCategoryNavState('ajustes'));
      return;
    }

    if (currentState.activeView === 'settings' || currentState.activeView === 'category') {
      replaceNavState(initialState);
      return;
    }

    if (currentState.activeView === 'addForm' || currentState.activeView === 'editForm') {
      if (currentState.prayerPathIds.length > 0) {
        replaceNavState(buildPrayerNavState(currentState.prayerPathIds));
        return;
      }

      replaceNavState(buildCategoryNavState(currentState.selectedCategoryId));
      return;
    }

    if (currentState.activeView === 'prayer') {
      if (currentState.prayerPathIds.length > 1) {
        replaceNavState(buildPrayerNavState(currentState.prayerPathIds.slice(0, -1)));
        return;
      }

      const categoryId =
        getCategoryIdForPrayerPath(currentState.prayerPathIds) ?? currentState.selectedCategoryId;
      replaceNavState(buildCategoryNavState(categoryId));
      return;
    }

    replaceNavState(initialState);
  }, [buildCategoryNavState, buildPrayerNavState, getCategoryIdForPrayerPath, replaceNavState]);

  useAndroidBackButton(navStateRef, handleBack);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === navState.selectedCategoryId) || null,
    [navState.selectedCategoryId, categories]
  );

  const prayerPath = useMemo(() => {
    return buildPrayerPath(navState.prayerPathIds);
  }, [buildPrayerPath, navState.prayerPathIds]);

  const editingPrayer = useMemo(() => {
    return navState.editingPrayerId
      ? getPrayerById(navState.editingPrayerId, allPrayers)
      : null;
  }, [navState.editingPrayerId, allPrayers, getPrayerById]);

  const handleSelectCategory = (category: Category) => {
    setNavState({
      ...initialState,
      activeView: category.id === 'ajustes' ? 'settings' : 'category',
      selectedCategoryId: category.id,
    });
  };

  const handleOpenCategoryById = useCallback((categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    setNavState({
      ...initialState,
      activeView: category.id === 'ajustes' ? 'settings' : 'category',
      selectedCategoryId: category.id,
    });
  }, [categories]);


  const handleSelectPrayer = (prayer: Prayer) => {
    if (!prayer.id) return;

    if (prayer.id === 'via-crucis') {
      setNavState(prevState => ({
        ...prevState,
        activeView: 'viaCrucis',
      }));
      incrementStat('prayersOpenedHistory', prayer.id);
      return;
    }

    if (prayer.id === 'santo-rosario') {
      setNavState(prevState => ({
        ...prevState,
        activeView: 'rosary',
      }));
      incrementStat('prayersOpenedHistory', prayer.id);
      return;
    }

    setNavState(prevState => ({
      ...prevState,
      activeView: 'prayer',
      prayerPathIds: [...prevState.prayerPathIds, prayer.id!],
    }));

    incrementStat('prayersOpenedHistory', prayer.id);
  };

  const handleSavePrayer = (data: {
    title: string;
    content: string;
    imageUrl?: string;
  }) => {
    if (editingPrayer?.id) {
      if (navState.addFormMode === 'predefined') {
        setPredefinedPrayerOverride(editingPrayer.id, data);
      } else {
        updateUserPrayer(editingPrayer.id, data);
      }
    } else {
      const prayerData = {
        id: crypto.randomUUID(),
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
        isUserDefined: true,
      };

      switch (navState.addFormMode) {
        case 'devotion':
          addUserDevotion({ ...(prayerData as Prayer), categoryId: 'devociones' });
          break;
        case 'letter':
          addUserLetter({ ...(prayerData as Prayer), categoryId: 'cartas' });
          break;
        case 'predefined':
          break;
        default:
          addUserPrayer({ ...(prayerData as Prayer), categoryId: 'oraciones' });
      }
    }
    // Double navigation fix: AddPrayerForm calls onCancel which calls handleBack.
    // So we don't need to call handleBack here, otherwise we go back twice.
    // handleBack(); 
  };

  const handleAddEntrada = (mode: AddFormMode) => {
    setNavState(prevState => ({
      ...prevState,
      activeView: 'addForm',
      addFormMode: mode,
      editingPrayerId: null,
    }));
  };

  const handleEditEntrada = (prayer: Prayer, mode: AddFormMode) => {
    if (!prayer.id) return;
    setNavState(prevState => ({
      ...prevState,
      activeView: 'editForm',
      editingPrayerId: prayer.id!,
      addFormMode: mode,
    }));
  };

  const handleCancelForm = () => {
    handleBack();
  }

  const currentPrayer = prayerPath.at(-1) || null;
  const isCaminoActive = currentPrayer?.id === 'camino-libro';

  useEffect(() => {
    if (isCaminoActive) return;
    setIsSearchVisible(false);
    setSearchState(DEFAULT_CAMINO_SEARCH_STATE);
  }, [isCaminoActive]);

  const renderCategory = () => {
    if (!selectedCategory) return null;

    if (selectedCategory.id === 'oraciones') {
      const predeterminadas = allPrayers.filter(
        (p) => p.categoryId === 'oraciones' && !p.isUserDefined
      );
      return (
        <PrayerAccordion
          predeterminadas={predeterminadas}
          entradas={userPrayers}
          onAddEntrada={() => handleAddEntrada('entry')}
          onSelectPrayer={handleSelectPrayer}
          onRemoveEntrada={removeUserPrayer}
          onEditEntrada={(p) => handleEditEntrada(p, 'entry')}
        />
      );
    }

    if (currentPrayer?.id === 'cartas') {
      return (
        <>
          <CartasIntro />
          <PrayerList
            prayers={userLetters}
            onSelectPrayer={handleSelectPrayer}
            onRemovePrayer={removeUserLetter}
            onEditPrayer={(p) => handleEditEntrada(p, 'letter')}
            showAddButton
            onAddButtonClick={() => handleAddEntrada('letter')}
            addButtonLabel="Añadir Carta"
            categoryId={currentPrayer.id}
            isUserPrayerList
          />
        </>
      );
    }

    const prayerListSource =
      selectedCategory.id === 'devociones'
        ? [
          ...allPrayers.filter(
            (p) => p.categoryId === 'devociones' && !p.isUserDefined
          ),
          ...userDevotions,
        ]
        : allPrayers.filter((p) => p.categoryId === selectedCategory.id);

    return (
      <PrayerList
        prayers={prayerListSource}
        onSelectPrayer={handleSelectPrayer}
        onOpenPrayerById={handleOpenPrayerById}
        onRemovePrayer={
          selectedCategory.id === 'devociones'
            ? removeUserDevotion
            : isDeveloperMode
              ? removePredefinedPrayer
              : undefined
        }
        onEditPrayer={
          selectedCategory.id === 'devociones'
            ? (p) => handleEditEntrada(p, 'devotion')
            : undefined
        }
        showAddButton={selectedCategory.id === 'devociones'}
        onAddButtonClick={() => handleAddEntrada('devotion')}
        addButtonLabel="Agregar Devoción"
        categoryId={selectedCategory.id}
        prayerPathLength={prayerPath.length}
      />
    );
  };

  const handleOpenDeveloperDashboard = useCallback(() => {
    setNavState({
      ...initialState,
      activeView: 'developer'
    });
  }, []);

  const renderContent = () => {
    switch (navState.activeView) {
      case 'settings':
        return <Settings
          onOpenDeveloperDashboard={handleOpenDeveloperDashboard}
          onShowAnnuum={() => setShowAnnuum(true)}
        />;
      case 'developer':
        return <DeveloperDashboard onBack={handleBack} />;
      case 'viaCrucis':
        return <ViaCrucisImmersive onClose={() => setNavState({ ...initialState, activeView: 'category', selectedCategoryId: 'plan-de-vida' })} />;
      case 'rosary':
        return <RosaryImmersive
          onClose={(targetId) => {
            if (targetId) {
              handleOpenPrayerById(targetId, {
                rosaryReturnMode: targetId === 'letanias' ? 'selection' : null,
              });
            } else {
              setNavState({ ...initialState, activeView: 'category', selectedCategoryId: 'plan-de-vida' });
            }
          }}
          onSwitchToMeditated={() => setNavState(prev => ({ ...prev, activeView: 'rosaryMeditated' }))}
        />;
      case 'rosaryMeditated':
        return <RosaryMeditated
          onClose={() => setNavState({ ...initialState, activeView: 'category', selectedCategoryId: 'plan-de-vida' })}
          onSwitchToImmersive={() => setNavState(prev => ({ ...prev, activeView: 'rosary' }))}
          registerBackHandler={(handler) => {
            rosaryMeditatedBackHandlerRef.current = handler;
          }}
        />;
      case 'planCalendar':
        return <PlanDeVidaCalendar />;
      case 'category':
        return <div className="p-4">{renderCategory()}</div>;
      case 'customPlan': {
        const slot = navState.selectedCustomPlanSlot;
        if (!slot) return null;
        return (
          <div className="p-4">
            <CustomPlanView
              slot={slot}
              onOpenPrayerId={handleOpenPrayerById}
              onOpenPlanPrayerAt={(index) => handleOpenCustomPlanPrayerAt(slot, index)}
              onDone={handleBack}
              startInEditMode={navState.customPlanEditMode}
            />
          </div>
        );
      }
      case 'addForm':
      case 'editForm':
        return (
          <div className="p-4">
            <AddPrayerForm
              onSave={handleSavePrayer}
              onCancel={handleCancelForm}
              existingPrayer={editingPrayer}
              formType={navState.addFormMode || 'entry'}
            />
          </div>
        );
      case 'prayer':
        if (!currentPrayer) {
          return <div className="p-4 text-sm text-muted-foreground">Oración no encontrada.</div>;
        }
        if (currentPrayer.id === 'cartas') {
          return <div className="p-4">{renderCategory()}</div>;
        }
        if (currentPrayer.id === 'lectura-espiritual-audios') {
          const spiritualAudios = [
            { title: 'Discurso San Josemaría', src: '/media/Discurso San Josemaría.mp3' },
            { title: 'Discurso San Juan Pablo II', src: '/media/Discurso San Juan Pablo II.mp3' },
          ];
          const audioSrc = activeSpiritualReadingAudio || spiritualAudios[0].src;

          return (
            <div className="p-4 space-y-4">
              <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-xl border shadow-sm shrink-0 space-y-4">
                <AudioPlayer src={audioSrc} title={spiritualAudios.find(a => a.src === audioSrc)?.title || 'Audio seleccionado'} />
                <div className="grid grid-cols-1 gap-2">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Meditaciones disponibles</p>
                  {spiritualAudios.map((audio) => (
                    <Button
                      key={audio.src}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start text-left h-auto py-2 px-3 rounded-lg border border-transparent',
                        activeSpiritualReadingAudio === audio.src && 'border-primary/20 bg-primary/5 text-primary'
                      )}
                      onClick={() => setActiveSpiritualReadingAudio(audio.src)}
                    >
                      <Play className={cn("mr-2 h-4 w-4", activeSpiritualReadingAudio === audio.src ? "fill-primary" : "text-muted-foreground")} />
                      <span className="truncate">{audio.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        if (currentPrayer.prayers && currentPrayer.prayers.length > 0) {
          return (
            <div className="p-4">
              <PrayerList
                prayers={currentPrayer.prayers}
                onSelectPrayer={handleSelectPrayer}
                onOpenPrayerById={handleOpenPrayerById}
                categoryId={currentPrayer.id || ''}
                prayerPathLength={prayerPath.length}
              />
            </div>
          );
        }
        if (currentPrayer.id === 'lectura-nuevo-testamento') {
          return <EpubReader />;
        }
        if (currentPrayer.id === 'lectura-espiritual-personales') {
          return <PersonalEpubLibrary />;
        }
        if (currentPrayer.id === 'letanias') {
          return (
            <PrayerDetail
              prayer={{ ...currentPrayer, content: letaniasRosarioBase.content }}
              searchState={isCaminoActive ? searchState : undefined}
            />
          );
        }
        return <PrayerDetail prayer={currentPrayer} searchState={isCaminoActive ? searchState : undefined} />;
      case 'home':
      default:
        return (
          <HomePage
            onSelectCategory={handleSelectCategory}
            onOpenCustomPlan={handleOpenCustomPlan}
            onCreateCustomPlan={handleCreateAndOpenCustomPlan}
          />
        );
    }
  };

  const handleOpenPrayerById = useCallback((id: string, options?: { countOpen?: boolean; rosaryReturnMode?: 'selection' | null }) => {
    const pathIds = getPrayerPathIds(id, allPrayers);
    if (!pathIds) return;
    setNavState({
      ...buildPrayerNavState(pathIds),
      rosaryReturnMode: options?.rosaryReturnMode ?? null,
    });
    if (options?.countOpen !== false) {
      incrementStat('prayersOpenedHistory', id);
    }
  }, [allPrayers, buildPrayerNavState, incrementStat]);


  const handleRouteNavigation = useCallback((route: string) => {
    const parts = route.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    const root = normalizeRouteSegment(parts[0]);
    if (root === 'inicio' || root === 'home') {
      setNavState({ ...initialState, activeView: 'home' });
      if (parts.length === 1) return;
    }

    if (parts.length >= 2) {
      const categoryId = parts[1].toLowerCase();
      setNavState({ ...initialState, activeView: 'category', selectedCategoryId: categoryId });

      if (parts.length >= 3) {
        const prayerTitle = parts[2];
        const prayerId = findPrayerIdByTitle(prayerTitle, allPrayers);
        if (prayerId) {
          handleOpenPrayerById(prayerId);
        }
      }
    }
  }, [allPrayers, handleOpenPrayerById]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const consumePendingNavigation = () => {
      try {
        const raw = window.localStorage.getItem(PENDING_NAVIGATION_STORAGE_KEY);
        if (!raw || raw === lastProcessedPendingNavigationRef.current) return;

        lastProcessedPendingNavigationRef.current = raw;
        window.localStorage.removeItem(PENDING_NAVIGATION_STORAGE_KEY);

        const parsed = JSON.parse(raw);
        if (parsed?.type === 'prayer' && typeof parsed.id === 'string') {
          handleOpenPrayerById(parsed.id);
          return;
        }
        if (parsed?.type === 'category' && typeof parsed.id === 'string') {
          handleOpenCategoryById(parsed.id);
          return;
        }
        if (parsed?.type === 'route' && typeof parsed.route === 'string') {
          handleRouteNavigation(parsed.route);
        }
      } catch {
        window.localStorage.removeItem(PENDING_NAVIGATION_STORAGE_KEY);
      }
    };

    consumePendingNavigation();
    window.addEventListener('cotidie-pending-navigation', consumePendingNavigation);
    return () => {
      window.removeEventListener('cotidie-pending-navigation', consumePendingNavigation);
    };
  }, [handleOpenCategoryById, handleOpenPrayerById, handleRouteNavigation]);

  useNotificationActionBinding({
    togglePlanDeVidaItem,
    handleRouteNavigation,
    handleOpenPrayerById,
    handleOpenCategoryById,
    pushDevLiveTrace,
  });

  useSharedImportBinding({
    pendingImportStorageKey: PENDING_IMPORT_STORAGE_KEY,
    pushDevLiveTrace,
  });

  const resolveCustomPlanNavigationTarget = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    const resolvedId = resolvePlanPrayerId(id);
    if (!resolvedId) return null;
    const pathIds = getPrayerPathIds(resolvedId, allPrayers);
    if (!pathIds) return null;
    return { resolvedId, pathIds };
  }, [allPrayers]);

  const handleOpenCustomPlanPrayerAt = useCallback((slot: 1 | 2 | 3 | 4, index: number): boolean => {
    const plan = customPlans[slot - 1];
    const prayerIds = plan?.prayerIds ?? [];
    if (prayerIds.length === 0) return false;

    const clampedIndex = Math.max(0, Math.min(prayerIds.length - 1, index));

    const tryOpenAt = (candidateIndex: number): boolean => {
      const id = prayerIds[candidateIndex];
      const target = resolveCustomPlanNavigationTarget(id);
      if (!target) return false;

      incrementStat('prayersOpenedHistory', target.resolvedId);

      setNavState({
        ...buildPrayerNavState(target.pathIds),
        customPlanPrayerSlot: slot,
        customPlanPrayerIndex: candidateIndex,
      });
      return true;
    };

    if (tryOpenAt(clampedIndex)) return true;

    for (let i = clampedIndex + 1; i < prayerIds.length; i++) {
      if (tryOpenAt(i)) return true;
    }

    for (let i = clampedIndex - 1; i >= 0; i--) {
      if (tryOpenAt(i)) return true;
    }

    return false;
  }, [buildPrayerNavState, customPlans, incrementStat, resolveCustomPlanNavigationTarget]);

  const handleOpenCustomPlan = useCallback((slot: 1 | 2 | 3 | 4, options?: { edit?: boolean; openFirstPrayer?: boolean }) => {
    if (options?.openFirstPrayer) {
      if (handleOpenCustomPlanPrayerAt(slot, 0)) return;
    }
    setNavState({
      ...initialState,
      activeView: 'customPlan',
      selectedCustomPlanSlot: slot,
      customPlanEditMode: Boolean(options?.edit),
    });
  }, [handleOpenCustomPlanPrayerAt]);

  const handleCreateAndOpenCustomPlan = useCallback((slot: 1 | 2 | 3 | 4, name?: string) => {
    const resolvedName = typeof name === 'string' && name.trim().length > 0 ? name : `Plan ${slot}`;
    createCustomPlan(slot, resolvedName);
    handleOpenCustomPlan(slot, { edit: true });
  }, [createCustomPlan, handleOpenCustomPlan]);

  const customPlanTitle =
    navState.activeView === 'customPlan' && navState.selectedCustomPlanSlot
      ? customPlans[navState.selectedCustomPlanSlot - 1]?.name?.trim() || `Plan ${navState.selectedCustomPlanSlot}`
      : null;
  const headerTitle =
    navState.activeView === 'planCalendar'
      ? 'Calendario'
      : customPlanTitle || currentPrayer?.title || selectedCategory?.name || 'Cotidie';
  const customPlanValidIndices = useMemo(() => {
    if (!navState.customPlanPrayerSlot) return [];
    const plan = customPlans[navState.customPlanPrayerSlot - 1];
    const prayerIds = plan?.prayerIds ?? [];
    const indices: number[] = [];
    for (let i = 0; i < prayerIds.length; i++) {
      if (resolveCustomPlanNavigationTarget(prayerIds[i])) indices.push(i);
    }
    return indices;
  }, [customPlans, navState.customPlanPrayerSlot, resolveCustomPlanNavigationTarget]);
  const customPlanValidPosition =
    navState.customPlanPrayerIndex === null ? -1 : customPlanValidIndices.indexOf(navState.customPlanPrayerIndex);
  const customPlanPrevIndex = customPlanValidPosition > 0 ? customPlanValidIndices[customPlanValidPosition - 1] : null;
  const customPlanNextIndex =
    customPlanValidPosition >= 0 && customPlanValidPosition < customPlanValidIndices.length - 1
      ? customPlanValidIndices[customPlanValidPosition + 1]
      : null;
  const hasCustomPlanPrayerNav =
    navState.activeView === 'prayer' &&
    navState.customPlanPrayerSlot !== null &&
    navState.customPlanPrayerIndex !== null &&
    customPlanValidIndices.length > 0 &&
    customPlanValidPosition !== -1;

  const goToCustomPlanPrev = useCallback(() => {
    clearCustomPlanExitPrompt();
    if (!hasCustomPlanPrayerNav || customPlanPrevIndex === null || navState.customPlanPrayerSlot === null) return;
    handleOpenCustomPlanPrayerAt(navState.customPlanPrayerSlot as 1 | 2 | 3 | 4, customPlanPrevIndex);
  }, [clearCustomPlanExitPrompt, customPlanPrevIndex, handleOpenCustomPlanPrayerAt, hasCustomPlanPrayerNav, navState.customPlanPrayerSlot]);

  const armCustomPlanExitPrompt = useCallback((slot: 1 | 2 | 3 | 4, index: number, now: number) => {
    clearCustomPlanExitPrompt();
    customPlanExitAdvanceRef.current = {
      slot,
      index,
      expiresAt: now + CUSTOM_PLAN_EXIT_CONFIRM_MS,
    };
    customPlanExitTimeoutRef.current = window.setTimeout(() => {
      customPlanExitAdvanceRef.current = null;
      if (customPlanExitToastIdRef.current) {
        dismissToastRef.current(customPlanExitToastIdRef.current);
        customPlanExitToastIdRef.current = null;
      }
      customPlanExitTimeoutRef.current = null;
    }, CUSTOM_PLAN_EXIT_CONFIRM_MS);
    customPlanExitToastIdRef.current = toast({
      title: 'Vuelve a avanzar para salir',
      description: 'Si avanzas otra vez, volverás a la pantalla principal.',
      duration: CUSTOM_PLAN_EXIT_CONFIRM_MS,
    }).id;
  }, [clearCustomPlanExitPrompt, toast]);

  const goToCustomPlanNext = useCallback(() => {
    if (!hasCustomPlanPrayerNav || navState.customPlanPrayerSlot === null || navState.customPlanPrayerIndex === null) return;

    if (customPlanNextIndex !== null) {
      clearCustomPlanExitPrompt();
      handleOpenCustomPlanPrayerAt(navState.customPlanPrayerSlot as 1 | 2 | 3 | 4, customPlanNextIndex);
      return;
    }

    const now = Date.now();
    const pendingExit = customPlanExitAdvanceRef.current;
    const slot = navState.customPlanPrayerSlot as 1 | 2 | 3 | 4;
    const index = navState.customPlanPrayerIndex;

    const hasActiveExitPrompt = Boolean(
      pendingExit &&
      pendingExit.slot === slot &&
      pendingExit.index === index &&
      pendingExit.expiresAt > now
    );

    if (hasActiveExitPrompt) {
      clearCustomPlanExitPrompt();
      replaceNavState(initialState);
      return;
    }

    armCustomPlanExitPrompt(slot, index, now);
  }, [armCustomPlanExitPrompt, clearCustomPlanExitPrompt, customPlanNextIndex, handleOpenCustomPlanPrayerAt, hasCustomPlanPrayerNav, navState.customPlanPrayerIndex, navState.customPlanPrayerSlot, replaceNavState]);

  const canEditCurrentPrayer =
    navState.activeView === 'prayer' &&
    Boolean(currentPrayer?.id) &&
    currentPrayer?.isUserDefined === true;
  const canEditExamenDeConciencia =
    navState.activeView === 'prayer' && currentPrayer?.id === 'examen-conciencia';

  const showPlanCalendarButton =
    navState.activeView === 'category' && navState.selectedCategoryId === 'plan-de-vida';
  const showsStandardHeader =
    navState.activeView !== 'home' && navState.activeView !== 'developer';

  const handleOpenPlanCalendar = () => {
    setNavState({
      ...initialState,
      activeView: 'planCalendar',
      selectedCategoryId: 'plan-de-vida',
    });
  };
  const currentPrayerEditMode: AddFormMode =
    currentPrayer?.categoryId === 'devociones'
      ? 'devotion'
      : currentPrayer?.categoryId === 'cartas'
        ? 'letter'
        : 'entry';
  const currentPrayerEditAction =
    canEditExamenDeConciencia && currentPrayer
      ? () =>
        setNavState((prevState) => ({
          ...prevState,
          activeView: 'editForm',
          editingPrayerId: currentPrayer.id!,
          addFormMode: 'predefined',
        }))
      : canEditCurrentPrayer && currentPrayer
        ? () => handleEditEntrada(currentPrayer, currentPrayerEditMode)
        : undefined;

  return (
    <div
      className={cn(
        "h-[100svh] w-full text-foreground relative flex flex-col",
        navState.activeView === 'home' ? "bg-transparent" : "bg-background"
      )}
      style={navState.activeView === 'home' ? {
        backgroundImage: 'var(--home-bg-image)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed'
      } : undefined}
    >
      {/* Dynamic System Bar Overlays */}
      {!isDistractionFree && (
        <>
          <div
            className={cn(
              "fixed top-0 inset-x-0 h-[env(safe-area-inset-top)] z-[100] pointer-events-none transition-colors duration-200",
              (navState.activeView === 'home' || navState.activeView === 'viaCrucis' || navState.activeView === 'rosary' || navState.activeView === 'rosaryMeditated' || showAnnuum) ? "bg-transparent" : "bg-primary"
            )}
          />
          <div
            className={cn(
              "fixed bottom-0 inset-x-0 h-[env(safe-area-inset-bottom)] z-[100] pointer-events-none transition-colors duration-200",
              (navState.activeView === 'home' || navState.activeView === 'viaCrucis' || navState.activeView === 'rosary' || navState.activeView === 'rosaryMeditated' || showAnnuum) ? "bg-transparent" : "bg-background"
            )}
          />
        </>
      )}
      {isSeason && !hasViewedAnnuum && navState.activeView === 'home' && (
        <div
          className="absolute z-40 cursor-pointer hover:scale-110 transition-transform"
          style={{
            top: overlayPositions.AnnuumBubble?.y ?? 48,
            left: overlayPositions.AnnuumBubble?.x ?? 16,
            marginTop: 'env(safe-area-inset-top)',
            touchAction: 'none'
          }}
          onClick={() => !isDraggingAnnuum && setShowAnnuum(true)}
          onTouchStart={handleAnnuumTouchStart}
          onTouchMove={handleAnnuumTouchMove}
          onTouchEnd={handleAnnuumTouchEnd}
          onMouseDown={handleAnnuumTouchStart}
          onMouseMove={handleAnnuumTouchMove}
          onMouseUp={handleAnnuumTouchEnd}
          onMouseLeave={handleAnnuumTouchEnd}
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg shadow-yellow-500/50 bg-black">
            <Image
              src="/icons/icon.png"
              alt="Annuum"
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
            {new Date().getFullYear()}
          </div>
        </div>
      )}

      <div className="flex flex-col h-full md:max-w-6xl md:mx-auto md:border-x md:border-border/50">
        {showsStandardHeader && (
          <Header
            title={headerTitle}
            showBackButton={true}
            floatBackButton={navState.activeView === 'customPlan' && !customPlanTouchNavEnabled}
            onBack={handleBack}
            showPrevNext={hasCustomPlanPrayerNav && !customPlanTouchNavEnabled}
            onPrev={
              hasCustomPlanPrayerNav && !customPlanTouchNavEnabled
                ? goToCustomPlanPrev
                : undefined
            }
            onNext={
              hasCustomPlanPrayerNav && !customPlanTouchNavEnabled
                ? goToCustomPlanNext
                : undefined
            }
            prevDisabled={
              !hasCustomPlanPrayerNav
            }
            nextDisabled={
              !hasCustomPlanPrayerNav
            }
            showSearchButton={isCaminoActive}
            onToggleSearch={() => setIsSearchVisible((p) => !p)}
            isDistractionFree={isDistractionFree}
            onToggleDistractionFree={toggleDistractionFree}
            showDistractionFreeButton
            showCalendarButton={showPlanCalendarButton}
            onOpenCalendar={showPlanCalendarButton ? handleOpenPlanCalendar : undefined}
            showEditButton={canEditCurrentPrayer || canEditExamenDeConciencia}
            onEdit={
              currentPrayerEditAction
            }
            showInfoButton={currentPrayer?.id === 'cartas'}
            onInfo={() => setShowLettersInfo(true)}
          />
        )}
        <div
          className={cn(
            'flex-1 overflow-x-hidden overscroll-none',
            navState.activeView === 'home'
              ? 'overflow-y-hidden'
              : (navState.activeView === 'prayer' && currentPrayer && !currentPrayer.prayers?.length)
                ? 'overflow-hidden'
                : 'overflow-y-auto pr-2'
          )}
          data-app-scroll-container={(navState.activeView !== 'home' && (navState.activeView !== 'prayer' || (currentPrayer && currentPrayer.prayers?.length))) ? 'true' : undefined}
          onClick={(e) => {
            if (!customPlanTouchNavEnabled) return
            if (!hasCustomPlanPrayerNav) return

            const target = e.target as HTMLElement

            if (isInteractiveElement(target)) return

            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            const width = rect.width

            if (x < width * 0.25) {
              goToCustomPlanPrev()
            } else if (x > width * 0.66) {
              goToCustomPlanNext()
            }
          }}
        >
          {renderContent()}
        </div>
      </div>

      {isCaminoActive && isSearchVisible && currentPrayer?.content && (
        <SearchCamino
          prayerContent={typeof currentPrayer.content === 'string' ? currentPrayer.content : ''}
          searchState={searchState}
          setSearchState={setSearchState}
          onClose={() => {
            setIsSearchVisible(false);
            setSearchState(DEFAULT_CAMINO_SEARCH_STATE);
          }}
        />
      )}

      <AlertDialog
        open={showTimerFinishedAlert}
        onOpenChange={setShowTimerFinishedAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Tiempo terminado!</AlertDialogTitle>
            <AlertDialogDescription>
              Tu tiempo de oración ha concluido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowTimerFinishedAlert(false)}>
            Aceptar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showErrorReport} onOpenChange={setShowErrorReport}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center font-headline text-xl">Reporte de error</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              ¿Detectaste algún fallo en Cotidie? <br/>
              Selecciona una vía para informar al desarrollador:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-3 gap-4 py-6">
            <button
              onClick={() => {
                window.location.href = "mailto:cotidieapp@gmail.com?subject=Reporte de error";
                setShowErrorReport(false);
              }}
              className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                <Icon.Mail className="size-7" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
            </button>

            <button
              onClick={() => {
                window.location.href = "https://wa.me/56929474804?text=Reporte%20de%20error:";
                setShowErrorReport(false);
              }}
              className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="size-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 group-hover:bg-green-500/20 transition-colors">
                <Icon.MessageCircle className="size-7" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</span>
            </button>

            <button
              onClick={() => {
                const username = 'cotidieapp';
                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isMobile) {
                  window.location.href = `https://ig.me/m/${username}`;
                } else {
                  window.open(`https://instagram.com/${username}`, '_blank');
                }
                setShowErrorReport(false);
              }}
              className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="size-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600 group-hover:bg-pink-500/20 transition-colors">
                <Icon.Instagram className="size-7" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instagram</span>
            </button>
          </div>

          <div className="flex justify-center border-t pt-4">
            <AlertDialogAction
              onClick={() => setShowErrorReport(false)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0 shadow-none px-8"
            >
              Cancelar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showLettersInfo}
        onOpenChange={setShowLettersInfo}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información sobre Cartas</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Escribe una carta al Señor. Agradece lo vivido, pide claridad por lo que se viene,
                  ruega ante una necesidad..., pero, sobre todo, háblale; no como un servidor a su señor,
                  sino como un hijo a su Padre. Amor de Padre es el Suyo, no lo olvides.
                </p>
                <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="font-medium text-foreground">Recordatorio de Cartas</div>
                      <p className="text-xs text-foreground/75 leading-relaxed">
                        Si pasan 30 días sin escribir una carta nueva, Cotidie te enviará una notificación
                        para invitarte a retomar este hábito filial.
                      </p>
                    </div>
                    <Switch
                      checked={cartasReminderEnabled}
                      onCheckedChange={setCartasReminderEnabled}
                      aria-label="Activar recordatorio de Cartas"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    * El contador se reinicia automáticamente al crear una carta nueva.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end">
            <AlertDialogAction onClick={() => setShowLettersInfo(false)}>
              Entendido
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {showAnnuum && (
          <AnnuumStory
            onClose={() => {
              setShowAnnuum(false);
              setHasViewedAnnuum(true);
            }}
            originRect={overlayPositions.AnnuumBubble ? {
              top: overlayPositions.AnnuumBubble.y,
              left: overlayPositions.AnnuumBubble.x,
              width: 48,
              height: 48
            } : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
