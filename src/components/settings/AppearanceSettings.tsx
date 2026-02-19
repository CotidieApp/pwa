'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Icon from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { extractThemeColorsFromImageUrl, clampNumber, type ThemeColors } from '@/lib/theme-utils';
import ImageCropper from '@/components/ui/ImageCropper';

const imageFormSchema = z.object({
  // Description is no longer required by user
});
type ImageFormValues = z.infer<typeof imageFormSchema>;

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
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="color"
          value={hexColor}
          onChange={handleColorChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          className="w-10 h-6 rounded-md border"
          style={{ backgroundColor: hexColor }}
        />
      </div>
    </div>
  );
};

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
    isCustomThemeActive,
    setIsCustomThemeActive,
    setCustomThemeColor,
    resetCustomTheme,
    pinchToZoomEnabled,
    setPinchToZoomEnabled,
    arrowBubbleSize,
    setArrowBubbleSize,
    userHomeBackgrounds,
    addUserHomeBackground,
    removeUserHomeBackground,
    allHomeBackgrounds,
    activeThemeColors,
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

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-base">Apariencia General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex flex-col gap-1 text-sm">
              <span>Tamaño de globos de flechas</span>
              <span className="text-xs text-muted-foreground">Ajusta el tamaño en Plan Personalizado y Rosario.</span>
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

          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode-switch" className="flex items-center gap-2 text-sm">
              Modo Oscuro
            </Label>
            <div className="flex items-center gap-2">
              <Icon.Sun className={`size-5 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                id="dark-mode-switch"
                checked={theme === 'dark'}
                onCheckedChange={handleThemeChange}
              />
              <Icon.Moon className={`size-5 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="font-family-select" className="text-sm">
              Fuente del texto
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

          <div className="space-y-3">
            <Label className="flex flex-col gap-1 text-sm">
              <span>Tamaño de letra</span>
              <span className="text-xs text-muted-foreground">Ajusta el tamaño del texto en toda la aplicación.</span>
            </Label>
            <div className="pt-1">
              <Slider
                min={11}
                max={21}
                step={1}
                value={[fontSizeDisplay]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (typeof next === 'number' && Number.isFinite(next)) setFontSize(next);
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>11</span>
              <span>{fontSizeDisplay}px</span>
              <span>21</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="plan-tracker-switch" className="flex flex-col gap-1 text-sm">
               <span>Rastreador de Plan de Vida</span>
               <span className="text-xs text-muted-foreground">Muestra casillas en el Plan de Vida.</span>
            </Label>
            <Switch
              id="plan-tracker-switch"
              checked={planDeVidaTrackerEnabled}
              onCheckedChange={setPlanDeVidaTrackerEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pinch-zoom-switch" className="flex flex-col gap-1 text-sm">
               <span>Pellizcar para Zoom</span>
               <span className="text-xs text-muted-foreground">Cambia el tamaño de letra con gestos.</span>
            </Label>
            <Switch
              id="pinch-zoom-switch"
              checked={pinchToZoomEnabled}
              onCheckedChange={setPinchToZoomEnabled}
            />
          </div>
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
                     <Button
                       variant="destructive"
                       size="icon"
                       className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={(e) => {
                         e.stopPropagation();
                         removeUserHomeBackground(image.id);
                       }}
                     >
                       <Icon.Trash2 className="h-4 w-4" />
                     </Button>
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
                {/* Description field removed as requested */}
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
