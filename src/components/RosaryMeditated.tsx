'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { santoRosario } from '@/lib/prayers/plan-de-vida/santo-rosario';

type MysteryType = 'gozosos' | 'luminosos' | 'dolorosos' | 'gloriosos';

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

const MYSTERY_IMAGES: Record<MysteryType, string> = {
  gozosos: '/images/nativity.jpeg',
  luminosos: '/images/eucharist.jpeg',
  dolorosos: '/images/crucifixion.jpeg',
  gloriosos: '/images/resurrection.jpeg',
};

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

type MeditatedRosaryProps = {
  onClose: () => void;
  onSwitchToImmersive: () => void;
};

export default function RosaryMeditated({ onClose, onSwitchToImmersive }: MeditatedRosaryProps) {
  const { theme, isDistractionFree } = useSettings();
  const isDark = theme === 'dark' || isDistractionFree;
  
  const [selectedMysteryType, setSelectedMysteryType] = useState<MysteryType>(getMysteryByDay());
  const [selectedMeditationIndex, setSelectedMeditationIndex] = useState<number | null>(null);

  const getMysteryImage = useCallback((type: MysteryType, index: number) => {
      const typeShort = type.endsWith('s') ? type.slice(0, -1) : type; // gozosos -> gozoso
      const specificKey = `${typeShort}-${index + 1}`;
      return MYSTERY_SPECIFIC_IMAGES[specificKey] || MYSTERY_IMAGES[type];
  }, []);

  const selectedMysteryGroup = santoRosario.prayers?.find(p => p.id === `misterios-${selectedMysteryType}`);
  const selectedMeditation = selectedMeditationIndex !== null ? selectedMysteryGroup?.prayers?.[selectedMeditationIndex] : null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
      isDark ? "text-white" : "text-zinc-900"
    )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background z-10 shrink-0">
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => {
                    if (selectedMeditationIndex !== null) {
                        setSelectedMeditationIndex(null);
                    } else {
                        onClose();
                    }
                }}>
                    <ChevronLeft className="size-6" />
                </Button>
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold truncate">
                        {selectedMeditationIndex !== null ? 'Meditación' : 'Santo Rosario'}
                    </h2>
                    {selectedMeditationIndex === null && (
                        <p className="text-xs text-muted-foreground">{MYSTERY_NAMES[selectedMysteryType]}</p>
                    )}
                </div>
             </div>
             <div className="flex gap-2">
                 {/* Only show toggle when in list view */}
                 {selectedMeditationIndex === null && (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onSwitchToImmersive}
                        className="text-xs h-8"
                     >
                         Rezar
                     </Button>
                 )}
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    title="Cerrar"
                 >
                     <X className="size-6" />
                 </Button>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {selectedMeditationIndex === null ? (
                <div className="space-y-6 max-w-2xl mx-auto pb-8">
                    {/* Mystery Type Selector */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {(['gozosos', 'luminosos', 'dolorosos', 'gloriosos'] as const).map((type) => (
                            <Button
                                key={type}
                                variant={selectedMysteryType === type ? 'default' : 'outline'}
                                className={cn(
                                    "h-auto py-2 text-sm",
                                    selectedMysteryType === type && "ring-2 ring-offset-1"
                                )}
                                onClick={() => setSelectedMysteryType(type)}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Button>
                        ))}
                    </div>

                    {/* List of mysteries */}
                    <div className="space-y-3">
                        {selectedMysteryGroup?.prayers?.map((m, i) => (
                            <div 
                                key={m.id}
                                className="p-4 rounded-xl border border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-4"
                                onClick={() => setSelectedMeditationIndex(i)}
                            >
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-primary mb-1">
                                        {['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'][i]} Misterio
                                    </div>
                                    <h3 className="text-lg font-serif leading-tight">
                                        {FULL_MYSTERY_TITLES[m.id || '']}
                                    </h3>
                                </div>
                                <ChevronRight className="size-5 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-8">
                    {/* Meditation Detail */}
                    <div className="w-full h-48 sm:h-64 rounded-xl bg-cover bg-top mb-6 shadow-md"
                         style={{ backgroundImage: `url(${getMysteryImage(selectedMysteryType, selectedMeditationIndex)})` }}
                    />
                    
                    <h3 className="text-2xl font-bold mb-2 text-center">
                        {FULL_MYSTERY_TITLES[selectedMeditation?.id || '']}
                    </h3>
                    
                    <div className="h-1 w-20 bg-primary/20 mx-auto mb-6 rounded-full" />

                    <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed">
                        <p className="whitespace-pre-wrap">
                            {typeof selectedMeditation?.content === 'string' ? selectedMeditation.content : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
