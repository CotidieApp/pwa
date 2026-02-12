'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Prayer, Category } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

import Header from '@/components/Header';
import PrayerList from '@/components/PrayerList';
import PrayerDetail from '@/components/PrayerDetail';
import Settings from '@/components/Settings';
import AddPrayerForm from '@/components/AddPrayerForm';
import PrayerAccordion from '@/components/PrayerAccordion';
import HomePage from '../home/HomePage';
import CustomPlanView from '../plans/CustomPlanView';
import RosaryImmersive from '../RosaryImmersive';
import ViaCrucisImmersive from '../ViaCrucisImmersive';
import SearchCamino from '@/components/SearchCamino';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isWrappedSeason } from '@/lib/movable-feasts';
import WrappedStory from '../WrappedStory';
import Image from 'next/image';
import DeveloperDashboard from '@/components/developer/DeveloperDashboard';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '../ui/card';

type AddFormMode = 'devotion' | 'entry' | 'letter' | 'predefined';
type AppView = 'home' | 'category' | 'prayer' | 'settings' | 'addForm' | 'editForm' | 'customPlan' | 'developer' | 'viaCrucis' | 'rosary';

interface NavigationState {
  activeView: AppView;
  selectedCategoryId: string | null;
  prayerPathIds: string[];
  editingPrayerId: string | null;
  addFormMode: AddFormMode | null;
  selectedCustomPlanSlot: 1 | 2 | 3 | 4 | null;
  customPlanPrayerSlot: 1 | 2 | 3 | 4 | null;
  customPlanPrayerIndex: number | null;
  customPlanEditMode: boolean;
}

const CartasIntro = () => (
  <Card className="mb-4 bg-card/80 shadow-md backdrop-blur-sm border-border/50">
    <CardContent className="p-6 text-sm text-foreground/90 space-y-3">
      <p>
        Escribe una carta al Señor. Agradece lo vivido, pide claridad por lo que se viene,
        ruega ante una necesidad..., pero, sobre todo, háblale; no como un servidor a su señor,
        sino como un hijo a su Padre. Amor de Padre es el Suyo, no lo olvides.
      </p>
      <blockquote className="italic text-foreground/80 pl-4 border-l-2 border-border">
        "Cuando te pongas delante de Dios, ten el descaro santo de un hijo que habla con su Padre."
      </blockquote>
      <div className="text-right text-foreground/80">— San Josemaría Escrivá</div>
    </CardContent>
  </Card>
);

const initialState: NavigationState = {
  activeView: 'home',
  selectedCategoryId: null,
  prayerPathIds: [],
  editingPrayerId: null,
  addFormMode: null,
  selectedCustomPlanSlot: null,
  customPlanPrayerSlot: null,
  customPlanPrayerIndex: null,
  customPlanEditMode: false,
};

const ORACION_DEL_DIA_ID = '__oracion_del_dia__';

const resolveOracionDelDiaPrayerId = () => {
  const day = new Date().getDay();
  if (day === 2) return 'salmo-ii';
  if (day === 4) return 'adoro-te-devote';
  if (day === 6) return 'salve-regina';
  if (day === 0) return 'simbolo-quicumque';
  return null;
};

export default function MainApp() {
  const [navState, setNavState] = useState<NavigationState>(initialState);
  const navStateRef = useRef(navState);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [searchState, setSearchState] = useState({
    term: '',
    activeIndex: -1,
    resultsCount: 0,
  });

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
    timerEnabled,
    timerTime,
    categories,
    togglePlanDeVidaItem,
    userLetters,
    addUserLetter,
    removeUserLetter,
    customPlans,
    createCustomPlan,
    incrementStat,
    simulatedDate,
    forceWrappedSeason,
    overlayPositions,
    setOverlayPosition,
  } = useSettings();

  const [isDraggingWrapped, setIsDraggingWrapped] = useState(false);
  const wrappedDragStart = useRef({ x: 0, y: 0 });
  const wrappedStartPos = useRef({ x: 0, y: 0 });

  const handleWrappedTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDraggingWrapped(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    wrappedDragStart.current = { x: clientX, y: clientY };
    wrappedStartPos.current = { ...overlayPositions.wrappedBubble };
  };

  const handleWrappedTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingWrapped) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const dx = clientX - wrappedDragStart.current.x;
    const dy = clientY - wrappedDragStart.current.y;

    setOverlayPosition('wrappedBubble', {
        x: wrappedStartPos.current.x + dx,
        y: wrappedStartPos.current.y + dy
    });
  };

  const handleWrappedTouchEnd = () => {
    setIsDraggingWrapped(false);
  };

  const isSeason = useMemo(() => {
      if (forceWrappedSeason) return true;
      const now = simulatedDate ? new Date(simulatedDate) : new Date();
      return isWrappedSeason(now);
  }, [simulatedDate, forceWrappedSeason]);

  useEffect(() => {
    navStateRef.current = navState;
  }, [navState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;

    let listener: { remove: () => void } | null = null;

    const setup = async () => {
      listener = await App.addListener('backButton', ({ canGoBack }) => {
        const s = navStateRef.current;
        const isCustomPlanContext =
          s.activeView === 'customPlan' ||
          (s.activeView === 'prayer' && s.customPlanPrayerSlot !== null);

        if (isCustomPlanContext) {
          window.history.replaceState(initialState, '');
          setNavState(initialState);
          return;
        }

        if (s.activeView !== 'home') {
          if (canGoBack) {
            window.history.back();
          } else {
            window.history.replaceState(initialState, '');
            setNavState(initialState);
          }
          return;
        }

        App.exitApp();
      });
    };

    setup();

    return () => {
      listener?.remove();
    };
  }, []);

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
    window.scrollTo({ top: 0 });
  }, [navState.activeView, navState.selectedCategoryId, navState.prayerPathIds?.length]);
  
  const handleBack = () => {
    if (navState.activeView === 'prayer' && navState.customPlanPrayerSlot !== null) {
      window.history.replaceState(initialState, '');
      setNavState(initialState);
      return;
    }
    
    // Fix for Plan de Vida navigation: If we are in Plan de Vida list, go to Home instead of back to previous prayer
    if (navState.activeView === 'category' && navState.selectedCategoryId === 'plan-de-vida') {
        window.history.replaceState(initialState, '');
        setNavState(initialState);
        return;
    }

    window.history.back();
  };

  const getPrayerById = useCallback((id: string, list: Prayer[]): Prayer | null => {
    for (const prayer of list) {
      if (prayer.id === id) return prayer;
      if (prayer.prayers) {
        const found = getPrayerById(id, prayer.prayers);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === navState.selectedCategoryId) || null,
    [navState.selectedCategoryId, categories]
  );

  const prayerPath = useMemo(() => {
    if (!navState.prayerPathIds || navState.prayerPathIds.length === 0) return [];
    
    const path: Prayer[] = [];
    let currentList = allPrayers;
  
    for (const id of navState.prayerPathIds) {
      const prayer = getPrayerById(id, currentList);
      if (prayer) {
        path.push(prayer);
        currentList = prayer.prayers || [];
      } else {
        // Path is broken, stop here
        break;
      }
    }
    return path;
  }, [navState.prayerPathIds, allPrayers, getPrayerById]);

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

  const resolvePlanPrayerId = useCallback((id: string) => {
    if (id === ORACION_DEL_DIA_ID) return resolveOracionDelDiaPrayerId();
    const legacyIdMap: Record<string, string> = {
      acordaos: 'acordaos-oracion',
      salmoII: 'salmo-ii',
      adoroTeDevote: 'adoro-te-devote',
      salveRegina: 'salve-regina',
      simboloQuicumque: 'simbolo-quicumque',
    };
    return legacyIdMap[id] ?? id;
  }, []);

  const getPrayerPathIds = useCallback((targetId: string, list: Prayer[], path: string[] = []): string[] | null => {
    for (const prayer of list) {
      if (!prayer.id) continue;
      const nextPath = [...path, prayer.id];
      if (prayer.id === targetId) return nextPath;
      if (prayer.prayers && prayer.prayers.length > 0) {
        const found = getPrayerPathIds(targetId, prayer.prayers, nextPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

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
    setNavState(prev => ({
        ...initialState,
        activeView: 'developer'
    }));
  }, []);

  const renderContent = () => {
    switch (navState.activeView) {
      case 'settings':
        return <Settings onOpenDeveloperDashboard={handleOpenDeveloperDashboard} />;
      case 'developer':
        return <DeveloperDashboard onBack={handleBack} />;
      case 'viaCrucis':
        return <ViaCrucisImmersive onClose={() => setNavState({ ...initialState, activeView: 'category', selectedCategoryId: 'plan-de-vida' })} />;
      case 'rosary':
        return <RosaryImmersive onClose={() => setNavState({ ...initialState, activeView: 'category', selectedCategoryId: 'plan-de-vida' })} />;
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
        if (currentPrayer.prayers && currentPrayer.prayers.length > 0) {
          return (
            <div className="p-4">
              <PrayerList
                prayers={currentPrayer.prayers}
                onSelectPrayer={handleSelectPrayer}
                categoryId={currentPrayer.id || ''}
                prayerPathLength={prayerPath.length}
              />
            </div>
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

  const handleOpenPrayerById = useCallback((id: string) => {
    const pathIds = getPrayerPathIds(id, allPrayers);
    if (!pathIds) return;
    setNavState({
      ...initialState,
      activeView: 'prayer',
      prayerPathIds: pathIds,
    });
  }, [allPrayers, getPrayerPathIds]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
      const extra = action.notification.extra as any;
      const target = extra?.target as { type?: string; id?: string } | undefined;
      if (target?.type === 'prayer' && typeof target.id === 'string') {
        handleOpenPrayerById(target.id);
        return;
      }
      if (target?.type === 'category' && typeof target.id === 'string') {
        handleOpenCategoryById(target.id);
      }
    });

    return () => {
      sub.then((handle) => handle.remove()).catch(() => {});
    };
  }, [handleOpenCategoryById, handleOpenPrayerById]);

  const handleOpenCustomPlanPrayerAt = useCallback((slot: 1 | 2 | 3 | 4, index: number): boolean => {
    const plan = customPlans[slot - 1];
    const prayerIds = plan?.prayerIds ?? [];
    if (prayerIds.length === 0) return false;

    const clampedIndex = Math.max(0, Math.min(prayerIds.length - 1, index));

    const tryOpenAt = (candidateIndex: number): boolean => {
      const id = prayerIds[candidateIndex];
      if (!id) return false;
      const resolvedId = resolvePlanPrayerId(id);
      if (!resolvedId) return false;
      const pathIds = getPrayerPathIds(resolvedId, allPrayers);
      if (!pathIds) return false;
      
      incrementStat('prayersOpenedHistory', resolvedId);

      setNavState({
        ...initialState,
        activeView: 'prayer',
        prayerPathIds: pathIds,
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
  }, [allPrayers, customPlans, getPrayerPathIds, resolvePlanPrayerId]);

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
  const headerTitle = customPlanTitle || currentPrayer?.title || selectedCategory?.name || 'Cotidie';
  const customPlanValidIndices = useMemo(() => {
    if (!navState.customPlanPrayerSlot) return [];
    const plan = customPlans[navState.customPlanPrayerSlot - 1];
    const prayerIds = plan?.prayerIds ?? [];
    const indices: number[] = [];
    for (let i = 0; i < prayerIds.length; i++) {
      const resolvedId = resolvePlanPrayerId(prayerIds[i]);
      if (resolvedId) indices.push(i);
    }
    return indices;
  }, [customPlans, navState.customPlanPrayerSlot, resolvePlanPrayerId]);
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

  const canEditCurrentPrayer =
    navState.activeView === 'prayer' &&
    Boolean(currentPrayer?.id) &&
    currentPrayer?.isUserDefined === true;
  const canEditExamenDeConciencia =
    navState.activeView === 'prayer' && currentPrayer?.id === 'examen-conciencia';
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
    <div className={cn("h-full w-full text-foreground relative", navState.activeView === 'home' ? "bg-transparent" : "bg-background")}>
      {isSeason && navState.activeView === 'home' && (
          <div 
            className="absolute z-40 cursor-pointer animate-in fade-in zoom-in duration-500 hover:scale-110 transition-transform"
            style={{ 
                top: overlayPositions.wrappedBubble?.y ?? 48, 
                left: overlayPositions.wrappedBubble?.x ?? 16,
                marginTop: 'env(safe-area-inset-top)',
                touchAction: 'none'
            }}
            onClick={() => !isDraggingWrapped && setShowWrapped(true)}
            onTouchStart={handleWrappedTouchStart}
            onTouchMove={handleWrappedTouchMove}
            onTouchEnd={handleWrappedTouchEnd}
            onMouseDown={handleWrappedTouchStart}
            onMouseMove={handleWrappedTouchMove}
            onMouseUp={handleWrappedTouchEnd}
            onMouseLeave={handleWrappedTouchEnd}
          >
             <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg shadow-yellow-500/50 bg-black">
                <Image 
                    src="/icons/icon-192x192.png" 
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
        {navState.activeView !== 'home' && navState.activeView !== 'developer' && (
          <Header
            title={headerTitle}
            showBackButton={true}
            floatBackButton={navState.activeView === 'customPlan'}
            onBack={handleBack}
            showPrevNext={hasCustomPlanPrayerNav}
            onPrev={
              hasCustomPlanPrayerNav
                ? () => {
                    if (customPlanPrevIndex === null) return;
                    handleOpenCustomPlanPrayerAt(
                      navState.customPlanPrayerSlot as 1 | 2 | 3 | 4,
                      customPlanPrevIndex
                    );
                  }
                : undefined
            }
            onNext={
              hasCustomPlanPrayerNav
                ? () => {
                    if (customPlanNextIndex === null) return;
                    handleOpenCustomPlanPrayerAt(
                      navState.customPlanPrayerSlot as 1 | 2 | 3 | 4,
                      customPlanNextIndex
                    );
                  }
                : undefined
            }
            prevDisabled={
              !hasCustomPlanPrayerNav || customPlanPrevIndex === null
            }
            nextDisabled={
              !hasCustomPlanPrayerNav || customPlanNextIndex === null
            }
            showSearchButton={isCaminoActive}
            onToggleSearch={() => setIsSearchVisible((p) => !p)}
            isDistractionFree={isDistractionFree}
            onToggleDistractionFree={toggleDistractionFree}
            showDistractionFreeButton
            showEditButton={canEditCurrentPrayer || canEditExamenDeConciencia}
            onEdit={
              currentPrayerEditAction
            }
          />
        )}
        <div
          className={cn(
            'flex-1 overflow-x-hidden',
            navState.activeView === 'home' ? 'overflow-y-hidden' : 'overflow-y-auto'
          )}
          data-app-scroll-container="true"
        >
          {renderContent()}
        </div>
      </div>

      {isCaminoActive && isSearchVisible && currentPrayer?.content && (
        <SearchCamino
          prayerContent={typeof currentPrayer.content === 'string' ? currentPrayer.content : ''}
          searchState={searchState}
          setSearchState={setSearchState}
          onClose={() => setIsSearchVisible(false)}
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

      <AnimatePresence>
        {showWrapped && (
          <WrappedStory 
              onClose={() => setShowWrapped(false)} 
              originRect={overlayPositions.wrappedBubble ? { 
                  top: overlayPositions.wrappedBubble.y, 
                  left: overlayPositions.wrappedBubble.x, 
                  width: 48, 
                  height: 48 
              } : undefined} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
