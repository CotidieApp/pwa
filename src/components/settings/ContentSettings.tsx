'use client';

import React, { useMemo, useRef, useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Prayer, Quote, ImagePlaceholder } from '@/lib/types';
import { catholicQuotes } from '@/lib/quotes';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getImageObjectPosition } from '@/lib/image-display';
import { generateSaintsICS } from '@/lib/ics-generator';
import { isWrappedSeason } from '@/lib/movable-feasts';

const quoteFormSchema = z.object({
    text: z.string().min(5, { message: 'El texto de la cita es requerido.' }),
    author: z.string().min(2, { message: 'El autor es requerido.' }),
});
type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface ContentSettingsProps {
  onShowWrapped?: () => void;
}

export default function ContentSettings({ onShowWrapped }: ContentSettingsProps) {
  const {
    allPrayers,
    alwaysShowPrayers,
    toggleAlwaysShowPrayer,
    isEditModeEnabled,
    setIsEditModeEnabled,
    restoreAllPredefinedPrayers,
    userDevotions,
    userPrayers,
    userLetters,
    customPlans,
    importUserData,
    simulatedDate,
    setSimulatedDate,
    userQuotes,
    addUserQuote,
    removeUserQuote,
    simulatedQuoteId,
    setSimulatedQuoteId,
    userHomeBackgrounds,
    incrementStat,
    homeBackgroundId,
    autoRotateBackground,
    isDeveloperMode,
    forceWrappedSeason,
    hasViewedWrapped,
  } = useSettings();

  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePlaceholder | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const quoteForm = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { text: '', author: '' },
  });

  const onQuoteSubmit: SubmitHandler<QuoteFormValues> = (data) => {
    addUserQuote(data);
    quoteForm.reset();
  };

  const requestStoragePermissionIfNeeded = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    if (Capacitor.getPlatform() !== 'android') return true;
    
    // On Android 11+ (API 30+), Scoped Storage means we can write to public Documents 
    // without WRITE_EXTERNAL_STORAGE permission if we use the correct API (MediaStore or Storage Access Framework).
    // Capacitor's Directory.Documents handles this well.
    // However, checking permission might return 'denied' even if we can write own files.
    // So we try to proceed even if check fails, letting the OS handle it.
    
    try {
      const status = await Filesystem.requestPermissions();
      // If granted, great. If denied, we might still be able to write to Documents (scoped).
      // We return true to attempt the write operation. The write itself will throw if it really can't.
      return true; 
    } catch {
      return true; // Optimistic approach for Android 10+
    }
  };

  const handleExport = async () => {
    try {
      const hasPermission = await requestStoragePermissionIfNeeded();
      if (!hasPermission) {
        toast({ variant: 'destructive', title: 'Permiso denegado', description: 'No se pudo acceder al almacenamiento.' });
        return;
      }

      const rawAppState =
        typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function'
          ? window.localStorage.getItem('cotidie_app_state')
          : null;
      const appState = rawAppState ? JSON.parse(rawAppState) : null;
      const dataToExport = appState ?? {
        userDevotions,
        userPrayers,
        userLetters,
        userQuotes,
        userHomeBackgrounds,
        homeBackgroundId,
        autoRotateBackground,
      };
      const dataStr = JSON.stringify(dataToExport, null, 2);
      
      // Web Fallback
      if (!Capacitor.isNativePlatform()) {
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cotidie_backup.ctd';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: 'Datos exportados correctamente.' });
        return;
      }

      // Android Native Export
      try {
        await Filesystem.mkdir({
            path: 'Cotidie',
            directory: Directory.Documents,
            recursive: true
        });
      } catch (e) { /* ignore */ }

      await Filesystem.writeFile({
          path: `Cotidie/cotidie_backup_${new Date().toISOString().split('T')[0]}.ctd`,
          data: dataStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
      });
      
      const fileResult = await Filesystem.getUri({
          path: `Cotidie/cotidie_backup_${new Date().toISOString().split('T')[0]}.ctd`,
          directory: Directory.Documents
      });

      await Share.share({
          title: 'Copia de Seguridad Cotidie',
          url: fileResult.uri,
          dialogTitle: 'Guardar copia de seguridad'
      });
      
      toast({ title: 'Respaldo listo', description: 'Se ha abierto el menú compartir.' });

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error al exportar', description: 'No se pudieron exportar los datos.' });
    }
  };

  const handleImportClick = async () => {
    const hasPermission = await requestStoragePermissionIfNeeded();
    if (!hasPermission) {
      toast({ variant: 'destructive', title: 'Permiso denegado', description: 'No se pudo acceder al almacenamiento.' });
      return;
    }
    importFileRef.current?.click();
  };

  const handleExportCalendar = async (semester?: 1 | 2) => {
    try {
        const icsContent = generateSaintsICS(semester);
        const fileName = semester ? `santoral_cotidie_s${semester}.ics` : 'santoral_cotidie.ics';
        
        // 1. Web fallback (Desktop/Browser)
        if (!Capacitor.isNativePlatform()) {
             const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
             const url = window.URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', fileName);
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             toast({ title: 'Calendario descargado' });
             return;
        }

        // 2. Android Native Implementation
        const hasPermission = await requestStoragePermissionIfNeeded();
        if (!hasPermission) {
             toast({ variant: 'destructive', title: 'Permiso denegado', description: 'No se pudo acceder al almacenamiento.' });
             return;
        }

        // Create Documents/Cotidie folder if it doesn't exist
        try {
            await Filesystem.mkdir({
                path: 'Cotidie',
                directory: Directory.Documents,
                recursive: true
            });
        } catch (e) {
            // Ignore if folder exists
        }

        // Write file
        await Filesystem.writeFile({
            path: `Cotidie/${fileName}`,
            data: icsContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });

        const fileResult = await Filesystem.getUri({
            path: `Cotidie/${fileName}`,
            directory: Directory.Documents
        });

        await Share.share({
            title: semester ? `Santoral Cotidie (Semestre ${semester})` : 'Santoral Cotidie',
            url: fileResult.uri,
            dialogTitle: 'Guardar calendario'
        });

        toast({ title: 'Calendario listo', description: 'Se ha abierto el menú compartir.' });

    } catch (error) {
        console.error(error);
        toast({ title: 'Error al exportar', description: 'Intenta nuevamente.', variant: 'destructive' });
    }
  };
  
  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        const isCustomPlanPayload =
          data &&
          typeof data === 'object' &&
          typeof data.name === 'string' &&
          Array.isArray(data.prayerIds);

        if (isCustomPlanPayload) {
          const normalizedPrayerIds = data.prayerIds.filter((x: unknown): x is string => typeof x === 'string');
          if (normalizedPrayerIds.length === 0) throw new Error('Formato de plan inválido.');

          const preferredSlot = data.slot === 1 || data.slot === 2 || data.slot === 3 || data.slot === 4 ? data.slot : null;
          const firstEmpty = customPlans.findIndex((entry) => !entry);
          const targetSlot =
            (preferredSlot && !customPlans[preferredSlot - 1] && preferredSlot) ||
            (firstEmpty >= 0 ? ((firstEmpty + 1) as 1 | 2 | 3 | 4) : (preferredSlot ?? 1));

          const nextPlans = [...customPlans];
          nextPlans[targetSlot - 1] = {
            id: `custom-plan-${targetSlot}-${Date.now()}`,
            slot: targetSlot,
            name: data.name.trim() || `Plan ${targetSlot}`,
            prayerIds: normalizedPrayerIds,
            createdAt: Date.now(),
          };
          importUserData({ customPlans: nextPlans }, { silent: true });
          toast({ title: 'Plan personalizado cargado con éxito.' });
          return;
        }

        const isFullAppState =
          data &&
          typeof data === 'object' &&
          (typeof data.theme === 'string' ||
            typeof data.fontSize === 'string' ||
            typeof data.fontSize === 'number' ||
            typeof data.fontFamily === 'string' ||
            typeof data.timerDuration === 'number' ||
            Array.isArray(data.customPlans));

        if (isFullAppState) {
          if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
            window.localStorage.setItem('cotidie_app_state', JSON.stringify(data));
            toast({ title: 'Respaldo cargado con éxito.' });
            setTimeout(() => window.location.reload(), 50);
            return;
          }
          throw new Error('No se pudo acceder al almacenamiento local.');
        }

        if (
          data.userDevotions ||
          data.userPrayers ||
          data.userLetters ||
          data.userQuotes ||
          data.userHomeBackgrounds ||
          typeof data.homeBackgroundId === 'string' ||
          typeof data.autoRotateBackground === 'boolean'
        ) {
          importUserData(data, { silent: true });
          toast({ title: 'Respaldo cargado con éxito.' });
          return;
        }

        throw new Error('Formato de archivo inválido.');
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error al importar', description: 'El archivo no es válido.' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const daySpecificPrayers = allPrayers.filter((p): p is Prayer & { id: string } => (p.showOnDay !== undefined || p.isDaySpecific === true) && !!p.id);
  const daysOfWeek = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];

  const getPrayerDisplayName = (prayerId: string) => {
    const prayer = daySpecificPrayers.find(p => p.id === prayerId);
    return prayer?.title || 'Oración sin título';
  }

  const allQuotesForSelector = useMemo(() => {
    const quotes: Quote[] = [
      ...catholicQuotes.map((q, i) => ({...q, id: `cq_${i}`})), 
      ...userQuotes
    ];
    return quotes.map(q => ({
      value: q.id!,
      label: `"${q.text.substring(0, 30)}..." - ${q.author}`
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

  const isSeason = useMemo(() => {
    if (forceWrappedSeason) return true;
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    return isWrappedSeason(now);
  }, [simulatedDate, forceWrappedSeason]);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {isSeason && hasViewedWrapped && onShowWrapped && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
            <CardHeader>
                <CardTitle className="font-headline text-base flex items-center gap-2">
                    <span>✨</span> Resumen del Año
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Button 
                    onClick={onShowWrapped} 
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0 shadow-lg shadow-yellow-500/20"
                >
                    <Icon.Play className="mr-2 h-4 w-4 fill-current" />
                    Ver Cotidie Annuum {new Date().getFullYear()}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Revive tus momentos de oración de este año.
                </p>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Visibilidad de Oraciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {daySpecificPrayers.map((prayer) => (
            <div key={prayer.id} className="flex items-center justify-between">
              <Label htmlFor={`show-prayer-${prayer.id}`} className="flex flex-col gap-1 text-sm">
                <span>{getPrayerDisplayName(prayer.id)}</span>
                {prayer.showOnDay !== undefined && prayer.showOnDay < 7 && (
                  <span className="text-xs text-muted-foreground">
                    Originalmente solo los {daysOfWeek[prayer.showOnDay]}
                  </span>
                )}
                 {prayer.id === 'mes-de-maria' ? (
                  <span className="text-xs text-muted-foreground">
                    Visible por defecto del 8 de noviembre al 8 de diciembre
                  </span>
                ) : prayer.id === 'cartas' ? (
                  <span className="text-xs text-muted-foreground">
                    Visible por defecto
                  </span>
                ) : prayer.isDaySpecific && prayer.showOnDay === undefined ? (
                  <span className="text-xs text-muted-foreground">
                    Oculto por defecto
                  </span>
                ) : null}
              </Label>
              <Switch
                id={`show-prayer-${prayer.id}`}
                checked={alwaysShowPrayers.includes(prayer.id)}
                onCheckedChange={() => toggleAlwaysShowPrayer(prayer.id)}
              />
            </div>
          ))}
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Activa el interruptor para mostrar siempre la oración, independientemente del día.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Exportación de Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2">
                <Button onClick={handleExport} variant="outline" className="w-full justify-start">
                    <Icon.Download className="mr-2 h-4 w-4" />
                    Exportar Copia de Seguridad
                </Button>
                <p className="text-xs text-muted-foreground ml-2">Guarda tus oraciones, devociones y cartas en un archivo .ctd.</p>
             </div>

             <div className="space-y-2">
                <Button onClick={handleImportClick} variant="outline" className="w-full justify-start">
                    <Icon.Upload className="mr-2 h-4 w-4" />
                    Importar Copia de Seguridad
                </Button>
                <input type="file" ref={importFileRef} onChange={handleFileImport} accept=".json,.ctd" className="hidden" />
                 <p className="text-xs text-muted-foreground ml-2">Restaura datos desde un archivo .ctd o .json previamente exportado.</p>
             </div>

             <div className="space-y-2 pt-2 border-t">
                <Button onClick={() => handleExportCalendar()} variant="outline" className="w-full justify-start">
                    <Icon.Calendar className="mr-2 h-4 w-4" />
                    Descargar Santoral Completo (.ics)
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => handleExportCalendar(1)} variant="ghost" size="sm" className="flex-1 text-xs h-8">
                        1º Semestre (Ene-Jun)
                    </Button>
                    <Button onClick={() => handleExportCalendar(2)} variant="ghost" size="sm" className="flex-1 text-xs h-8">
                        2º Semestre (Jul-Dic)
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground ml-2">
                    Añade los santos del año a tu calendario. Si falla la importación completa, intenta por semestres.
                </p>
             </div>
        </CardContent>
      </Card>

      {isDeveloperMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Control de Contenido (Avanzado)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-mode-switch" className="flex flex-col gap-1">
                <span>Habilitar Edición y Eliminación</span>
                <span className="text-xs font-normal text-muted-foreground">Permite editar y borrar todas las oraciones.</span>
              </Label>
              <Switch
                id="edit-mode-switch"
                checked={isEditModeEnabled}
                onCheckedChange={setIsEditModeEnabled}
              />
            </div>
            
            <Button
              onClick={restoreAllPredefinedPrayers}
              variant="outline"
              className="w-full"
            >
              <Icon.RotateCcw className="mr-2 size-4" />
              Restaurar oraciones predeterminadas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
