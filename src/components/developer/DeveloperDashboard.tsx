'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSettings, type UserStats } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import * as Icon from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { appVersion } from '@/lib/version';
import WrappedStory from '@/components/WrappedStory';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Quote, ImagePlaceholder } from '@/lib/types';
import { catholicQuotes } from '@/lib/quotes';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getImageObjectPosition } from '@/lib/image-display';
import { generateSaintsICS } from '@/lib/ics-generator';

// --- Schemas & Helpers ---

const quoteFormSchema = z.object({
    text: z.string().min(5, { message: 'El texto de la cita es requerido.' }),
    author: z.string().min(2, { message: 'El autor es requerido.' }),
});
type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const ColorPicker = ({
  label,
  color,
  onColorChange,
}: {
  label: string;
  color: { h: number; s: number };
  onColorChange: (newColor: { h: number; s: number }) => void;
}) => {
  const hexColor = useMemo(() => {
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    return hslToHex(color.h, color.s, 50);
  }, [color]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    onColorChange({ h: Math.round(h * 360), s: Math.round(s * 100) });
  };

  return (
    <div className="flex items-center justify-between">
      <Label className="text-slate-300">{label}</Label>
      <div className="relative">
        <Input
          type="color"
          value={hexColor}
          onChange={handleColorChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          className="w-10 h-6 rounded-md border border-slate-700"
          style={{ backgroundColor: hexColor }}
        />
      </div>
    </div>
  );
};

interface DeveloperDashboardProps {
  onBack: () => void;
}

export default function DeveloperDashboard({ onBack }: DeveloperDashboardProps) {
  const {
    resetSettings,
    hardResetApp,
    forceWrappedSeason,
    setForceWrappedSeason,
    showZeroStats,
    setShowZeroStats,
    realUserStats,
    simulatedStats,
    setSimulatedStats,
    globalUserStats,
    logoutDeveloper,
    // New additions
    simulatedDate,
    setSimulatedDate,
    userQuotes,
    addUserQuote,
    removeUserQuote,
    simulatedQuoteId,
    setSimulatedQuoteId,
    incrementStat,
    allPrayers,
    userHomeBackgrounds,
    isCustomThemeActive,
    setIsCustomThemeActive,
    activeThemeColors,
    setCustomThemeColor,
    resetCustomTheme
  } = useSettings();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWrappedPreview, setShowWrappedPreview] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Stats Editor State
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [tempStats, setTempStats] = useState<UserStats>(simulatedStats ?? realUserStats);

  // Content State
  const [selectedImage, setSelectedImage] = useState<ImagePlaceholder | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Forms
  const quoteForm = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { text: '', author: '' },
  });

  useEffect(() => {
    if (!isEditingStats) {
      setTempStats(simulatedStats ?? realUserStats);
    }
  }, [isEditingStats, simulatedStats, realUserStats]);

  const handleStatChange = (key: keyof UserStats, value: string) => {
    if (value === '') {
        setTempStats(prev => ({ ...prev, [key]: 0 }));
        return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setTempStats(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const saveStats = () => {
    setSimulatedStats(tempStats);
    setIsEditingStats(false);
    toast({ title: 'Estadísticas simuladas activas.' });
  };

  const revertStats = () => {
    setTempStats(realUserStats);
    toast({ title: 'Valores en editor revertidos a reales.' });
  };

  const restoreRealStats = () => {
    setSimulatedStats(null);
    setTempStats(realUserStats);
    toast({ title: 'Usando estadísticas reales.' });
  };

  const handleLogout = () => {
    logoutDeveloper();
    onBack();
    toast({ title: 'Sesión de desarrollador cerrada' });
  };

  const onQuoteSubmit: SubmitHandler<QuoteFormValues> = (data) => {
    addUserQuote(data);
    quoteForm.reset();
    toast({ title: 'Cita agregada' });
  };

  const handleExportCalendar = () => {
    try {
        const icsContent = generateSaintsICS();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'santoral_cotidie.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Calendario exportado correctamente' });
    } catch (error) {
        console.error(error);
        toast({ title: 'Error al exportar calendario', variant: 'destructive' });
    }
  };

  // Memos for Selectors
  const allQuotesForSelector = useMemo(() => {
    const quotes: Quote[] = [
      ...catholicQuotes.map((q, i) => ({...q, id: `cq_${i}`})), 
      ...userQuotes
    ];
    return quotes.map(q => ({
      value: q.id!,
      label: `"${q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text}" - ${q.author}`
    }));
  }, [userQuotes]);

  const allImagesForSelector = useMemo(() => {
    const imageMap = new Map<string, ImagePlaceholder>();

    PlaceHolderImages.forEach(img => {
      if(img.imageUrl) imageMap.set(img.imageUrl, img);
    });

    userHomeBackgrounds.forEach(img => {
      if(img.imageUrl) imageMap.set(img.imageUrl, img);
    });

    allPrayers.forEach(prayer => {
      if (prayer.imageUrl) {
        imageMap.set(prayer.imageUrl, {
          id: prayer.id || prayer.title,
          imageUrl: prayer.imageUrl,
          description: prayer.title,
          imageHint: prayer.imageHint
        });
      }
    });
    
    return Array.from(imageMap.values()).map(img => ({
      value: img.id,
      label: img.description
    }));
  }, [allPrayers, userHomeBackgrounds]);

  const handleImageSelection = (id: string | null) => {
    if (!id) {
      setSelectedImage(null);
      return;
    }
    const allImages = [...PlaceHolderImages, ...userHomeBackgrounds, ...allPrayers.filter(p => p.imageUrl).map(p => ({ id: p.id!, imageUrl: p.imageUrl!, description: p.title, imageHint: p.imageHint }))]
    const foundImage = allImages.find(img => img.id === id);
    setSelectedImage(foundImage || null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Icon.Menu className="size-5" />
          </Button>
          <div className="bg-green-500/10 p-2 rounded-md border border-green-500/20">
            <Icon.Terminal className="size-5 text-green-500" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Consola de Desarrollo</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block size-2 rounded-full bg-green-500 animate-pulse" />
              v{appVersion} • desarrollador
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-800 text-slate-400 hover:text-white">
          <Icon.X className="size-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Sidebar Navigation */}
        <div className={cn(
            "absolute inset-y-0 left-0 z-40 w-64 bg-slate-950/95 backdrop-blur border-r border-slate-800 transition-transform duration-300 md:relative md:translate-x-0 md:w-48 md:bg-slate-900/20 md:flex md:flex-col p-2 gap-1",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <NavButton 
            active={activeTab === 'overview'} 
            onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} 
            icon={Icon.Activity} 
            label="Resumen" 
          />
          <NavButton 
            active={activeTab === 'stats'} 
            onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }} 
            icon={Icon.Database} 
            label="Estadísticas" 
          />
          <NavButton 
            active={activeTab === 'content'} 
            onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }} 
            icon={Icon.Files} 
            label="Contenido" 
          />
          <NavButton 
            active={activeTab === 'tools'} 
            onClick={() => { setActiveTab('tools'); setIsSidebarOpen(false); }} 
            icon={Icon.Wrench} 
            label="Herramientas" 
          />
           <NavButton 
            active={activeTab === 'global'} 
            onClick={() => { setActiveTab('global'); setIsSidebarOpen(false); }} 
            icon={Icon.Globe} 
            label="Globales" 
          />
          <NavButton 
            active={activeTab === 'system'} 
            onClick={() => { setActiveTab('system'); setIsSidebarOpen(false); }} 
            icon={Icon.Cpu} 
            label="Sistema" 
          />
          <div className="mt-auto pt-2 border-t border-slate-800">
            <NavButton 
              active={false} 
              onClick={handleLogout} 
              icon={Icon.LogOut} 
              label="Salir" 
              variant="destructive"
            />
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
            <div 
                className="absolute inset-0 z-30 bg-black/50 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    title="Estado de Sesión" 
                    value={simulatedStats ? "SIMULADO" : "EN VIVO"} 
                    icon={Icon.Radio}
                    color={simulatedStats ? "text-yellow-500" : "text-green-500"}
                  />
                  <StatCard 
                    title="Oraciones Totales" 
                    value={realUserStats.totalPrayersOpened} 
                    icon={Icon.BookOpen}
                  />
                  <StatCard 
                    title="Racha de Misa" 
                    value={realUserStats.massStreak || 0} 
                    icon={Icon.Flame}
                  />
                </div>

                <Card className="bg-slate-900 border-slate-800 text-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon.Settings className="size-4" /> Ajustes Rápidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Forzar Temporada Wrapped</Label>
                        <p className="text-xs text-slate-400">Habilita la burbuja de resumen de fin de año.</p>
                      </div>
                      <Switch checked={forceWrappedSeason} onCheckedChange={setForceWrappedSeason} />
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Mostrar Estadísticas en Cero</Label>
                        <p className="text-xs text-slate-400">Muestra contadores vacíos en Annuum.</p>
                      </div>
                      <Switch checked={showZeroStats} onCheckedChange={setShowZeroStats} />
                    </div>
                  </CardContent>
                </Card>
                
                <Button 
                   className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                   onClick={() => setShowWrappedPreview(true)}
                >
                    <Icon.Play className="mr-2 size-4" /> Iniciar Vista Previa Wrapped
                </Button>
              </div>
            )}

            {activeTab === 'stats' && (
               <Card className="bg-slate-900 border-slate-800 text-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Estadísticas del Año Actual</CardTitle>
                        <CardDescription className="text-slate-400">
                            Modificar estos valores activará el Modo Simulación.
                        </CardDescription>
                     </div>
                     <div className="flex gap-2">
                        {simulatedStats && (
                            <Button variant="outline" size="sm" onClick={restoreRealStats} className="border-slate-700 hover:bg-slate-800">
                                <Icon.RotateCcw className="mr-2 size-3" /> Restaurar Reales
                            </Button>
                        )}
                        <Button 
                            variant={isEditingStats ? "destructive" : "secondary"} 
                            size="sm"
                            onClick={() => setIsEditingStats(!isEditingStats)}
                        >
                            {isEditingStats ? "Cancelar" : "Editar"}
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(['daysActive', 'massStreak', 'massDaysCount', 'morningDaysCount', 'nightDaysCount', 'totalPrayersOpened', 'rosaryCount', 'angelusCount', 'examinationCount', 'saintQuotesOpened', 'lettersWritten', 'devotionsCreated', 'prayersCreated'] as const).map(key => {
                            const labels: Record<string, string> = {
                                daysActive: 'Días Activo (App)',
                                massStreak: 'Racha de Misa',
                                massDaysCount: 'Días Totales Misa',
                                morningDaysCount: 'Días Oración Mañana',
                                nightDaysCount: 'Días Oración Noche',
                                totalPrayersOpened: 'Oraciones Abiertas',
                                rosaryCount: 'Rosarios',
                                angelusCount: 'Angelus',
                                examinationCount: 'Examen Conciencia',
                                saintQuotesOpened: 'Citas Santos',
                                lettersWritten: 'Cartas Escritas',
                                devotionsCreated: 'Devociones Creadas',
                                prayersCreated: 'Oraciones Creadas'
                            };
                            return (
                            <div key={key} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                                <Label className="text-xs font-mono text-slate-400">{labels[key] || key}</Label>
                                {isEditingStats ? (
                                    <Input 
                                        type="number" 
                                        className="h-6 w-24 text-right font-mono text-xs bg-slate-900 border-slate-700"
                                        value={tempStats[key] as number}
                                        onChange={(e) => handleStatChange(key, e.target.value)}
                                    />
                                ) : (
                                    <div className="text-right">
                                        <span className={cn("font-mono font-bold block", simulatedStats ? "text-yellow-500" : "text-slate-200")}>
                                            {(simulatedStats ?? realUserStats)[key]}
                                        </span>
                                        {key === 'daysActive' && (
                                            <span className="text-[10px] text-slate-500 block">
                                                No usada: {Math.max(0, Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)) - ((simulatedStats ?? realUserStats).daysActive || 0))} días
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                      </div>
                      {isEditingStats && (
                          <div className="mt-4 flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={revertStats}>Reiniciar Formulario</Button>
                              <Button size="sm" onClick={saveStats} className="bg-green-600 hover:bg-green-700 text-white">Aplicar Simulación</Button>
                          </div>
                      )}
                  </CardContent>
               </Card>
            )}

            {activeTab === 'content' && (
               <div className="space-y-6">
                 {/* Quotes Manager */}
                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>Gestión de Citas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className='space-y-2'>
                            <Label>Forzar Frase del Día</Label>
                             <div className="flex gap-2">
                                <div className="flex-1">
                                    <Combobox
                                        items={allQuotesForSelector}
                                        value={simulatedQuoteId}
                                        onSelect={(value) => {
                                            setSimulatedQuoteId(value);
                                            if (value) incrementStat('saintQuotesOpened');
                                        }}
                                        placeholder="Seleccionar frase..."
                                        searchPlaceholder="Buscar frase..."
                                        noResultsText="No se encontró la frase."
                                    />
                                </div>
                                <Button onClick={() => setSimulatedQuoteId(null)} variant="outline" size="sm" className="border-slate-700">
                                    <Icon.RotateCcw className="size-4" />
                                </Button>
                             </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        <Form {...quoteForm}>
                            <form onSubmit={quoteForm.handleSubmit(onQuoteSubmit)} className="space-y-4 p-4 border border-slate-800 rounded-lg bg-slate-950/50">
                            <h4 className="font-medium text-sm text-slate-400">Agregar Nueva Cita</h4>
                            <FormField
                                control={quoteForm.control}
                                name="text"
                                render={({ field }) => (
                                <FormItem>
                                    <Label className="text-xs">Texto</Label>
                                    <FormControl>
                                    <Textarea 
                                        placeholder="El amor es la única fuerza..." 
                                        {...field} 
                                        className="bg-slate-900 border-slate-700 resize-none"
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={quoteForm.control}
                                name="author"
                                render={({ field }) => (
                                <FormItem>
                                    <Label className="text-xs">Autor</Label>
                                    <FormControl>
                                    <Input 
                                        placeholder="San Juan Pablo II" 
                                        {...field} 
                                        className="bg-slate-900 border-slate-700"
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" size="sm" className="w-full bg-slate-800 hover:bg-slate-700">
                                <Icon.PlusCircle className="mr-2 size-4" />
                                Agregar Cita
                            </Button>
                            </form>
                        </Form>

                        {userQuotes.length > 0 && (
                            <div className="space-y-2">
                            <h4 className="font-medium text-sm text-slate-400">Citas Personales</h4>
                            <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border border-slate-800 p-2 bg-slate-950">
                                {userQuotes.map(quote => (
                                <div key={quote.id} className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded-md border border-slate-800">
                                    <span className="truncate pr-2 text-slate-300">"{quote.text.substring(0, 25)}..."</span>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                    onClick={() => removeUserQuote(quote.id!)}
                                    >
                                    <Icon.Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                ))}
                            </div>
                            </div>
                        )}
                    </CardContent>
                 </Card>

                 {/* Image Viewer */}
                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>Visor de Imágenes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className='space-y-2'>
                            <Label>Explorador de Recursos</Label>
                            <Combobox
                                items={allImagesForSelector}
                                value={selectedImage?.id || null}
                                onSelect={handleImageSelection}
                                placeholder="Seleccionar imagen..."
                                searchPlaceholder="Buscar imagen..."
                                noResultsText="No se encontró la imagen."
                            />
                            {selectedImage && (
                            <div className="space-y-2 mt-4">
                                <div className="relative w-full h-56 rounded-md overflow-hidden border border-slate-800 bg-black">
                                <Image
                                    src={selectedImage.imageUrl}
                                    alt={selectedImage.description || 'Imagen seleccionada'}
                                    fill
                                    className="object-cover"
                                    style={{ objectPosition: getImageObjectPosition(selectedImage.id) }}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority={false}
                                />
                                </div>
                                <div className="flex justify-between items-center">
                                    <code className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[200px]">
                                        {selectedImage.imageUrl.substring(0, 30)}...
                                    </code>
                                    <Button size="sm" variant="outline" onClick={() => setIsImageViewerOpen(true)} className="border-slate-700">
                                        Pantalla completa
                                    </Button>
                                </div>
                            </div>
                            )}
                        </div>
                    </CardContent>
                 </Card>

                 {/* Calendar Export */}
                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>Calendario Litúrgico</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label className="text-slate-400">Exportación de Datos</Label>
                        <Button 
                            onClick={handleExportCalendar} 
                            variant="outline" 
                            className="w-full justify-start border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                            <Icon.Download className="mr-2 h-4 w-4" />
                            Descargar Santoral para Google Calendar (.ics)
                        </Button>
                        <p className="text-xs text-slate-500">
                            Genera un archivo ICS con todos los santos fijos del año. Importable en Google Calendar, Outlook, etc.
                        </p>
                    </CardContent>
                 </Card>
               </div> 
            )}

            {activeTab === 'tools' && (
                <div className="space-y-6">
                    {/* Date Simulator */}
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon.Calendar className="size-5" /> Herramientas de Calendario
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-slate-400">Simulador de Fecha</Label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 hover:text-white",
                                                !simulatedDate && "text-muted-foreground"
                                            )}
                                            >
                                            <Icon.Calendar className="mr-2 h-4 w-4" />
                                            {simulatedDate ? format(new Date(simulatedDate), "PPP", { locale: es }) : <span>Seleccionar fecha...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-200">
                                            <Calendar
                                            mode="single"
                                            selected={simulatedDate ? new Date(simulatedDate) : undefined}
                                            onSelect={(date) => setSimulatedDate(date?.toISOString() ?? null)}
                                            locale={es}
                                            weekStartsOn={1}
                                            initialFocus
                                            className="bg-slate-950"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Button 
                                        onClick={() => setSimulatedDate(null)} 
                                        variant="secondary" 
                                        className="bg-slate-800 text-slate-300 hover:bg-slate-700"
                                        disabled={!simulatedDate}
                                    >
                                        Restablecer Hoy
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">Altera la fecha percibida para el "Santo del Día" y liturgias.</p>
                            </div>

                            <Separator className="bg-slate-800" />

                            {/* Removed export button from here */}
                        </CardContent>
                    </Card>

                    {/* Theme Editor */}
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon.Palette className="size-5" /> Editor de Tema
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Personaliza los colores de la aplicación en tiempo real.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <Label htmlFor="custom-theme-switch" className="flex flex-col gap-1">
                                    <span>Activar Tema Personalizado</span>
                                    <span className="text-xs font-normal text-slate-500">Sobrescribe el tema automático.</span>
                                </Label>
                                <Switch
                                    id="custom-theme-switch"
                                    checked={isCustomThemeActive}
                                    onCheckedChange={setIsCustomThemeActive}
                                />
                            </div>
                            
                            <div className={cn("space-y-4 p-4 border border-slate-800 rounded-lg bg-slate-950/50 transition-opacity", !isCustomThemeActive && "opacity-50 pointer-events-none")}>
                                <ColorPicker 
                                    label="Principal (Primary)"
                                    color={activeThemeColors.primary}
                                    onColorChange={(newColor) => setCustomThemeColor('primary', newColor)}
                                />
                                <ColorPicker 
                                    label="Fondo (Background)"
                                    color={activeThemeColors.background}
                                    onColorChange={(newColor) => setCustomThemeColor('background', newColor)}
                                />
                                <ColorPicker 
                                    label="Acento (Accent)"
                                    color={activeThemeColors.accent}
                                    onColorChange={(newColor) => setCustomThemeColor('accent', newColor)}
                                />
                                <Button onClick={resetCustomTheme} variant="outline" size="sm" className="w-full mt-2 border-slate-700 hover:bg-slate-800">
                                    Restablecer Colores
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'global' && (
                <Card className="bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>Estadísticas Globales Históricas</CardTitle>
                        <CardDescription className="text-slate-400">
                            Datos agregados desde la instalación (o migración). Solo lectura.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                             <StatCard 
                                title="Oraciones Históricas" 
                                value={globalUserStats.totalPrayersOpened} 
                                icon={Icon.Globe}
                                className="bg-slate-950"
                              />
                             <StatCard 
                                title="Días Históricos" 
                                value={globalUserStats.daysActive} 
                                icon={Icon.Calendar}
                                className="bg-slate-950"
                              />
                              <StatCard 
                                title="Mejor Racha Misa" 
                                value={globalUserStats.massStreak || 0} 
                                icon={Icon.Trophy}
                                className="bg-slate-950"
                              />
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'system' && (
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader>
                            <CardTitle>Zona de Peligro</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 border border-red-900/50 bg-red-950/10 rounded-lg">
                                <div>
                                    <div className="font-bold text-red-400">Restablecer Ajustes</div>
                                    <div className="text-xs text-red-400/70">Restaura la configuración predeterminada. Mantiene datos.</div>
                                </div>
                                <Button variant="destructive" size="sm" onClick={resetSettings}>Restablecer</Button>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 border border-red-900/50 bg-red-950/10 rounded-lg">
                                <div>
                                    <div className="font-bold text-red-400">Reinicio Completo de App</div>
                                    <div className="text-xs text-red-400/70">Borra TODOS los datos y ajustes. Irreversible.</div>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => {
                                    if(confirm("¿ESTÁS SEGURO? Esto borrará todo.")) hardResetApp();
                                }}>ELIMINAR TODO</Button>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader>
                            <CardTitle>Entorno</CardTitle>
                        </CardHeader>
                        <CardContent className="font-mono text-xs space-y-2 text-slate-400">
                            <p>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
                            <p>Pantalla: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</p>
                            <p>Pixel Ratio: {typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'}</p>
                            <p>Hora: {new Date().toISOString()}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
            
          </div>
        </div>
      </div>
      
      {showWrappedPreview && (
         <div className="fixed inset-0 z-50 bg-black">
             <Button 
                className="absolute top-4 right-4 z-50 bg-white text-black hover:bg-gray-200" 
                onClick={() => setShowWrappedPreview(false)}
             >
                Salir de Vista Previa
             </Button>
             <WrappedStory onClose={() => setShowWrappedPreview(false)} />
         </div>
      )}

      {selectedImage && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="w-screen h-screen max-w-none p-0 bg-transparent border-none">
            <DialogTitle className="sr-only">Visor de imagen</DialogTitle>
            <div className="relative w-screen h-screen">
              <Image
                src={selectedImage.imageUrl}
                alt={selectedImage.description || 'Imagen seleccionada'}
                fill
                className="object-contain bg-black"
                style={{ objectPosition: getImageObjectPosition(selectedImage.id) }}
                sizes="100vw"
                priority
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, variant = 'default' }: { active: boolean, onClick: () => void, icon: any, label: string, variant?: 'default' | 'destructive' }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-md text-sm transition-colors w-full text-left", // Increased padding (py-4) and px-4
                variant === 'destructive' 
                    ? "text-red-400 hover:bg-red-950/30" 
                    : active 
                        ? "bg-slate-800 text-white font-medium" 
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
        >
            <Icon className="size-5" /> {/* Increased icon size */}
            <span className="text-base">{label}</span> {/* Increased text size */}
        </button>
    )
}

function StatCard({ title, value, icon: Icon, color, className }: { title: string, value: string | number, icon: any, color?: string, className?: string }) {
    return (
        <Card className={cn("bg-slate-900 border-slate-800", className)}>
            <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("p-3 rounded-full bg-slate-950 border border-slate-800", color || "text-slate-400")}>
                    <Icon className="size-6" />
                </div>
                <div>
                    <div className="text-sm text-slate-500 font-medium">{title}</div>
                    <div className={cn("text-2xl font-bold tracking-tight text-slate-200")}>{value}</div>
                </div>
            </CardContent>
        </Card>
    )
}
