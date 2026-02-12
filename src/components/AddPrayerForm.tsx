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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Info, Eye } from 'lucide-react';
import { renderText } from '@/lib/textFormatter';

const formSchema = z.object({
  title: z.string().min(1, { message: 'El título es requerido.' }),
  content: z.string().min(1, { message: 'El contenido es requerido.' }),
  imageUrl: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.startsWith('/images/') || val.startsWith('data:image/'), {
      message: 'Debe ser una ruta local (/images/) o una imagen local seleccionada.',
    }),
});

type FormValues = z.infer<typeof formSchema>;
type FormType = 'devotion' | 'entry' | 'letter' | 'predefined';

type AddPrayerFormProps = {
  onSave: (data: FormValues) => void;
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
  const { isDeveloperMode } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedImageFileName, setSelectedImageFileName] = useState<string | null>(null);
  const unmountedRef = useRef(false);

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

  // === Relleno / limpieza al cambiar modo o elemento
  useEffect(() => {
    if (existingPrayer) {
      form.reset({
        title: existingPrayer.title || '',
        content:
          typeof existingPrayer.content === 'string'
            ? existingPrayer.content
            : '',
        imageUrl: existingPrayer.imageUrl || '',
      });
    } else {
      form.reset({
        title: '',
        content: '',
        imageUrl: '',
      });
    }
    setSelectedImageFileName(null);
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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(data));
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
    <Card className="bg-card shadow-md border-border/50 animate-in fade-in-0 duration-500">
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

                  <FormControl>
                    <Textarea
                      placeholder={contentPlaceholder}
                      className="min-h-[200px]"
                      {...field}
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
                            return;
                          }
                          setSelectedImageFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            field.onChange(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <Button asChild variant="outline" size="sm">
                        <label htmlFor="prayer-image-file" className="cursor-pointer">
                          Seleccionar imagen
                        </label>
                      </Button>
                      {selectedImageFileName ? (
                        <p className="text-xs text-muted-foreground font-body break-all">
                          {selectedImageFileName}
                        </p>
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
  );
}
