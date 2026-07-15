'use client';

import React, { useRef, useState, ChangeEvent } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { generateSaintsICS } from '@/lib/ics-generator';
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
import { cn } from '@/lib/utils';
import { appVersion } from '@/lib/version';

interface DeveloperSettingsProps {
  onOpenDashboard?: () => void;
}

const APP_SHARE_URL = 'https://n9.cl/cotidie-installer';

export default function DeveloperSettings({ onOpenDashboard }: DeveloperSettingsProps) {
  const {
    resetSettings,
    hardResetApp,
    isDeveloperMode,
    loginAsDeveloper,
    getBackupSnapshot,
    importUserData,
  } = useSettings();

  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);
  const devClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [devClickCount, setDevClickCount] = useState(0);

  const handleExport = async () => {
    try {
      const dataToExport = getBackupSnapshot();
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const utf8DataStr = `\uFEFF${dataStr}`;
      const backupDate = new Date().toISOString().split('T')[0] || 'backup';
      const fileName = `cotidie_backup_${backupDate}.ctd`;

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
        encoding: Encoding.UTF8,
      });

      const fileResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

      await Share.share({
        title: 'Copia de Seguridad Cotidie',
        url: fileResult.uri,
        dialogTitle: 'Guardar copia de seguridad',
      });

      toast({ title: 'Respaldo listo', description: 'Se ha abierto el menú para compartir.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error al exportar', description: 'No se pudieron exportar los datos.' });
    }
  };

  const handleExportCalendar = async (semester: 1 | 2) => {
    try {
      const icsContent = generateSaintsICS(semester);
      const fileName = `santoral_cotidie_s${semester}.ics`;

      if (!Capacitor.isNativePlatform()) {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Calendario descargado' });
        return;
      }

      await Filesystem.writeFile({
        path: fileName,
        data: icsContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const fileResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

      await Share.share({
        title: `Santoral Cotidie (Semestre ${semester})`,
        url: fileResult.uri,
        dialogTitle: 'Guardar calendario',
      });

      toast({ title: 'Calendario listo', description: 'Se ha abierto el menú para compartir.' });
    } catch {
      toast({ title: 'Error al exportar', description: 'Intenta nuevamente.', variant: 'destructive' });
    }
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const text = (loadEvent.target?.result as string).replace(/^\uFEFF/, '');
        if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
          toast({
            variant: 'destructive',
            title: 'Archivo no compatible',
            description: 'El archivo seleccionado no parece ser un respaldo de Cotidie válido.',
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
      } catch {
        toast({ variant: 'destructive', title: 'Error al importar', description: 'El archivo no es válido.' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDevTitleClick = () => {
    if (isDeveloperMode) {
      onOpenDashboard?.();
      return;
    }

    if (devClickTimeoutRef.current) {
      clearTimeout(devClickTimeoutRef.current);
    }

    const nextClickCount = devClickCount + 1;
    setDevClickCount(nextClickCount);

    if (nextClickCount >= 3) {
      setShowDevLogin(true);
      setDevClickCount(0);
    } else {
      devClickTimeoutRef.current = setTimeout(() => setDevClickCount(0), 1500);
    }
  };

  const handleDevLogin = () => {
    if (loginAsDeveloper(username, password)) {
      toast({ title: 'Modo desarrollador activado' });
      setShowDevLogin(false);
      setUsername('');
      setPassword('');
      onOpenDashboard?.();
    } else {
      toast({ variant: 'destructive', title: 'Credenciales incorrectas' });
    }
  };

  const handleHardReset = () => {
    hardResetApp();
    setIsAlertOpen(false);
  };

  const handleShareApplication = async () => {
    try {
      if (!Capacitor.isNativePlatform() && typeof navigator.share !== 'function') {
        await navigator.clipboard.writeText(APP_SHARE_URL);
        toast({ title: 'Enlace copiado', description: APP_SHARE_URL });
        return;
      }

      await Share.share({
        title: 'Cotidie',
        text: 'Descarga Cotidie desde su enlace oficial.',
        url: APP_SHARE_URL,
        dialogTitle: 'Compartir Cotidie',
      });
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return;
      toast({
        variant: 'destructive',
        title: 'No se pudo compartir',
        description: APP_SHARE_URL,
      });
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Datos y Respaldo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-card/60 px-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">Copia de seguridad</div>
              <div className="text-xs text-muted-foreground">en formato .ctd</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>Exportar</Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border bg-card/60 px-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">Restaurar datos</div>
              <div className="text-xs text-muted-foreground">en formato .ctd</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()}>Importar</Button>
            <input
              ref={importFileRef}
              id="import-data-file"
              name="import-data-file"
              type="file"
              accept=".ctd,application/json,text/plain,application/octet-stream"
              className="sr-only"
              aria-label="Importar archivo de respaldo"
              onChange={handleFileImport}
            />
          </div>

          <div className="space-y-3 rounded-md border bg-card/60 px-3 py-3">
            <div>
              <div className="text-sm font-medium">Calendario de Santoral</div>
              <div className="text-xs text-muted-foreground">en formato .ics</div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" size="sm" onClick={() => handleExportCalendar(1)}>Exportar 1er semestre</Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCalendar(2)}>Exportar 2do semestre</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleShareApplication}>
            <Icon.Share2 className="mr-2 size-4" />
            Compartir aplicación
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Icon.RotateCcw className="mr-2 size-4" />
                Restablecer ajustes
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer ajustes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se restaurará la configuración visual, de alertas y de navegación a sus valores por defecto. Tus oraciones, devociones y cartas no se borrarán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={resetSettings}>Restablecer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isDeveloperMode ? (
            <Button variant="secondary" onClick={onOpenDashboard}>
              <Icon.Code className="mr-2 size-4" />
              Panel de desarrollador
            </Button>
          ) : null}

          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Icon.Trash2 className="mr-2 size-4" />
                Restaurar aplicación
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán permanentemente todas tus devociones y entradas personales, y se restablecerá toda la configuración a sus valores predeterminados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleHardReset}>Sí, restaurar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle
            className={cn('font-headline text-base', !isDeveloperMode && 'cursor-pointer')}
            onClick={handleDevTitleClick}
          >
            Desarrollador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-foreground">
            <p className="font-semibold text-base">Benjamín Alcalde G.</p>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Icon.Mail className="size-4" />
              <a href="mailto:cotidieapp@gmail.com" className="hover:underline">cotidieapp@gmail.com</a>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Icon.Phone className="size-4" />
              <a href="tel:+56929474804" className="hover:underline">+56 9 2947 4804</a>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Icon.Instagram className="size-4" />
              <a href="https://instagram.com/cotidieapp" target="_blank" rel="noopener noreferrer" className="hover:underline">@cotidieapp</a>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start p-4">
          <div className="border rounded-lg p-4 w-full text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Icon.Info className="size-4 shrink-0 mt-0.5" />
              <p>Si detectas un error o tienes sugerencias, no dudes en contactarme.</p>
            </div>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDevLogin} onOpenChange={setShowDevLogin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acceso de Desarrollador</AlertDialogTitle>
            <AlertDialogDescription>Introduzca las credenciales para habilitar el modo desarrollador.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleDevLogin();
                  }
                }}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleDevLogin();
                  }
                }}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDevLogin}>Iniciar sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Acerca de</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>Cotidie</strong> - Versión {appVersion}</p>
          <p><em>Serviam cum gaudio magno!</em></p>
          <p>© 2025 - {new Date().getFullYear()} Cotidie. Todos los derechos reservados.</p>
          <p>"Mirad al Señor con ojos atentos, y descubriréis en Él el rostro mismo de Dios."</p>
        </CardContent>
      </Card>

      <div className="text-center text-[0.67rem] text-muted-foreground/80 space-y-1 pb-4">
        <p>Next.js 15 + React 18, TailwindCSS y Radix UI</p>
        <p>APK Android con Capacitor y arquitectura modular con 25+ componentes</p>
        <p>Persistencia local con Context API y localStorage</p>
        <p>PNG, JPEG guardadas como data URI</p>
        <p></p>
        <p>Esta aplicación fue desarrollada en constante colaboración con IA.</p>
      </div>
    </div>
  );
}
