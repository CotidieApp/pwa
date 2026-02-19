'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Settings2, Image as ImageIcon, Calendar, Pencil, BookOpen, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { santoRosario } from '@/lib/prayers/plan-de-vida/santo-rosario';
import { letanias as letaniasData } from '@/lib/prayers/plan-de-vida/santo-rosario/letanias';
import { renderText } from '@/lib/textFormatter';

// Standard Rosary Sequence per Mystery
const ROSARY_SEQUENCE = [
  { type: 'reading', label: 'Meditación' },
  { type: 'intro', label: 'Intención' },
  { type: 'padre_nuestro', label: 'Padre Nuestro', count: 1 },
  { type: 'ave_maria', label: 'Ave María', count: 10 },
  { type: 'gloria', label: 'Gloria', count: 1 },
  { type: 'jaculatoria', label: 'Jaculatoria', count: 1 },
];

const PRAYERS_TEXT = {
  padre_nuestro: `Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.`,
  ave_maria: `Dios te salve, María, llena eres de gracia; el Señor es contigo; bendita Tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.`,
  gloria: `Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.`,
  jaculatoria: `Â¡Oh Jesús mío! Perdona nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.`,
  start: `Ofrecemos este misterio por...`,
};

type Jaculatoria = { v: string; r: string };

const DEFAULT_JACULATORIAS: Jaculatoria[] = [
  { v: 'Sagrado Corazón de Jesús', r: 'En vos confío' },
  { v: 'Dulce e inmaculado Corazón de María', r: 'Sé la salvación nuestra' },
  { v: 'San José y todos los santos', r: 'Rueguen por nosotros' },
  { v: 'Santa María, Esperanza nuestra, Asiento de la Sabiduría', r: 'Ruega por nosotros' },
];

const ADORACION_SANTISIMO_TEXT_1 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const ADORACION_SANTISIMO_TEXT_2 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const ADORACION_SANTISIMO_TEXT_3 = `Bendito sea Jesús en el Santísimo Sacramento.

${PRAYERS_TEXT.padre_nuestro}

${PRAYERS_TEXT.ave_maria}

${PRAYERS_TEXT.gloria}`;

const COMUNION_ESPIRITUAL_TEXT = `*Comunión espiritual*
Yo quisiera, Señor, recibiros con aquella pureza, humildad y devoción con que os recibió vuestra Santísima Madre, con el espíritu y fervor de los santos.`;

const SENAL_DE_LA_CRUZ_TEXT = `Por la señal de la Santa Cruz, de nuestros enemigos, líbranos, Señor, Dios nuestro. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.`;

const ACTO_CONTRICION_TEXT = `Señor mío Jesucristo, Dios y hombre verdadero, Creador, Padre y Redentor mío; por ser Tú quien eres, bondad infinita, y porque te amo sobre todas las cosas, me pesa de todo corazón haberte ofendido. También me pesa porque puedes castigarme con las penas del infierno. Ayudado de tu divina gracia, propongo firmemente nunca más pecar, confesarme y cumplir la penitencia que me fuere impuesta. Amén.`;

const SALVE_TEXT = `Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A Ti llamamos los desterrados hijos de Eva; a Ti suspiramos, gimiendo y llorando, en este valle de lágrimas. Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro muéstranos a Jesús, fruto bendito de tu vientre. Â¡Oh clementísima, oh piadosa, oh dulce Virgen María! Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de Nuestro Señor Jesucristo. Amén.`;

const INVOCACIONES_INICIALES_TEXT = `**V.** Abre, Señor, mis labios.
**R.** Y mi boca proclamará tu alabanza.

**V.** Dios mí­o, ven en mi auxilio.
**R.** Señor, date prisa en socorrerme.

Gloria al Padre, y al Hijo, y al Espí­ritu Santo.
Como era en el principio, ahora y siempre,
por los siglos de los siglos. Amén.`;

const PRE_ROSARY_STEPS = [
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_1 },
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_2 },
  { type: 'adoracion', label: 'Adoración', content: ADORACION_SANTISIMO_TEXT_3 },
  { type: 'comunion', label: 'Comunión Espiritual', content: COMUNION_ESPIRITUAL_TEXT },
  { type: 'senal_cruz', label: 'Señal de la Cruz', content: SENAL_DE_LA_CRUZ_TEXT },
  { type: 'acto_contricion', label: 'Acto de contrición', content: ACTO_CONTRICION_TEXT },
  { type: 'invocaciones', label: 'Invocaciones', content: INVOCACIONES_INICIALES_TEXT },
];

type MysteryType = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';

const MYSTERY_COLORS: Record<MysteryType, string> = {
  gozosos: 'from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950',
  luminosos: 'from-yellow-100 to-amber-100 dark:from-yellow-950 dark:to-amber-950',
  dolorosos: 'from-rose-100 to-red-100 dark:from-rose-950 dark:to-red-950',
  gloriosos: 'from-sky-100 to-blue-100 dark:from-sky-950 dark:to-blue-950',
};

const MYSTERY_IMAGES: Record<MysteryType, string> = {
  gozosos: '/images/nativity.jpeg',
  luminosos: '/images/eucharist.jpeg',
  dolorosos: '/images/crucifixion.jpeg',
  gloriosos: '/images/resurrection.jpeg',
};

// Placeholder for user-defined or specific mystery images
// Format: 'type-index' (e.g. 'gozoso-1') -> url
const MYSTERY_SPECIFIC_IMAGES: Record<string, string> = {
  // Misterios Gozosos
  'gozoso-1': '/images/rosario/gozoso-1.jpg',
  'gozoso-2': '/images/rosario/gozoso-2.jpg',
  'gozoso-3': '/images/rosario/gozoso-3.jpg',
  'gozoso-4': '/images/rosario/gozoso-4.jpg',
  'gozoso-5': '/images/rosario/gozoso-5.jpg',
  // Misterios Luminosos
  'luminoso-1': '/images/rosario/luminoso-1.jpg',
  'luminoso-2': '/images/rosario/luminoso-2.jpg',
  'luminoso-3': '/images/rosario/luminoso-3.jpg',
  'luminoso-4': '/images/rosario/luminoso-4.jpg',
  'luminoso-5': '/images/rosario/luminoso-5.jpg',
  // Misterios Dolorosos
  'doloroso-1': '/images/rosario/doloroso-1.jpg',
  'doloroso-2': '/images/rosario/doloroso-2.jpg',
  'doloroso-3': '/images/rosario/doloroso-3.jpg',
  'doloroso-4': '/images/rosario/doloroso-4.jpg',
  'doloroso-5': '/images/rosario/doloroso-5.jpg',
  // Misterios Gloriosos
  'glorioso-1': '/images/rosario/glorioso-1.jpg',
  'glorioso-2': '/images/rosario/glorioso-2.jpg',
  'glorioso-3': '/images/rosario/glorioso-3.jpg',
  'glorioso-4': '/images/rosario/glorioso-4.jpg',
  'glorioso-5': '/images/rosario/glorioso-5.jpg',
};

const MYSTERY_NAMES: Record<MysteryType, string> = {
  gozosos: 'Misterios Gozosos',
  luminosos: 'Misterios Luminosos',
  dolorosos: 'Misterios Dolorosos',
  gloriosos: 'Misterios Gloriosos',
};

const FULL_MYSTERY_TITLES: Record<string, string> = {
  'gozoso-1': 'La Encarnación del Hijo de Dios',
  'gozoso-2': 'La Visitación de la Virgen María a su prima Santa Isabel',
  'gozoso-3': 'El Nacimiento del Hijo de Dios en Belén',
  'gozoso-4': 'La Presentación del Señor en el Templo',
  'gozoso-5': 'El Niño Jesús perdido y hallado en el Templo',
  'luminoso-1': 'El Bautismo del Señor en el Jordán',
  'luminoso-2': 'Las Autorrevelación en las bodas de Caná',
  'luminoso-3': 'El Anuncio del Reino de Dios y la invitación a la conversión',
  'luminoso-4': 'La Transfiguración del Señor',
  'luminoso-5': 'La Institución de la Eucaristía',
  'doloroso-1': 'La Oración de Jesús en el Huerto',
  'doloroso-2': 'La Flagelación del Señor',
  'doloroso-3': 'La Coronación de espinas',
  'doloroso-4': 'Jesús con la Cruz a cuestas',
  'doloroso-5': 'La Crucifixión y Muerte del Señor',
  'glorioso-1': 'La Resurrección del Señor',
  'glorioso-2': 'La Ascensión del Señor',
  'glorioso-3': 'La Venida del Espíritu Santo',
  'glorioso-4': 'La Asunción de la Virgen María',
  'glorioso-5': 'La Coronación de la Virgen María',
};

const getMysteryByDay = (): MysteryType => {
  const day = new Date().getDay();
  switch (day) {
    case 1: return 'gozosos'; // Lunes
    case 2: return 'dolorosos'; // Martes
    case 3: return 'gloriosos'; // Miércoles
    case 4: return 'luminosos'; // Jueves
    case 5: return 'dolorosos'; // Viernes
    case 6: return 'gozosos'; // Sábado
    case 0: return 'gloriosos'; // Domingo
    default: return 'gozosos';
  }
};

type ImmersiveRosaryProps = {
  mysteryTitle?: string;
  mysteryGroup?: string;
  mysteryContent?: string;
  onClose: (targetId?: string) => void;
  onSwitchToMeditated?: () => void;
};

const JACULATORIAS_STORAGE_KEY = 'rosary_jaculatorias';

export default function RosaryImmersive({
  onClose,
  onSwitchToMeditated,
  mysteryTitle: initialTitle,
  mysteryGroup: initialGroup,
  mysteryContent: initialContent,
}: ImmersiveRosaryProps) {
  const { isDistractionFree, theme, arrowBubbleSize } = useSettings();

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
  const [selectedMysteryType, setSelectedMysteryType] = useState<MysteryType>('gozosos');
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
        // onClose(); // Never close automatically
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

  // --- SELECTION VIEW ---
  if (mode === 'selection') {
    return (
      <div className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur-sm",
        isDark ? "text-white" : "text-zinc-900"
      )}>
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 mt-[env(safe-area-inset-top)]" onClick={() => onClose()}>
            <X />
        </Button>
        
        <div className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] flex gap-2">
            {onSwitchToMeditated && (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={onSwitchToMeditated}
                >
                    <BookOpen className="size-4" />
                    Leer
                </Button>
            )}
            <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setSelectedMysteryType(getMysteryByDay())}
            >
                <Calendar className="size-4" />
                Día: {MYSTERY_NAMES[getMysteryByDay()].replace('Misterios ', '')}
            </Button>
        </div>

        <h2 className="text-2xl font-bold mb-8">Selecciona los Misterios</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
            {(['gozosos', 'luminosos', 'dolorosos', 'gloriosos'] as const).map((type) => (
                <div key={type} className="flex flex-col gap-2">
                    <Button
                        variant={selectedMysteryType === type ? 'default' : 'outline'}
                        className={cn(
                            "h-24 text-lg font-serif flex flex-col gap-1",
                            selectedMysteryType === type && "ring-2 ring-offset-2"
                        )}
                        onClick={() => {
                            setSelectedMysteryType(type);
                            setMode('prayer');
                            setIsPreRosary(true);
                            setPreStepIndex(0);
                            setIsPostRosary(false);
                            setPostStepIndex(0);
                            setCurrentMysteryIndex(0);
                            setCurrentStepIndex(0);
                        }}
                    >
                        <span>{MYSTERY_NAMES[type]}</span>
                    </Button>
                </div>
            ))}
        </div>
        
        <div className="mt-8 flex flex-col gap-3 items-center">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={handleJumpToLitanies}
            >
                Ir directamente a Letanías
            </Button>
        </div>
      </div>
    );
  }

  // --- PRAYER VIEW ---
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-between pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] overflow-hidden",
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
                        backgroundPosition: `${mysteryProgress}% center`
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
            
            <div className="flex flex-col items-center text-center max-w-[50%]">
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
                 <span className="text-xs font-semibold opacity-70 mb-0.5">{headerGroupLabel}</span>
                 
                 {/* Mystery Name (Medium) */}
                 <h2 className="text-sm font-bold leading-tight px-2 line-clamp-2">{headerTitle}</h2>
            </div>

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

        {/* Intentions Menu Overlay */}
        <AnimatePresence>
            {showIntentionsMenu && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-16 left-4 right-4 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-2xl p-4 z-50 max-w-sm mx-auto"
                >
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold">Mis Intenciones</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowIntentionsMenu(false)}><X className="size-4" /></Button>
                    </div>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={newIntention}
                            onChange={(e) => setNewIntention(e.target.value)}
                            placeholder="Nueva intención..."
                            className="flex-1 bg-background border rounded px-3 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && addIntention()}
                        />
                        <Button size="sm" onClick={addIntention}><Plus className="size-4" /></Button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {intentions.map((int, i) => (
                            <div key={i} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded group">
                                <span className="truncate flex-1 font-medium">{int}</span>
                                <button onClick={() => removeIntention(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                            </div>
                        ))}
                        {intentions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Agrega intenciones para ofrecerlas durante el rosario.</p>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Jaculatorias Menu Overlay */}
        <AnimatePresence>
            {showJaculatoriasMenu && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-16 left-4 right-4 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-2xl p-4 z-50 max-w-md mx-auto"
                >
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold">Jaculatorias</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowJaculatoriasMenu(false)}><X className="size-4" /></Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4">
                        <input 
                            value={newJaculatoria.v}
                            onChange={(e) => setNewJaculatoria((prev) => ({ ...prev, v: e.target.value }))}
                            placeholder="V. ..."
                            className="w-full bg-background border rounded px-3 py-2 text-sm"
                        />
                        <input 
                            value={newJaculatoria.r}
                            onChange={(e) => setNewJaculatoria((prev) => ({ ...prev, r: e.target.value }))}
                            placeholder="F. ..."
                            className="w-full bg-background border rounded px-3 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && addJaculatoria()}
                        />
                        <Button size="sm" onClick={addJaculatoria}><Plus className="size-4" /></Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                        {jaculatorias.map((item, i) => (
                            <div key={i} className="space-y-2 bg-muted/50 p-2 rounded">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={item.v}
                                        onChange={(e) => updateJaculatoria(i, 'v', e.target.value)}
                                        placeholder="V. ..."
                                        className="flex-1 bg-background border rounded px-3 py-2 text-sm"
                                    />
                                    <button
                                        onClick={() => removeJaculatoria(i)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                                <input
                                    value={item.r}
                                    onChange={(e) => updateJaculatoria(i, 'r', e.target.value)}
                                    placeholder="F. ..."
                                    className="w-full bg-background border rounded px-3 py-2 text-sm"
                                />
                            </div>
                        ))}
                        {jaculatorias.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Agrega jaculatorias para el cierre del rosario.</p>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

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
                    <div className={cn(
                        "text-8xl sm:text-9xl font-black mb-8 select-none transition-colors duration-500",
                        currentStep?.type === 'ave_maria' ? "text-primary" : "text-foreground/20"
                    )}>
                        {isPreRosaryActive
                          ? currentPreStep?.type === 'adoracion'
                            ? 'ðŸ•¯ï¸'
                            : currentPreStep?.type === 'senal_cruz'
                            ? 'âœï¸'
                            : 'ðŸ™'
                          : isPostRosaryActive
                          ? currentPostStep?.type === 'letanias'
                            ? 'ðŸ“œ'
                            : currentPostStep?.type === 'salve'
                            ? 'ðŸ‘‘'
                            : 'ðŸ•Šï¸'
                          : currentStep?.type === 'ave_maria'
                          ? `#${currentStep.index}`
                          : currentStep?.type === 'gloria'
                          ? 'â€ '
                          : currentStep?.type === 'intro'
                          ? 'ðŸ™'
                          : currentStep?.type === 'reading'
                          ? 'ðŸ“–'
                          : currentStep?.type === 'jaculatoria'
                          ? 'ðŸ•Šï¸'
                          : currentStep?.type === 'padre_nuestro'
                          ? 'âœï¸'
                          : ''}
                    </div>

                    {/* Prayer Text (Below Center) */}
                    <h3 className="text-xl font-bold mb-4">
                      {isPreRosaryActive
                        ? currentPreStep?.label
                        : isPostRosaryActive
                        ? currentPostStep?.label
                        : currentStep?.label}
                    </h3>
                    
                    <div className="text-lg sm:text-xl opacity-90 leading-relaxed max-h-[35vh] overflow-y-auto px-4 scrollbar-hide w-full">
                        {isPreRosaryActive
                          ? <div className="whitespace-pre-wrap">{currentPreStep?.content}</div>
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


