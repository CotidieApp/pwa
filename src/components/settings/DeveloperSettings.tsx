'use client';

import React, { useState, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { appVersion } from '@/lib/version';

interface DeveloperSettingsProps {
  onOpenDashboard?: () => void;
}

export default function DeveloperSettings({ onOpenDashboard }: DeveloperSettingsProps) {
  const {
    resetSettings,
    hardResetApp,
    isDeveloperMode,
    loginAsDeveloper,
    logoutDeveloper,
  } = useSettings();

  const { toast } = useToast();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDevTitleClick = () => {
    if (isDeveloperMode) {
        onOpenDashboard?.();
        return;
    }

    if (devClickTimeoutRef.current) {
      clearTimeout(devClickTimeoutRef.current);
    }
    
    const newClickCount = devClickCount + 1;
    setDevClickCount(newClickCount);

    if (newClickCount >= 3) {
      setShowDevLogin(true);
      setDevClickCount(0);
    } else {
      devClickTimeoutRef.current = setTimeout(() => {
        setDevClickCount(0);
      }, 1500);
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

  const handleDevLogout = () => {
    logoutDeveloper();
    toast({ title: 'Modo desarrollador desactivado' });
  };
  
  const handleHardReset = () => {
    hardResetApp();
    setIsAlertOpen(false);
  }
  
  const handleForceUpdate = () => {
    window.location.reload();
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      if (typeof document === 'undefined') return false;
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const isProbablyMobile = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleDeveloperMailIconClick = () => {
    window.location.href = 'mailto:balcaldegm@gmail.com';
  };

  const handleDeveloperPhoneIconClick = () => {
    const phoneDisplay = '+56 9 8189 9137';
    const phoneTel = '+56981899137';

    if (!isProbablyMobile()) {
      void copyToClipboard(phoneDisplay).then((ok) => {
        toast({
          title: ok ? 'Número copiado al portapapeles' : 'No se pudo copiar el número',
        });
      });
      return;
    }

    try {
      window.location.href = `tel:${phoneTel}`;
    } catch {}

    window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void copyToClipboard(phoneDisplay).then((ok) => {
        toast({
          title: ok ? 'Número copiado al portapapeles' : 'No se pudo copiar el número',
        });
      });
    }, 900);
  };

  const handleDeveloperInstagramIconClick = () => {
    const username = 'benja_alcalde';
    const webUrl = `https://instagram.com/${username}`;

    if (!isProbablyMobile()) {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      window.location.href = `instagram://user?username=${username}`;
    } catch {}

    window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }, 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
           <Button variant="outline" onClick={resetSettings}>
            <Icon.RotateCcw className="mr-2 size-4" />
            Restablecer ajustes
          </Button>

          <Button variant="outline" onClick={handleForceUpdate}>
            <Icon.RefreshCw className="mr-2 size-4" />
            Forzar Actualización
          </Button>

          {isDeveloperMode && (
            <Button variant="secondary" onClick={onOpenDashboard}>
              <Icon.Code className="mr-2 size-4" />
              Panel de Desarrollador
            </Button>
          )}

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
                <AlertDialogAction onClick={handleHardReset}>
                  Sí, restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
         <CardFooter className="flex flex-col gap-2 items-start">
          <p className="text-xs text-muted-foreground">
            Restablecer ajustes restaurará la configuración a sus valores por defecto.
          </p>
           <p className="text-xs text-muted-foreground">
            Restaurar aplicación borrará todas tus entradas y devociones y restablecerá los ajustes.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle 
            className={cn(
              "font-headline text-base",
              !isDeveloperMode && "cursor-pointer"
            )}
            onClick={handleDevTitleClick}
          >
            Desarrollador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-foreground space-y-3">
            <p className="font-semibold text-base">Benjamín Alcalde Gueneau de Mussy</p>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm -m-1 p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Enviar correo"
                title="Enviar correo"
                onClick={handleDeveloperMailIconClick}
              >
                <Icon.Mail className="size-4" />
              </button>
              <a href="mailto:balcaldegm@gmail.com" className="hover:underline">balcaldegm@gmail.com</a>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm -m-1 p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Llamar al número del desarrollador"
                title="Llamar"
                onClick={handleDeveloperPhoneIconClick}
              >
                <Icon.Phone className="size-4" />
              </button>
              <span>+56 9 8189 9137</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm -m-1 p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Abrir Instagram del desarrollador"
                title="Abrir Instagram"
                onClick={handleDeveloperInstagramIconClick}
              >
                <Icon.Instagram className="size-4" />
              </button>
              <a href="https://instagram.com/benja_alcalde" target="_blank" rel="noopener noreferrer" className="hover:underline">@benja_alcalde</a>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start p-4">
          <div className="border rounded-lg p-4 w-full text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Icon.Info className="size-4 shrink-0 mt-0.5" />
              <p>
                Si detectas un error o tienes sugerencias, no dudes en contactarme.
              </p>
            </div>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDevLogin} onOpenChange={setShowDevLogin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acceso de Desarrollador</AlertDialogTitle>
            <AlertDialogDescription>
              Introduce tus credenciales para habilitar el modo desarrollador.
            </AlertDialogDescription>
          </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDevLogin();
                      }
                    }}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
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
          <p><em>Sérviam cum gaudio magno!</em></p>
          <p>© 2025 - {new Date().getFullYear()} Cotidie. Todos los derechos reservados.</p>
          <p>"Mirad al Señor con ojos atentos, y descubriréis en Él el rostro mismo de Dios."</p>
        </CardContent>
      </Card>

      <div className="text-center text-[0.67rem] text-muted-foreground/80 space-y-1 pb-4">
        <p>Next.js 15 + React 18, TailwindCSS y Radix UI</p>
        <p>APK Android con Capacitor y arquitectura modular con 25+ componentes</p>
        <p>Persistencia local con Context API y localStorage</p>
        <p>PNG, JPEG guardadas como data URI</p>
      </div>
    </div>
  );
}
