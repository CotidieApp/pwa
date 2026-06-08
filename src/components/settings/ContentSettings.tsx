'use client';

import React, { useMemo, useRef, ChangeEvent } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Prayer } from '@/lib/types';
import { generateSaintsICS } from '@/lib/ics-generator';
import { isAnnuumSeason } from '@/lib/movable-feasts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContentSettingsProps {
  onShowAnnuum?: () => void;
}

export default function ContentSettings({ onShowAnnuum }: ContentSettingsProps) {
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
    getBackupSnapshot,
    importUserData,
    simulatedDate,
    userQuotes,
    userHomeBackgrounds,
    homeBackgroundId,
    autoRotateBackground,
    isDeveloperMode,
    forceAnnuumSeason,
    hasViewedAnnuum,
    pushDevLiveTrace,
  } = useSettings();

  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);const requestStoragePermissionIfNeeded = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    if (Capacitor.getPlatform() !== 'android') return true;
    
    // On Android 11+ (API 30+), Scoped Storage means we can write to public Documents 
    // without WRITE_EXTERNAL_STORAGE permission if we use the correct API (MediaStore or Storage Access Framework).
    // Capacitor's Directory.Documents handles this well.
    // However, checking permission might return 'denied' even if we can write own files.
    // So we try to proceed even if check fails, letting the OS handle it.
    
    try {
      await Filesystem.requestPermissions();
      // If granted, great. If denied, we might still be able to write to Documents (scoped).
      // We return true to attempt the write operation. The write itself will throw if it really can't.
      return true; 
    } catch {
      return true; // Optimistic approach for Android 10+
    }
  };

  const handleExport = async () => {
    try {
      const dataToExport = getBackupSnapshot();
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const utf8DataStr = `\uFEFF${dataStr}`;
      const backupDate = new Date().toISOString().split('T')[0] || 'backup';
      const fileName = `cotidie_backup_${backupDate}.ctd`;
      
      // Web Fallback
      if (!Capacitor.isNativePlatform()) {
        const dataBlob = new Blob([utf8DataStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: 'Datos exportados correctamente.' });
        return;
      }

      await Filesystem.writeFile({
          path: fileName,
          data: utf8DataStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
      });
      
      const fileResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache
      });

      await Share.share({
          title: 'Copia de Seguridad Cotidie',
          url: fileResult.uri,
          dialogTitle: 'Guardar copia de seguridad'
      });
      
      toast({ title: 'Respaldo listo', description: 'Se ha abierto el menú para compartir.' });

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

        toast({ title: 'Calendario listo', description: 'Se ha abierto el menú para compartir.' });

    } catch (error) {
        console.error(error);
        toast({ title: 'Error al exportar', description: 'Intenta nuevamente.', variant: 'destructive' });
    }
  };
  
  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    pushDevLiveTrace({
      level: 'info',
      source: 'import',
      message: 'Archivo seleccionado manualmente.',
      data: `name=${file.name}, type=${file.type}, size=${file.size}`,
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string).replace(/^\uFEFF/, '');

        // Basic validation before parsing
        if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
          toast({
            variant: 'destructive',
            title: 'Archivo no compatible',
            description: 'El archivo seleccionado no parece ser un respaldo de Cotidie válido.'
          });
          return;
        }

        const data = JSON.parse(text);
        const result = importUserData(data, { silent: true });

        if (result.status === 'invalid') {
          toast({ variant: 'destructive', title: result.title, description: result.description });
          return;
        }

        toast({ title: result.title, description: result.description });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error al importar', description: 'El archivo no es valido.' });
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
  };

  const isSeason = useMemo(() => {
    if (forceAnnuumSeason) return true;
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    return isAnnuumSeason(now);
  }, [simulatedDate, forceAnnuumSeason]);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {isSeason && hasViewedAnnuum && onShowAnnuum && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
            <CardHeader>
                <CardTitle className="font-headline text-base flex items-center gap-2">
                    <span>✨</span> Resumen del Año
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={onShowAnnuum}
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
          <CardTitle className="font-headline text-base">Mis Datos y Respaldo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon.Download className="size-4 text-primary" />
                  <span>Copia de seguridad</span>
                </div>
                <Button onClick={handleExport} variant="outline" className="w-full justify-start h-auto py-4 px-5">
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-bold">Exportar archivo .ctd</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Guarda oraciones, devociones, cartas y ajustes.</p>
                    </div>
                    <Icon.ChevronRight className="size-4 text-muted-foreground/50 shrink-0 ml-2" />
                </Button>
             </div>

             <div className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon.Upload className="size-4 text-primary" />
                  <span>Restaurar datos</span>
                </div>
                <Button onClick={handleImportClick} variant="outline" className="w-full justify-start h-auto py-4 px-5">
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-bold">Importar archivo .ctd</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Carga un respaldo previamente exportado.</p>
                    </div>
                    <Icon.ChevronRight className="size-4 text-muted-foreground/50 shrink-0 ml-2" />
                </Button>
                <input
                  id="import-data-file"
                  name="import-data-file"
                  type="file"
                  ref={importFileRef}
                  onChange={handleFileImport}
                  accept="*/*"
                  className="sr-only"
                  style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
                  aria-label="Importar archivo de respaldo"
                />
             </div>

             <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Icon.Calendar className="size-4 text-primary" />
                  <span>Exportación de Santoral</span>
                </div>
                <Button onClick={() => handleExportCalendar()} variant="outline" className="w-full justify-start h-auto py-4 px-5 mb-2">
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-bold">Calendario Completo (.ics)</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Todos los santos del año para Google/Outlook.</p>
                    </div>
                    <Icon.ChevronRight className="size-4 text-muted-foreground/50 shrink-0 ml-2" />
                </Button>
                <div className="flex gap-2">
                    <Button onClick={() => handleExportCalendar(1)} variant="ghost" size="sm" className="flex-1 text-[10px] h-10 border border-dashed hover:bg-muted/50">
                        1º Sem. (Ene-Jun)
                    </Button>
                    <Button onClick={() => handleExportCalendar(2)} variant="ghost" size="sm" className="flex-1 text-[10px] h-10 border border-dashed hover:bg-muted/50">
                        2º Sem. (Jul-Dic)
                    </Button>
                </div>
             </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Visibilidad en Listas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] text-muted-foreground italic mb-2">
            * Activa para mostrar siempre, aunque no corresponda al día de hoy.
          </p>
          <div className="grid gap-3">
            {daySpecificPrayers.map((prayer) => (
              <div key={prayer.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <Label htmlFor={`show-prayer-${prayer.id}`} className="flex flex-col gap-0.5 text-sm cursor-pointer flex-1">
                  <span className="font-medium">{getPrayerDisplayName(prayer.id)}</span>
                  {prayer.showOnDay !== undefined && prayer.showOnDay < 7 && (
                    <span className="text-[10px] text-muted-foreground">
                      Solo {daysOfWeek[prayer.showOnDay]}
                    </span>
                  )}
                  {prayer.id === 'mes-de-maria' && (
                    <span className="text-[10px] text-muted-foreground">
                      8 Nov - 8 Dic
                    </span>
                  )}
                </Label>
                <Switch
                  id={`show-prayer-${prayer.id}`}
                  checked={alwaysShowPrayers.includes(prayer.id)}
                  onCheckedChange={() => toggleAlwaysShowPrayer(prayer.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isDeveloperMode && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-400">Control de Contenido (Avanzado)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-mode-switch" className="flex flex-col gap-1 cursor-pointer">
                <span>Habilitar Edición y Eliminación</span>
                <span className="text-xs font-normal text-muted-foreground">Permite editar y borrar todas las oraciones.</span>
              </Label>
              <Switch
                id="edit-mode-switch"
                checked={isEditModeEnabled}
                onCheckedChange={setIsEditModeEnabled}
              />
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20">
                  <Icon.RotateCcw className="mr-2 size-4" />
                  Restaurar oraciones predeterminadas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Restaurar todo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se perderán todas las ediciones hechas sobre oraciones predeterminadas y volverán a mostrarse las ocultas. Las oraciones creadas por ti no se verán afectadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={restoreAllPredefinedPrayers}>Restaurar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




























