'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Prayer } from '@/lib/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Eye, Images, Trash2 } from 'lucide-react';
import { renderText } from '@/lib/textFormatter';
import ImageCropper from '@/components/ui/ImageCropper';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  title: z.string().min(1, { message: 'El título es requerido.' }),
  content: z.string(),
  imageUrl: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.startsWith('/images/') || val.startsWith('data:image/'), {
      message: 'Debe ser una ruta local (/images/) o una imagen local seleccionada.',
    }),
});

type FormValues = z.infer<typeof formSchema>;
type PrayerFormData = Omit<FormValues, 'content'> & { content: Prayer['content'] };
type FormType = 'devotion' | 'entry' | 'letter' | 'predefined';

type AddPrayerFormProps = {
  onSave: (data: PrayerFormData) => void;
  onCancel: () => void;
  formType: FormType;
  existingPrayer?: Prayer | null;
};

export default function AddPrayerForm({
  onSave,
  onCancel,
  formType,
  existingPrayer,
}: AddPrayerFormProps) {
  const { isDeveloperMode, allHomeBackgrounds } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedImageFileName, setSelectedImageFileName] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [finalCroppedImage, setFinalCroppedImage] = useState<string | null>(null);
  const [contentVariants, setContentVariants] = useState<Record<string, string> | null>(null);
  const [activeContentVariant, setActiveContentVariant] = useState<string | null>(null);
  const [showAppImages, setShowAppImages] = useState(false);
  const unmountedRef = useRef(false);

  const draftStorageKey = useMemo(() => `cotidie_draft_${formType}`, [formType]);
  const isPrayerGroup = Boolean(existingPrayer?.prayers?.length);
  const appImages = useMemo(() => {
    const byUrl = new Map<string, { id: string; description: string; imageUrl: string }>();
    [...PlaceHolderImages, ...allHomeBackgrounds].forEach((image) => {
      if (image.imageUrl && !byUrl.has(image.imageUrl)) byUrl.set(image.imageUrl, image);
    });
    return [...byUrl.values()];
  }, [allHomeBackgrounds]);

  const isContentEditable = useMemo(() => {
    if (!existingPrayer) return true;
    if (typeof existingPrayer.content === 'string') return true;
    return isDeveloperMode;
  }, [existingPrayer, isDeveloperMode]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
    },
    mode: 'onSubmit',
  });

  // === Carga de borrador al iniciar
  useEffect(() => {
    if (existingPrayer) return; // No cargar borrador si editamos algo existente

    try {
      const saved = window.localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.title || parsed?.content) {
          form.reset({
            title: parsed.title || '',
            content: parsed.content || '',
            imageUrl: parsed.imageUrl || '',
          });
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStorageKey, existingPrayer]);

  // === Guardado automático de borrador
  useEffect(() => {
    if (existingPrayer) return;

    const interval = setInterval(() => {
      const values = form.getValues();
      if (values.title.trim() || values.content.trim()) {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(values));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [draftStorageKey, existingPrayer, form]);

  // === Relleno / limpieza al cambiar modo o elemento
  useEffect(() => {
    if (existingPrayer) {
      const variants = existingPrayer.content && typeof existingPrayer.content === 'object'
        ? { ...existingPrayer.content }
        : null;
      const preferredVariant = variants
        ? Object.keys(variants).find((key) => key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('espan'))
          ?? Object.keys(variants)[0]
          ?? null
        : null;
      setContentVariants(variants);
      setActiveContentVariant(preferredVariant);
      form.reset({
        title: existingPrayer.title || '',
        content: typeof existingPrayer.content === 'string'
          ? existingPrayer.content
          : preferredVariant
            ? variants?.[preferredVariant] ?? ''
            : '',
        imageUrl: existingPrayer.imageUrl || '',
      });
    } else {
      setContentVariants(null);
      setActiveContentVariant(null);
      form.reset({
        title: '',
        content: '',
        imageUrl: '',
      });
    }
    setSelectedImageFileName(null);
    setFinalCroppedImage(null);
    setImageToCrop(null);
    setIsCropperOpen(false);
    setShowAppImages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPrayer?.id, formType]);

  // === Limpieza al desmontar
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      form.reset({
        title: '',
        content: '',
        imageUrl: '',
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!finalCroppedImage) return;
    form.setValue('imageUrl', finalCroppedImage, { shouldValidate: true });
  }, [finalCroppedImage, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) return;
    if (!isPrayerGroup && !data.content.trim()) {
      form.setError('content', { message: 'El contenido es requerido.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const content = contentVariants && activeContentVariant
        ? { ...contentVariants, [activeContentVariant]: data.content }
        : data.content;
      await Promise.resolve(onSave({ ...data, content }));
      window.localStorage.removeItem(draftStorageKey);
      form.reset({ title: '', content: '', imageUrl: '' });
      if (!unmountedRef.current) {
        onCancel();
      }
    } finally {
      if (!unmountedRef.current) setIsSubmitting(false);
    }
  };

  const titlePlaceholder =
    formType === 'devotion'
      ? 'Título de la devoción'
      : formType === 'letter'
      ? 'Título de la carta'
      : 'Título de la oración';

  const contentPlaceholder =
    formType === 'devotion'
      ? 'Escribe tu devoción aquí...'
      : formType === 'letter'
      ? 'Escribe tu carta aquí...'
      : 'Escribe tu oración aquí...';

  // === Render principal ===
  return (
    <>
      <Card className="bg-card shadow-md border-border/50">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="p-6 space-y-4">
            {/* === Campo título === */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder={titlePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* === Campo contenido === */}
            {!isPrayerGroup ? (
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Contenido</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => setShowPreview((p) => !p)}
                      title="Mostrar vista previa"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  {contentVariants && activeContentVariant ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(contentVariants).map((variant) => (
                        <Button
                          key={variant}
                          type="button"
                          size="sm"
                          variant={variant === activeContentVariant ? 'default' : 'outline'}
                          onClick={() => {
                            const currentValue = form.getValues('content');
                            setContentVariants((current) => current
                              ? { ...current, [activeContentVariant]: currentValue }
                              : current);
                            setActiveContentVariant(variant);
                            form.setValue('content', contentVariants[variant] ?? '', { shouldDirty: false });
                          }}
                        >
                          {variant}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  <FormControl>
                    <Textarea
                      placeholder={contentPlaceholder}
                      className="min-h-[200px]"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (activeContentVariant) {
                          const value = event.target.value;
                          setContentVariants((current) => current
                            ? { ...current, [activeContentVariant]: value }
                            : current);
                        }
                      }}
                      disabled={!isContentEditable}
                    />
                  </FormControl>

                  {/* ⚡ Vista previa en tiempo real */}
                  {showPreview && (
                    <div className="mt-4 p-3 border rounded-md bg-muted/40 text-sm leading-relaxed text-foreground/90">
                      {renderText(field.value || '')}
                    </div>
                  )}

                  {!isContentEditable && (
                    <p className="text-sm text-muted-foreground mt-1">
                      La edición de oraciones con múltiples partes o suboraciones no está soportada
                      para usuarios estándar. Active el modo desarrollador.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            ) : null}

            {/* === Campo imagen === */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen (opcional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <input
                        id="prayer-image-file"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            field.onChange('');
                            setSelectedImageFileName(null);
                            setFinalCroppedImage(null);
                            return;
                          }
                          field.onChange('');
                          setSelectedImageFileName(file.name);
                          setFinalCroppedImage(null);
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setImageToCrop(result);
                            setIsCropperOpen(true);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <label htmlFor="prayer-image-file" className="cursor-pointer">
                            Elegir de la galería
                          </label>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAppImages((current) => !current)}
                        >
                          <Images className="mr-2 size-4" />
                          Elegir de la app
                        </Button>
                      </div>
                      {showAppImages ? (
                        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-3">
                          {appImages.map((image) => (
                            <button
                              key={`${image.id}-${image.imageUrl}`}
                              type="button"
                              className="overflow-hidden rounded-md border border-border bg-card text-left transition-colors hover:border-primary"
                              onClick={() => {
                                field.onChange(image.imageUrl);
                                setSelectedImageFileName(image.description || 'Imagen de la app');
                                setFinalCroppedImage(null);
                                setShowAppImages(false);
                              }}
                            >
                              <span
                                role="img"
                                aria-label={image.description || 'Imagen de la app'}
                                className="block aspect-video w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${JSON.stringify(image.imageUrl)})` }}
                              />
                              <span className="block truncate px-2 py-1.5 text-xs">{image.description}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {field.value || selectedImageFileName ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground font-body break-all flex-1">
                            {selectedImageFileName || 'Imagen cargada'} {finalCroppedImage ? '(Recortada)' : ''}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              field.onChange('');
                              setSelectedImageFileName(null);
                              setFinalCroppedImage(null);
                              setImageToCrop(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          {/* === Botones === */}
          <CardFooter className="flex justify-end gap-2 p-6 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset({ title: '', content: '', imageUrl: '' });
                setSelectedImageFileName(null);
                onCancel();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </CardFooter>
        </form>
      </Form>
      </Card>
      {isCropperOpen && (
      <ImageCropper
        imageSrc={imageToCrop}
        onCropComplete={(croppedImage) => {
          setFinalCroppedImage(croppedImage);
          setIsCropperOpen(false);
          setImageToCrop(null);
        }}
        onCancel={() => {
          setIsCropperOpen(false);
          setImageToCrop(null);
          setFinalCroppedImage(null);
          form.setValue('imageUrl', '');
          setSelectedImageFileName(null);
        }}
        isOpen={isCropperOpen}
        aspect={16 / 9}
      />
      )}
    </>
  );
}
