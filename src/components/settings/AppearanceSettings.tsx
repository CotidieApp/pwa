'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Capacitor } from '@capacitor/core';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { extractThemeColorsFromImageUrl, clampNumber, type ThemeColors } from '@/lib/theme-utils';
import ImageCropper from '@/components/ui/ImageCropper';
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

const imageFormSchema = z.object({});
type ImageFormValues = z.infer<typeof imageFormSchema>;

export default function AppearanceSettings() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    homeBackgroundId,
    setHomeBackgroundId,
    autoRotateBackground,
    setAutoRotateBackground,
    planDeVidaTrackerEnabled,
    setPlanDeVidaTrackerEnabled,
    pinchToZoomEnabled,
    setPinchToZoomEnabled,
    navMode,
    setNavMode,
    arrowBubbleSize,
    setArrowBubbleSize,
    smallWidgetMode,
    setSmallWidgetMode,
    addUserHomeBackground,
    removeUserHomeBackground,
    allHomeBackgrounds,
    prayerTextZoom,
    setPrayerTextZoom,
    appScale,
    setAppScale,
  } = useSettings();

  const { toast } = useToast();
  const [newBackgroundFile, setNewBackgroundFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [finalCroppedImage, setFinalCroppedImage] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(9 / 16);

  const imageForm = useForm<ImageFormValues>({
    resolver: zodResolver(imageFormSchema),
    defaultValues: {},
  });

  const onImageSubmit: SubmitHandler<ImageFormValues> = async () => {
    if (!finalCroppedImage) {
      toast({ variant: 'destructive', title: 'Selecciona una imagen', description: 'Debes elegir y recortar una imagen.' });
      return;
    }
    
    const imageUrl = finalCroppedImage;
    let themeColors: ThemeColors = {
      primary: { h: 36, s: 60 },
      background: { h: 216, s: 25 },
      accent: { h: 45, s: 55 },
    };

    try {
      const extracted = await extractThemeColorsFromImageUrl(imageUrl);
      if (extracted) themeColors = extracted;
    } catch {}

    const generatedDescription = `Fondo personalizado ${new Date().toLocaleDateString()}`;

    addUserHomeBackground({
      imageUrl,
      description: generatedDescription,
      imageHint: generatedDescription,
      themeColors,
    });
    imageForm.reset();
    setNewBackgroundFile(null);
    setFinalCroppedImage(null);
    setImageToCrop(null);
    toast({ title: 'Fondo agregado.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBackgroundFile(file);
      setCropAspect(9 / 16);
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Clear input value so same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setFinalCroppedImage(croppedImage);
    setIsCropperOpen(false);
    setImageToCrop(null);
  };

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const fontOptions = [
    { value: 'literata', label: 'Literata (Predeterminada)' },
    { value: 'lora', label: 'Lora' },
    { value: 'merriweather', label: 'Merriweather' },
    { value: 'ebgaramond', label: 'EB Garamond' },
    { value: 'timesnewroman', label: 'Times New Roman' },
  ];
  const fontSizeDisplay = clampNumber(fontSize, 11, 21);
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Lectura y Navegación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nav-mode-select" className="text-sm font-medium">
              Modo de navegación táctil
            </Label>
            <Select value={navMode} onValueChange={(value) => setNavMode(value as any)}>
              <SelectTrigger id="nav-mode-select">
                <SelectValue placeholder="Seleccionar modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bubble">Globo de flechas (Flotante)</SelectItem>
                <SelectItem value="touch">Zonas de toque (Lados)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic">
              * Determina cómo avanzas en Planes Personalizados y Rosario.
            </p>
          </div>
          {navMode === 'bubble' && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <Label className="flex flex-col gap-1 text-sm font-medium">
                <span>Tamaño del globo flotante</span>
              </Label>
              <Select value={arrowBubbleSize} onValueChange={(value) => setArrowBubbleSize(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Pequeño</SelectItem>
                  <SelectItem value="md">Mediano</SelectItem>
                  <SelectItem value="lg">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <Label className="flex flex-col gap-1 text-sm font-medium">
              <span>Tamaño de la aplicación</span>
              <span className="text-xs text-muted-foreground">Ajusta el tamaño global de botones y menús.</span>
            </Label>
            <div className="pt-1">
              <Slider
                min={0.7}
                max={1.5}
                step={0.05}
                value={[appScale]}
                onValueChange={(values) => {
                  setAppScale(values[0]);
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>70%</span>
              <span>ACTUAL: {Math.round(appScale * 100)}%</span>
              <span>150%</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="pinch-zoom-switch" className="flex flex-col gap-1 text-sm font-medium">
                <span>Pellizcar para Zoom</span>
                <span className="text-xs font-normal text-muted-foreground">Cambia el tamaño de letra con gestos sobre el texto.</span>
              </Label>
              <Switch
                id="pinch-zoom-switch"
                checked={pinchToZoomEnabled}
                onCheckedChange={setPinchToZoomEnabled}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex flex-col gap-1 text-sm font-medium">
              <span>Tamaño de letra (Oraciones)</span>
              <span className="text-xs text-muted-foreground">Ajusta el tamaño del contenido de las oraciones.</span>
            </Label>
            <div className="pt-1">
              <Slider
                min={0.5}
                max={2.0}
                step={0.05}
                value={[prayerTextZoom]}
                onValueChange={(values) => {
                  setPrayerTextZoom(values[0]);
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>50%</span>
              <span>ACTUAL: {Math.round(prayerTextZoom * 100)}%</span>
              <span>200%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="font-family-select" className="text-sm font-medium">
              Tipo de letra
            </Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger id="font-family-select">
                <SelectValue placeholder="Seleccionar fuente" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={`font-${option.value}`}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Interfaz y Tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="dark-mode-switch" className="flex items-center gap-2 text-sm font-medium flex-1">
              Modo Oscuro
            </Label>
            <div className="flex items-center gap-2 shrink-0">
              <Icon.Sun className={cn("size-4 transition-colors", theme === 'light' ? 'text-primary' : 'text-muted-foreground')} />
              <Switch
                id="dark-mode-switch"
                checked={theme === 'dark'}
                onCheckedChange={handleThemeChange}
              />
              <Icon.Moon className={cn("size-4 transition-colors", theme === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="plan-tracker-switch" className="flex flex-col gap-1 text-sm font-medium flex-1">
               <span>Rastreador de Plan de Vida</span>
               <span className="text-xs font-normal text-muted-foreground leading-tight">Muestra casillas de verificación en las listas.</span>
            </Label>
            <Switch
              id="plan-tracker-switch"
              checked={planDeVidaTrackerEnabled}
              onCheckedChange={setPlanDeVidaTrackerEnabled}
            />
          </div>

          {isAndroidNative && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex flex-col gap-1 text-sm font-medium">
                <span>Visualización del Widget</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Ajuste para el widget de escritorio (Android).
                </span>
              </Label>
              <Select value={smallWidgetMode} onValueChange={(value) => setSmallWidgetMode(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar comportamiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Mostrar todo reducido</SelectItem>
                  <SelectItem value="saint_priority">Solo santo en grande si falta espacio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Fondo de Pantalla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="auto-rotate-bg-switch" className="flex flex-col gap-1 text-sm">
                <span>Rotación Diaria de Fondo</span>
                <span className="text-xs text-muted-foreground">Cambia el fondo de inicio cada día.</span>
              </Label>
              <Switch
                id="auto-rotate-bg-switch"
                checked={autoRotateBackground}
                onCheckedChange={setAutoRotateBackground}
              />
            </div>
            
            <Label className="text-sm">Seleccionar Fondo</Label>
            <div className={cn("grid grid-cols-2 gap-4", autoRotateBackground && "opacity-50 pointer-events-none")}>
              {allHomeBackgrounds.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                  onClick={() => setHomeBackgroundId(image.id)}
                >
                  <div className="relative w-full aspect-[9/16]">
                    <Image
                      src={image.imageUrl}
                      alt={image.description}
                      fill
                      className="object-cover"
                      data-ai-hint={image.imageHint}
                    />
                  </div>
                  {homeBackgroundId === image.id && (
                    <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                      <Icon.CheckCircle2 className="size-8 text-primary-foreground" />
                    </div>
                  )}
                   {image.isUserDefined && (
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button
                           variant="destructive"
                           size="icon"
                           className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={(e) => e.stopPropagation()}
                         >
                           <Icon.Trash2 className="h-4 w-4" />
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                         <AlertDialogHeader>
                           <AlertDialogTitle>¿Eliminar fondo?</AlertDialogTitle>
                           <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                           <AlertDialogAction onClick={() => removeUserHomeBackground(image.id)}>Eliminar</AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   )}
                </div>
              ))}
            </div>

            <Form {...imageForm}>
              <form onSubmit={imageForm.handleSubmit(onImageSubmit)} className="space-y-4 p-4 border rounded-md mt-6">
                <div>
                  <Label>Subir Nuevo Fondo</Label>
                  <div className="mt-2 space-y-2">
                    <input
                      id="new-background-file"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                    <Button asChild variant="outline" size="sm">
                      <label htmlFor="new-background-file" className="cursor-pointer">
                        Seleccionar imagen
                      </label>
                    </Button>
                    {newBackgroundFile?.name && (
                      <p className="text-xs text-muted-foreground font-body break-all">
                        {newBackgroundFile.name} {finalCroppedImage && "(Recortada)"}
                      </p>
                    )}
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full">Agregar Fondo</Button>
              </form>
            </Form>
        </CardContent>
      </Card>

      {isCropperOpen && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setIsCropperOpen(false);
            setNewBackgroundFile(null);
            setImageToCrop(null);
            setFinalCroppedImage(null);
          }}
          isOpen={isCropperOpen}
          aspect={cropAspect}
        />
      )}
    </div>
  );
}

