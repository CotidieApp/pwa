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
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { extractThemeColorsFromImageUrl, type ThemeColors } from '@/lib/theme-utils';
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

function SwitchRow({
  id,
  title,
  subtitle,
  checked,
  onCheckedChange,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-md border bg-card/60 px-3 py-3", className)}>
      <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-xs font-normal leading-tight text-muted-foreground">{subtitle}</span> : null}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function AppearanceSettings() {
  const {
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    homeBackgroundId,
    setHomeBackgroundId,
    autoRotateBackground,
    setAutoRotateBackground,
    perpetualBackgroundEnabled,
    setPerpetualBackgroundEnabled,
    isDeveloperMode,
    planDeVidaTrackerEnabled,
    setPlanDeVidaTrackerEnabled,
    pinchToZoomEnabled,
    setPinchToZoomEnabled,
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
  const fontOptions = [
    { value: 'literata', label: 'Literata (Predeterminada)' },
    { value: 'lora', label: 'Lora' },
    { value: 'merriweather', label: 'Merriweather' },
    { value: 'ebgaramond', label: 'EB Garamond' },
    { value: 'timesnewroman', label: 'Times New Roman' },
  ];
  const [finalCroppedImage, setFinalCroppedImage] = useState<string | null>(null);

  const imageForm = useForm<ImageFormValues>({
    resolver: zodResolver(imageFormSchema),
    defaultValues: {},
  });

  const onImageSubmit: SubmitHandler<ImageFormValues> = async () => {
    if (!finalCroppedImage) {
      toast({ variant: 'destructive', title: 'Selecciona una imagen', description: 'Debes elegir y recortar una imagen.' });
      return;
    }

    let themeColors: ThemeColors = {
      primary: { h: 36, s: 60 },
      background: { h: 216, s: 25 },
      accent: { h: 45, s: 55 },
    };

    try {
      const extracted = await extractThemeColorsFromImageUrl(finalCroppedImage);
      if (extracted) themeColors = extracted;
    } catch {}

    const generatedDescription = `Fondo personalizado ${new Date().toLocaleDateString()}`;

    addUserHomeBackground({
      imageUrl: finalCroppedImage,
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setNewBackgroundFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setFinalCroppedImage(croppedImage);
    setIsCropperOpen(false);
    setImageToCrop(null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Apariencia general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
          <SwitchRow id="dark-mode-switch" title="Modo oscuro" checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          <SwitchRow id="plan-tracker-switch" title="Casillas del Plan de Vida" checked={planDeVidaTrackerEnabled} onCheckedChange={setPlanDeVidaTrackerEnabled} />
          <SwitchRow
            id="pinch-zoom-switch"
            title="Zoom rápido"
            subtitle="Pellizcar la pantalla en cualquier oración para cambiar zoom"
            checked={pinchToZoomEnabled}
            onCheckedChange={setPinchToZoomEnabled}
          />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Aplicación en general</Label>
            <Slider min={0.7} max={1.5} step={0.05} value={[appScale]} onValueChange={(values) => setAppScale(values[0])} />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>70%</span>
              <span>{Math.round(appScale * 100)}%</span>
              <span>150%</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Tamaño de fuente</Label>
            <Slider min={0.5} max={2} step={0.05} value={[prayerTextZoom]} onValueChange={(values) => setPrayerTextZoom(values[0])} />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>50%</span>
              <span>{Math.round(prayerTextZoom * 100)}%</span>
              <span>200%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-family-select" className="text-sm font-medium">Tipo de letra</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger id="font-family-select">
                <SelectValue placeholder="Seleccionar fuente" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((option) => (
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
          <CardTitle className="font-headline text-base">Fondo de Pantalla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDeveloperMode ? (
            <SwitchRow
              id="perpetual-background"
              title="Fondo perpetuo"
              subtitle="Modo de prueba desarrollador"
              checked={perpetualBackgroundEnabled}
              onCheckedChange={setPerpetualBackgroundEnabled}
              className="border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-100"
            />
          ) : null}

          <SwitchRow
            id="auto-rotate-background"
            title="Rotación diaria"
            subtitle="Cambia de imagen cada día"
            checked={autoRotateBackground}
            onCheckedChange={setAutoRotateBackground}
          />

          <div className={cn('grid grid-cols-2 gap-4', autoRotateBackground && 'opacity-50 pointer-events-none')}>
            {allHomeBackgrounds.map((image) => (
              <div
                key={image.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                onClick={() => setHomeBackgroundId(image.id)}
              >
                <div className="relative w-full aspect-[9/16]">
                  <Image src={image.imageUrl} alt={image.description} fill className="object-cover" data-ai-hint={image.imageHint} />
                </div>
                {homeBackgroundId === image.id ? (
                  <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                    <Icon.CheckCircle2 className="size-8 text-primary-foreground" />
                  </div>
                ) : null}
                {image.isUserDefined ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Icon.Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(event) => event.stopPropagation()}>
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
                ) : null}
              </div>
            ))}
          </div>

          <Form {...imageForm}>
            <form onSubmit={imageForm.handleSubmit(onImageSubmit)} className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <Label>Agregar fondo propio</Label>
                <input id="new-background-file" type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="new-background-file" className="cursor-pointer">
                    Seleccionar imagen
                  </label>
                </Button>
                {newBackgroundFile?.name ? (
                  <p className="text-xs text-muted-foreground break-all">
                    {newBackgroundFile.name} {finalCroppedImage ? '(Recortada)' : ''}
                  </p>
                ) : null}
              </div>
              <Button type="submit" size="sm" className="w-full">
                Agregar Fondo
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isCropperOpen ? (
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
          aspect={9 / 16}
        />
      ) : null}
    </div>
  );
}
