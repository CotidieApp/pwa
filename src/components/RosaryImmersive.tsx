'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { handleTouchNavigation, TOUCH_NAV_INTERACTIVE_SELECTORS } from '@/utils/touchNavigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, X, Plus, Trash2, Settings2, Image as ImageIcon, Calendar, Pencil, BookOpen, Crown, Cross, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { santoRosario } from '@/lib/prayers/plan-de-vida/santo-rosario';
import { letanias as letaniasData } from '@/lib/prayers/plan-de-vida/santo-rosario/letanias';
import type { Prayer } from '@/lib/types';
import ImmersivePrayerIndexOverlay, { type ImmersiveIndexItem, type ImmersiveIndexSection } from '@/components/immersive/ImmersivePrayerIndexOverlay';

import {
  PRAYERS_TEXT,
  DEFAULT_JACULATORIAS,
  SALVE_TEXT,
  PRE_ROSARY_STEPS,
  MYSTERY_COLORS,
  MYSTERY_IMAGES,
  MYSTERY_SPECIFIC_IMAGES,
  MYSTERY_NAMES,
  FULL_MYSTERY_TITLES,
  JACULATORIAS_STORAGE_KEY,
} from '@/lib/rosary-immersive/content';
import type { Jaculatoria, MysteryType, ImmersiveRosaryProps } from '@/lib/rosary-immersive/types';
import { renderRosaryText, renderCenterIcon, getMysteryByDay } from '@/lib/rosary-immersive/helpers';
import { RosarySelectionView } from '@/components/rosary-immersive/RosarySelectionView';
import { IntentionsMenuOverlay } from '@/components/rosary-immersive/IntentionsMenuOverlay';
import { JaculatoriasMenuOverlay } from '@/components/rosary-immersive/JaculatoriasMenuOverlay';

export default function RosaryImmersive({
  onClose,
  onSwitchToMeditated,
  mysteryTitle: initialTitle,
  mysteryGroup: initialGroup,
  mysteryContent: initialContent,
}: ImmersiveRosaryProps) {
  const { isDistractionFree, theme, arrowBubbleSize, navMode, prayerTextZoom } = useSettings();
  const touchNavEnabled = navMode === 'touch';

  const navBubbleClass = {
    sm: "gap-1 p-1 pl-2 rounded-xl",
    md: "gap-2 p-2 pl-3 rounded-2xl",
    lg: "gap-2.5 p-2.5 pl-4 rounded-2xl",
  }[arrowBubbleSize];

  const navButtonClass = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-14 w-14",
  }[arrowBubbleSize];

  const navIconClass = {
    sm: "size-5",
    md: "size-6",
    lg: "size-7",
  }[arrowBubbleSize];

  // State for Selection Mode vs Prayer Mode
  const [mode, setMode] = useState<'selection' | 'prayer'>(
    initialTitle ? 'prayer' : 'selection'
  );

  const [isPreRosary, setIsPreRosary] = useState(true);
  const [preStepIndex, setPreStepIndex] = useState(0);
  const [selectedMysteryType, setSelectedMysteryType] = useState<MysteryType>(
    initialTitle ? 'gozosos' : getMysteryByDay()
  );
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0); // 0-4
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPostRosary, setIsPostRosary] = useState(false);
  const [postStepIndex, setPostStepIndex] = useState(0);

  const [intentions, setIntentions] = useState<string[]>([]);
  const [showIntentionsMenu, setShowIntentionsMenu] = useState(false);
  const [newIntention, setNewIntention] = useState('');
  const [randomIntention, setRandomIntention] = useState<string | null>(null);

  const [jaculatorias, setJaculatorias] = useState<Jaculatoria[]>(DEFAULT_JACULATORIAS);
  const [showJaculatoriasMenu, setShowJaculatoriasMenu] = useState(false);
  const [newJaculatoria, setNewJaculatoria] = useState<Jaculatoria>({ v: '', r: '' });
  const [showPrayerIndex, setShowPrayerIndex] = useState(false);

  const [showBackground, setShowBackground] = useState(true);
  const [navPos, setNavPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const navDragStart = useRef<{ x: number; y: number; startX: number; startY: number }>({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });

  // Load intentions
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rosary_intentions');
      if (saved) setIntentions(JSON.parse(saved));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rosary_intentions', JSON.stringify(intentions));
    } catch (e) { console.error(e); }
  }, [intentions]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(JACULATORIAS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .map((item) => ({
              v: typeof item?.v === 'string' ? item.v : '',
              r: typeof item?.r === 'string' ? item.r : '',
            }))
            .filter((item) => item.v.trim().length > 0 || item.r.trim().length > 0);
          if (cleaned.length > 0) setJaculatorias(cleaned);
        }
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(JACULATORIAS_STORAGE_KEY, JSON.stringify(jaculatorias));
    } catch (e) { console.error(e); }
  }, [jaculatorias]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rosary_nav_position');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setNavPos({ x: parsed.x, y: parsed.y });
        }
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!navPos) return;
    try {
      localStorage.setItem('rosary_nav_position', JSON.stringify(navPos));
    } catch (e) { console.error(e); }
  }, [navPos]);


  // Determine current mystery data
  const currentMysteryData = useMemo(() => {
    if (initialTitle && initialContent) {
      return { id: '', title: initialTitle, content: initialContent, group: initialGroup || '' };
    }

    // Find the mystery list in santoRosario
    const groupKey = `misterios-${selectedMysteryType}`;
    const group = santoRosario.prayers?.find(p => p.id === groupKey);
    // Add safeguard for index out of bounds
    const safeIndex = Math.min(Math.max(0, currentMysteryIndex), (group?.prayers?.length || 1) - 1);
    const mystery = group?.prayers?.[safeIndex];

    return {
      id: mystery?.id || '',
      title: mystery?.title || '',
      content: typeof mystery?.content === 'string' ? mystery.content : '',
      group: MYSTERY_NAMES[selectedMysteryType]
    };
  }, [selectedMysteryType, currentMysteryIndex, initialTitle, initialContent, initialGroup]);

  // Clean title (remove "Primer Misterio...", just keep name)
  const displayTitle = useMemo(() => {
    const parts = currentMysteryData.title.split(':');
    return parts.length > 1 ? parts[1].trim() : currentMysteryData.title;
  }, [currentMysteryData.title]);

  const fullMysteryTitle = useMemo(() => {
    const rawTitle = FULL_MYSTERY_TITLES[currentMysteryData.id] || displayTitle;
    // Prepend "Primer Misterio Gozoso", etc.
    const typeLabelMap: Record<string, string> = {
      gozosos: 'gozoso',
      luminosos: 'luminoso',
      dolorosos: 'doloroso',
      gloriosos: 'glorioso',
    };
    const ordinalMap = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];

    // Only apply if it's one of the standard mysteries
    if (initialTitle) return rawTitle;

    const typeLabel = typeLabelMap[selectedMysteryType] || '';
    const ordinal = ordinalMap[currentMysteryIndex] || '';

    if (ordinal && typeLabel) {
      return `${ordinal} misterio ${typeLabel}, ${rawTitle}`;
    }
    return rawTitle;
  }, [currentMysteryData.id, displayTitle, selectedMysteryType, currentMysteryIndex, initialTitle]);

  const mysteryGroups = useMemo<Array<{ type: MysteryType; title: string; prayers: Prayer[] }>>(
    () =>
      (santoRosario.prayers ?? [])
        .filter((group): group is Prayer & { id: string } => Boolean(group?.id?.startsWith('misterios-')))
        .map((group) => ({
          type: group.id.replace('misterios-', '') as MysteryType,
          title: group.title,
          prayers: group.prayers ?? [],
        })),
    []
  );
  const currentMysteryGroup = useMemo(
    () => mysteryGroups.find((group) => group.type === selectedMysteryType) ?? null,
    [mysteryGroups, selectedMysteryType]
  );

  // Flatten sequence for CURRENT mystery
  const sequence = useMemo(() => {
    const seq: Array<{ type: string; label: string; index?: number }> = [];
    seq.push({ type: 'reading', label: 'Meditación' });
    if (intentions.length > 0) {
      seq.push({ type: 'intro', label: 'Intención' });
    }
    seq.push({ type: 'padre_nuestro', label: 'Padre Nuestro' });
    for (let i = 1; i <= 10; i++) {
      seq.push({ type: 'ave_maria', label: 'Ave María', index: i });
    }
    seq.push({ type: 'gloria', label: 'Gloria' });
    seq.push({ type: 'jaculatoria', label: 'Jaculatoria' });
    return seq;
  }, [intentions.length]);

  const sequenceIndexMap = useMemo(() => {
    const map = {
      reading: -1,
      intro: -1,
      padreNuestro: -1,
      gloria: -1,
      jaculatoria: -1,
      aves: [] as number[],
    };

    sequence.forEach((step, index) => {
      if (step.type === 'reading') map.reading = index;
      if (step.type === 'intro') map.intro = index;
      if (step.type === 'padre_nuestro') map.padreNuestro = index;
      if (step.type === 'gloria') map.gloria = index;
      if (step.type === 'jaculatoria') map.jaculatoria = index;
      if (step.type === 'ave_maria') map.aves.push(index);
    });

    return map;
  }, [sequence]);

  const preSteps = useMemo(() => PRE_ROSARY_STEPS, []);

  const formatJaculatorias = useCallback(
    (items: Jaculatoria[]) =>
      items
        .filter((item) => item.v.trim().length > 0 || item.r.trim().length > 0)
        .map((item) => `V. ${item.v}\nF. ${item.r}`)
        .join('\n\n'),
    []
  );

  const postSteps = useMemo(() => {
    const raw = typeof letaniasData?.content === 'string' ? letaniasData.content : '';
    const letaniasText = raw
      .split('\n')
      .map((line) => {
        if (/^\s+\S/.test(line)) {
          const leading = line.match(/^\s+/)?.[0] ?? '';
          const text = line.trim();
          return `${leading}*${text}*`;
        }
        return line;
      })
      .join('\n');
    const jaculatoriasText = formatJaculatorias(jaculatorias);
    const steps = [
      { type: 'letanias', label: 'Letanías', content: letaniasText },
      { type: 'jaculatorias', label: 'Jaculatorias', content: jaculatoriasText },
    ];
    return steps.filter((step) => step.content.trim().length > 0);
  }, [jaculatorias, formatJaculatorias]);

  const [isSalveActive, setIsSalveActive] = useState(false);
  const rosaryExitAdvanceRef = useRef<{ expiresAt: number } | null>(null);
  const { toast } = useToast();

  const currentPreStep = preSteps[preStepIndex];
  const currentStep = sequence[currentStepIndex];
  const currentPostStep = isSalveActive ? { type: 'salve', label: 'La Salve', content: SALVE_TEXT } : postSteps[postStepIndex];

  // Random intention logic
  useEffect(() => {
    if (intentions.length > 0) {
      setRandomIntention(intentions[Math.floor(Math.random() * intentions.length)]);
    } else {
      setRandomIntention(null);
    }
  }, [intentions.length, currentMysteryIndex]); // Re-roll per mystery

  const handleNext = () => {
    if (isSalveActive) {
      setIsSalveActive(false);
      // Salve is a branch/detour. When finished, we simply return to the previous context.
      // If we came from Gloria (mystery), we are now in postRosary context (set by the button).
      // If we came from Litanies, we return to Litanies (or move to next step if user clicks next again).
      return;
    }

    if (isPreRosary && preSteps.length > 0) {
      if (preStepIndex < preSteps.length - 1) {
        setPreStepIndex((prev) => prev + 1);
      } else {
        setIsPreRosary(false);
        setCurrentMysteryIndex(0);
        setCurrentStepIndex(0);
      }
      return;
    }

    if (isPostRosary && postSteps.length > 0) {
      if (postStepIndex < postSteps.length - 1) {
        setPostStepIndex(prev => prev + 1);
      } else {
        const now = Date.now();
        if (rosaryExitAdvanceRef.current && now < rosaryExitAdvanceRef.current.expiresAt) {
          rosaryExitAdvanceRef.current = null;
          onClose();
        } else {
          rosaryExitAdvanceRef.current = { expiresAt: now + 3000 };
          toast({
            title: "Fin del Santo Rosario",
            description: "Vuelve a avanzar para volver al menú principal.",
          });
        }
      }
      return;
    }

    if (currentStepIndex < sequence.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // End of this mystery. Go to next mystery or finish
      if (currentMysteryIndex < totalMysteries - 1 && !initialTitle) {
        setCurrentMysteryIndex(prev => prev + 1);
        setCurrentStepIndex(0);
      } else if (postSteps.length > 0) {
        setIsPostRosary(true);
        setPostStepIndex(0);
      } else {
        // Only close if there are no post steps (should be rare/never given we have litanies)
        // onClose(); // Never close automatically
      }
    }
  };

  const handlePrev = () => {
    if (isSalveActive) {
      setIsSalveActive(false);
      return;
    }

    if (isPreRosary && preSteps.length > 0) {
      if (preStepIndex > 0) {
        setPreStepIndex((prev) => prev - 1);
      }
      return;
    }

    if (isPostRosary && postSteps.length > 0) {
      if (postStepIndex > 0) {
        setPostStepIndex(prev => prev - 1);
      } else {
        setIsPostRosary(false);
        setCurrentMysteryIndex(Math.max(0, totalMysteries - 1));
        setCurrentStepIndex(sequence.length - 1);
      }
      return;
    }

    if (currentStepIndex === 0 && currentMysteryIndex === 0 && preSteps.length > 0) {
      setIsPreRosary(true);
      setPreStepIndex(preSteps.length - 1);
      return;
    }

    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else if (currentMysteryIndex > 0 && !initialTitle) {
      setCurrentMysteryIndex(prev => prev - 1);
      setCurrentStepIndex(sequence.length - 1);
    }
  };

  const handleSkipToNextMystery = () => {
    if (isPostRosary || isPreRosary) return;
    if (currentMysteryIndex < totalMysteries - 1 && !initialTitle) {
      setCurrentMysteryIndex(prev => prev + 1);
      setCurrentStepIndex(0);
    } else {
      // Jump to Litanies
      if (postSteps.length > 0) {
        setIsPostRosary(true);
        setPostStepIndex(0);
      }
    }
  };

  const handleSkipPreRosary = () => {
    if (!isPreRosary) return;
    setIsPreRosary(false);
    setCurrentMysteryIndex(0);
    setCurrentStepIndex(0);
  };

  const handleJumpToLitanies = () => {
    onClose('letanias');
  };

  const addIntention = () => {
    if (newIntention.trim()) {
      setIntentions(prev => [...prev, newIntention.trim()]);
      setNewIntention('');
    }
  };

  const removeIntention = (idx: number) => {
    setIntentions(prev => prev.filter((_, i) => i !== idx));
  };

  const addJaculatoria = () => {
    const v = newJaculatoria.v.trim();
    const r = newJaculatoria.r.trim();
    if (!v && !r) return;
    setJaculatorias((prev) => [...prev, { v, r }]);
    setNewJaculatoria({ v: '', r: '' });
  };

  const updateJaculatoria = (idx: number, field: keyof Jaculatoria, value: string) => {
    setJaculatorias((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const removeJaculatoria = (idx: number) => {
    setJaculatorias((prev) => prev.filter((_, i) => i !== idx));
  };

  const isDark = theme === 'dark' || isDistractionFree;
  const isPreRosaryActive = isPreRosary && preSteps.length > 0;
  const isPostRosaryActive = (isPostRosary && postSteps.length > 0) || isSalveActive;

  const getMysteryImage = useCallback((type: MysteryType, index: number) => {
    // Imagenes específicas para Pre y Post Rosario
    if (isPreRosaryActive) return '/images/sacred-heart.jpeg';
    if (isPostRosaryActive) return '/images/immaculate-conception.jpeg';

    const typeShort = type.endsWith('s') ? type.slice(0, -1) : type; // gozosos -> gozoso
    const specificKey = `${typeShort}-${index + 1}`;
    return MYSTERY_SPECIFIC_IMAGES[specificKey] || MYSTERY_IMAGES[type];
  }, [isPreRosaryActive, isPostRosaryActive]);
  const totalMysteries = initialTitle ? 1 : 5;
  const totalSteps = preSteps.length + sequence.length * totalMysteries + postSteps.length;
  const progressIndex = isPreRosaryActive
    ? preStepIndex
    : isPostRosaryActive
      ? isSalveActive ? totalSteps : preSteps.length + sequence.length * totalMysteries + postStepIndex
      : preSteps.length + currentMysteryIndex * sequence.length + currentStepIndex;
  const progressPercent = totalSteps > 0 ? ((progressIndex + 1) / totalSteps) * 100 : 0;
  const headerGroupLabel = isPreRosaryActive || isPostRosaryActive ? 'Santo Rosario' : currentMysteryData.group;
  const headerTitle = isPreRosaryActive
    ? currentPreStep?.label
    : isPostRosaryActive
      ? currentPostStep?.label
      : displayTitle;

  // Visibility Logic
  const showSalveButton =
    (!initialTitle && !isPostRosaryActive && currentMysteryIndex === totalMysteries - 1 && (currentStep.type === 'gloria' || currentStep.type === 'jaculatoria')) ||
    (isPostRosaryActive && currentPostStep.type === 'letanias');

  const showEditJaculatorias = isPostRosaryActive && currentPostStep.type === 'jaculatorias' && !isSalveActive;

  // --- CONFIGURACIí“N DE VISIBILIDAD ---
  // Porcentaje de la imagen que se mostrará durante el recorrido (default 80%)
  // Se puede especificar un valor diferente por cada misterio usando su clave (ej: 'gozoso-1')
  const DEFAULT_VISIBILITY_PERCENTAGE = 80;

  const MYSTERY_VISIBILITY_CONFIG: Record<string, number> = {
    // Misterios Gozosos
    'gozoso-1': 40,
    'gozoso-2': 50,
    'gozoso-3': 40,
    'gozoso-4': 40,
    'gozoso-5': 50,
    // Misterios Luminosos
    'luminoso-1': 60,
    'luminoso-2': 60,
    'luminoso-3': 70,
    'luminoso-4': 60,
    'luminoso-5': 60,
    // Misterios Dolorosos
    'doloroso-1': 40,
    'doloroso-2': 50,
    'doloroso-3': 50,
    'doloroso-4': 60,
    'doloroso-5': 35,
    // Misterios Gloriosos
    'glorioso-1': 40,
    'glorioso-2': 50,
    'glorioso-3': 60,
    'glorioso-4': 60,
    'glorioso-5': 50,
  };

  const mysteryProgress = useMemo(() => {
    // Si estamos en Pre o Post Rosario, devolvemos 50% fijo (centro)
    if (isPreRosaryActive || isPostRosaryActive) {
      return 50;
    }

    const total = sequence.length - 1;
    const current = currentStepIndex;
    const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

    // Determinar visibilidad específica
    const typeShort = selectedMysteryType.endsWith('s') ? selectedMysteryType.slice(0, -1) : selectedMysteryType;
    const specificKey = `${typeShort}-${currentMysteryIndex + 1}`;
    const visibility = MYSTERY_VISIBILITY_CONFIG[specificKey] ?? DEFAULT_VISIBILITY_PERCENTAGE;

    const margin = (100 - visibility) / 2;
    const start = margin;
    const end = 100 - margin;
    const range = end - start;

    return start + (ratio * range);
  }, [currentStepIndex, sequence.length, selectedMysteryType, currentMysteryIndex, isPreRosaryActive, isPostRosaryActive]);

  useEffect(() => {
    if (!isDraggingNav) return;
    const handleMove = (event: PointerEvent) => {
      const el = navRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const padding = 8;
      const maxX = window.innerWidth - width - padding;
      const maxY = window.innerHeight - height - padding;
      const minX = padding;
      const minY = padding + (Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0);
      const nextX = Math.min(maxX, Math.max(minX, navDragStart.current.startX + (event.clientX - navDragStart.current.x)));
      const nextY = Math.min(maxY, Math.max(minY, navDragStart.current.startY + (event.clientY - navDragStart.current.y)));
      setNavPos({ x: nextX, y: nextY });
    };
    const handleUp = () => {
      setIsDraggingNav(false);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDraggingNav]);

  // --- MEDITATION MENU OVERLAY ---
  // (Removed - moved to RosaryMeditated.tsx)

  const startMystery = (type: MysteryType) => {
    setSelectedMysteryType(type);
    setMode('prayer');
    setIsPreRosary(true);
    setPreStepIndex(0);
    setIsPostRosary(false);
    setPostStepIndex(0);
    setCurrentMysteryIndex(0);
    setCurrentStepIndex(0);
  };

  const openRosaryIndexSection = useCallback(() => {
    setShowPrayerIndex((prev) => !prev);
  }, []);

  const jumpToPreStep = useCallback((index: number) => {
    setMode('prayer');
    setIsSalveActive(false);
    setIsPostRosary(false);
    setIsPreRosary(true);
    setPreStepIndex(index);
    setShowPrayerIndex(false);
  }, []);

  const jumpToMysteryStep = useCallback((type: MysteryType, mysteryIndex: number, stepIndex: number) => {
    setMode('prayer');
    setSelectedMysteryType(type);
    setIsSalveActive(false);
    setIsPreRosary(false);
    setPreStepIndex(0);
    setIsPostRosary(false);
    setPostStepIndex(0);
    setCurrentMysteryIndex(mysteryIndex);
    setCurrentStepIndex(stepIndex);
    setShowPrayerIndex(false);
  }, []);

  const jumpToPostPrayer = useCallback((type: 'letanias' | 'jaculatorias' | 'salve') => {
    setMode('prayer');
    setIsPreRosary(false);
    setPreStepIndex(0);
    setIsPostRosary(true);
    if (type === 'salve') {
      setPostStepIndex(0);
      setIsSalveActive(true);
    } else {
      const targetIndex = Math.max(0, postSteps.findIndex((step) => step.type === type));
      setPostStepIndex(targetIndex);
      setIsSalveActive(false);
    }
    setShowPrayerIndex(false);
  }, [postSteps]);

  const rosaryIndexSections = useMemo<ImmersiveIndexSection[]>(
    () => [
      {
        title: 'Preparación',
        items: preSteps.map((step, index) => ({
          id: `pre-${index}`,
          label: `${index + 1}. ${step.label}`,
          active: isPreRosaryActive && preStepIndex === index,
          onSelect: () => jumpToPreStep(index),
        })),
      },
      ...(currentMysteryGroup ? [{
        title: currentMysteryGroup.title,
        items: currentMysteryGroup.prayers.flatMap((prayer, index) => {
          const mysteryLabel = FULL_MYSTERY_TITLES[prayer.id || ''] || prayer.title;
          const isCurrentMystery =
            !isPreRosaryActive &&
            !isPostRosaryActive &&
            !isSalveActive &&
            selectedMysteryType === currentMysteryGroup.type &&
            currentMysteryIndex === index;

          const items: ImmersiveIndexItem[] = [
            {
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-destino`,
              label: mysteryLabel,
              active: isCurrentMystery && currentStepIndex === sequenceIndexMap.reading,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, sequenceIndexMap.reading),
            },
          ];

          if (sequenceIndexMap.intro !== -1) {
            items.push({
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-intro`,
              label: 'Intención',
              depth: 1,
              active: isCurrentMystery && currentStepIndex === sequenceIndexMap.intro,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, sequenceIndexMap.intro),
            });
          }

          if (sequenceIndexMap.padreNuestro !== -1) {
            items.push({
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-padre`,
              label: 'Padre Nuestro',
              depth: 1,
              active: isCurrentMystery && currentStepIndex === sequenceIndexMap.padreNuestro,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, sequenceIndexMap.padreNuestro),
            });
          }

          sequenceIndexMap.aves.forEach((aveStepIndex, aveIndex) => {
            items.push({
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-ave-${aveIndex + 1}`,
              label: `Ave María ${aveIndex + 1}`,
              depth: 1,
              active: isCurrentMystery && currentStepIndex === aveStepIndex,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, aveStepIndex),
            });
          });

          if (sequenceIndexMap.gloria !== -1) {
            items.push({
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-gloria`,
              label: 'Gloria',
              depth: 1,
              active: isCurrentMystery && currentStepIndex === sequenceIndexMap.gloria,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, sequenceIndexMap.gloria),
            });
          }

          if (sequenceIndexMap.jaculatoria !== -1) {
            items.push({
              id: `${prayer.id || `${currentMysteryGroup.type}-${index}`}-jaculatoria`,
              label: 'Jaculatoria',
              depth: 1,
              active: isCurrentMystery && currentStepIndex === sequenceIndexMap.jaculatoria,
              onSelect: () => jumpToMysteryStep(currentMysteryGroup.type, index, sequenceIndexMap.jaculatoria),
            });
          }

          return items;
        }),
      }] : []),
      {
        title: 'Cierre',
        items: [
          {
            id: 'letanias',
            label: 'Letanías',
            active: isPostRosaryActive && !isSalveActive && currentPostStep?.type === 'letanias',
            onSelect: () => jumpToPostPrayer('letanias'),
          },
          {
            id: 'jaculatorias',
            label: 'Jaculatorias',
            active: isPostRosaryActive && !isSalveActive && currentPostStep?.type === 'jaculatorias',
            onSelect: () => jumpToPostPrayer('jaculatorias'),
          },
          {
            id: 'salve',
            label: 'La Salve',
            active: isSalveActive,
            onSelect: () => jumpToPostPrayer('salve'),
          },
        ],
      },
    ],
    [
      currentMysteryIndex,
      currentStepIndex,
      currentPostStep?.type,
      isPostRosaryActive,
      isPreRosaryActive,
      isSalveActive,
      jumpToMysteryStep,
      jumpToPostPrayer,
      jumpToPreStep,
      currentMysteryGroup,
      postSteps,
      preStepIndex,
      preSteps,
      sequenceIndexMap,
      selectedMysteryType,
    ]
  );

  // --- SELECTION VIEW ---
  if (mode === 'selection') {
    return (
      <RosarySelectionView
        isDark={isDark}
        onClose={onClose}
        onSwitchToMeditated={onSwitchToMeditated}
        selectedMysteryType={selectedMysteryType}
        startMystery={startMystery}
        handleJumpToLitanies={handleJumpToLitanies}
      />
    );
  }

  // --- PRAYER VIEW ---
  return (
    <div
      onClick={(e) => {
        if (!touchNavEnabled) return
        handleTouchNavigation(e, handlePrev, handleNext, {
          blockedSelectors: TOUCH_NAV_INTERACTIVE_SELECTORS,
        })
      }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-between pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-hidden",
        isDark ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"
      )}>
      {/* Background Layer */}
      {showBackground && (
        <>
          {/* Image Background */}
          <motion.div
            className="absolute inset-0 z-0 bg-cover"
            initial={false}
            animate={{
              backgroundPosition: `${mysteryProgress}% top`
            }}
            transition={{
              duration: 1.5,
              ease: "easeInOut"
            }}
            style={{
              backgroundImage: `url(${getMysteryImage(selectedMysteryType, currentMysteryIndex)})`,
              opacity: isDark ? 0.4 : 0.3
            }}
          />
          {/* Gradient Overlay (fallback & tint) */}
          <div className={cn(
            "absolute inset-0 z-0 transition-colors duration-1000",
            "bg-gradient-to-b",
            MYSTERY_COLORS[selectedMysteryType],
            isDark ? "opacity-30" : "opacity-40"
          )} />
        </>
      )}

      {/* Top Bar */}
      <div className="w-full flex justify-between items-start p-4 relative z-20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowIntentionsMenu(!showIntentionsMenu)}
            title="Editar intenciones"
          >
            {intentions.length > 0 ? <Settings2 className="size-5" /> : <Plus className="size-5" />}
          </Button>

          {/* Edit Jaculatorias - Only when visible */}
          {showEditJaculatorias && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowJaculatoriasMenu(!showJaculatoriasMenu)}
              title="Editar jaculatorias"
            >
              <Pencil className="size-5" />
            </Button>
          )}

          {/* Salve Button - Only at end range */}
          {showSalveButton && (
            <Button
              variant="ghost"
              className="gap-1 px-2 hover:bg-background/20"
              onClick={() => {
                setIsSalveActive(true);
                setIsPostRosary(true); // Force post rosary context
                setIsPreRosary(false);
              }}
              title="Ir a La Salve"
            >
              <Crown className="size-4 text-yellow-500" />
              <span className="text-xs font-bold">Salve</span>
            </Button>
          )}
        </div>

        <button
          type="button"
          data-no-touch-nav
          className="flex max-w-[50%] flex-col items-center text-center rounded-xl px-2 py-1 transition-colors hover:bg-background/10"
          onClick={openRosaryIndexSection}
        >
          {/* Intentions (Smallest, Top) */}
          <AnimatePresence mode="wait">
            {!isPreRosaryActive && !isPostRosaryActive && (randomIntention || currentStep.type === 'intro') && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px] uppercase tracking-wider font-medium opacity-60 mb-1 truncate w-full"
              >
                {randomIntention || "INTENCIí“N GENERAL"}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mystery Group (Small) */}
          <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold opacity-70">
            {headerGroupLabel}
            <ChevronDown className={cn("size-3.5 transition-transform", showPrayerIndex && "rotate-180")} />
          </span>

          {/* Mystery Name (Medium) */}
          <h2 className="text-sm font-bold leading-tight px-2 line-clamp-2">{headerTitle}</h2>
        </button>

        <div className="flex gap-1">
          {/* Skip Pre-Rosary */}
          {isPreRosaryActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipPreRosary}
              title="Saltar Intro"
            >
              <ChevronRight className="size-5" />
            </Button>
          )}

          {/* Skip Mystery */}
          {!initialTitle && !isPreRosaryActive && !isPostRosaryActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipToNextMystery}
              title="Saltar Misterio"
            >
              <div className="flex">
                <ChevronRight className="size-4 opacity-70 translate-x-1" />
                <ChevronRight className="size-4 opacity-70 -translate-x-1" />
              </div>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => setShowBackground(!showBackground)} title="Alternar fondo">
            <ImageIcon className={cn("size-5", !showBackground && "opacity-30")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onClose()}>
            <X className="size-6" />
          </Button>
        </div>
      </div>

      <ImmersivePrayerIndexOverlay
        open={showPrayerIndex}
        title="Índice del Santo Rosario"
        description="Salta a la introducción, los misterios actuales y el cierre."
        sections={rosaryIndexSections}
        onClose={() => setShowPrayerIndex(false)}
      />

      {/* Intentions Menu Overlay */}
      <IntentionsMenuOverlay
        show={showIntentionsMenu}
        onClose={() => setShowIntentionsMenu(false)}
        intentions={intentions}
        newIntention={newIntention}
        setNewIntention={setNewIntention}
        addIntention={addIntention}
        removeIntention={removeIntention}
      />

      {/* Jaculatorias Menu Overlay */}
      <JaculatoriasMenuOverlay
        show={showJaculatoriasMenu}
        onClose={() => setShowJaculatoriasMenu(false)}
        jaculatorias={jaculatorias}
        newJaculatoria={newJaculatoria}
        setNewJaculatoria={setNewJaculatoria}
        addJaculatoria={addJaculatoria}
        updateJaculatoria={updateJaculatoria}
        removeJaculatoria={removeJaculatoria}
      />

      {/* Main Content Center */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6 text-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${isPreRosaryActive ? 'pre' : isPostRosaryActive ? 'post' : 'mystery'}-${currentMysteryIndex}-${currentStepIndex}-${preStepIndex}-${postStepIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center w-full max-w-lg"
          >
            {!isPreRosaryActive && !isPostRosaryActive && currentStep?.type === 'reading' && (
              <div className="text-2xl sm:text-3xl font-semibold mb-6 text-center">
                {fullMysteryTitle}
              </div>
            )}
            {/* Big Center Element */}
            <div
              className={cn(
                "text-8xl sm:text-9xl font-black mb-8 select-none transition-colors duration-500",
                currentStep?.type === 'ave_maria' ? "text-primary" : "text-foreground/60"
              )}
            >
              {renderCenterIcon(
                isPreRosaryActive,
                isPostRosaryActive,
                currentPreStep ?? undefined,
                currentPostStep ?? undefined,
                currentStep ?? undefined
              )}
            </div>

            {/* Prayer Text (Below Center) */}
            <h3 className="text-xl font-bold mb-4">
              {isPreRosaryActive
                ? currentPreStep?.label
                : isPostRosaryActive
                  ? currentPostStep?.label
                  : currentStep?.label}
            </h3>

            <div
              data-no-touch-nav
              style={{ fontSize: `${prayerTextZoom}em` }}
              className="text-lg sm:text-xl opacity-90 leading-relaxed max-h-[35vh] overflow-y-auto px-4 scrollbar-hide w-full">
              {isPreRosaryActive
                ? <div>{renderRosaryText(currentPreStep?.content ?? '')}</div>
                : isPostRosaryActive
                  ? currentPostStep?.type === 'letanias'
                    ? (
                      <div className="text-left space-y-1">
                        {currentPostStep.content.split('\n').map((line, i) => {
                          // Regex to match **bold**, *gray-bold*, and _italic_
                          // Order matters: check double asterisks first
                          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
                          return (
                            <div key={i} className="min-h-[1.2rem]">
                              {parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <span key={j} className="font-bold text-foreground">{part.slice(2, -2)}</span>;
                                }
                                if (part.startsWith('*') && part.endsWith('*')) {
                                  return <span key={j} className="font-semibold text-muted-foreground">{part.slice(1, -1)}</span>;
                                }
                                if (part.startsWith('_') && part.endsWith('_')) {
                                  return <span key={j} className="italic">{part.slice(1, -1)}</span>;
                                }
                                return <span key={j}>{part}</span>;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )
                    : <div className="whitespace-pre-wrap">{currentPostStep?.content}</div>
                  : currentStep?.type === 'intro'
                    ? (randomIntention ? <span className="font-serif italic">"{randomIntention}"</span> : "Ofrecemos este misterio por nuestras intenciones...")
                    : currentStep?.type === 'reading'
                      ? <span className="font-serif text-base whitespace-pre-wrap">{currentMysteryData.content}</span>
                      : <div className="whitespace-pre-wrap">{PRAYERS_TEXT[currentStep?.type as keyof typeof PRAYERS_TEXT]}</div>
              }
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      
      {/* Navigation Globe (Bottom) */}
      {!touchNavEnabled && (
        <div
          ref={navRef}
          className={cn(
            "fixed z-50 flex items-center bg-background/80 shadow-lg border border-border/20 backdrop-blur-md",
            navBubbleClass,
            navPos ? "" : "bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
          )}
          style={navPos ? { left: navPos.x, top: navPos.y } : undefined}
        >
          {/* Drag Handle */}
          <div
            className="flex items-center px-1.5 select-none opacity-30 cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              event.preventDefault();
              const rect = navRef.current?.getBoundingClientRect();
              navDragStart.current = {
                x: event.clientX,
                y: event.clientY,
                startX: rect?.left ?? 0,
                startY: rect?.top ?? 0,
              };
              setIsDraggingNav(true);
            }}
            style={{ touchAction: 'none' }}
          >
            <div className="grid grid-cols-2 gap-0.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-foreground" />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn("hover:bg-foreground/5", navButtonClass)}
            onClick={handlePrev}
            disabled={
              !isSalveActive &&
              !isPostRosary &&
              (isPreRosary
                ? preStepIndex === 0
                : (currentMysteryIndex === 0 && currentStepIndex === 0 && preSteps.length === 0)
              )
            }
          >
            <ChevronLeft className={navIconClass} />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className={cn("hover:bg-foreground/5", navButtonClass)}
            onClick={handleNext}
          >
            <ChevronRight className={navIconClass} />
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/20">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}



