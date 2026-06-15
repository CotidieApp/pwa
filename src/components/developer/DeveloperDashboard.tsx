'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSettings, type DevTraceEvent, type UserStats } from '@/context/SettingsContext';
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
import AnnuumStory from '@/components/AnnuumStory';
import MassStreakSparkPreview from '@/components/developer/MassStreakSparkPreview';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

interface DeveloperDashboardProps {
  onBack: () => void;
}

type DevTab = 'status' | 'metrics' | 'content' | 'trace';

export default function DeveloperDashboard({ onBack }: DeveloperDashboardProps) {
  const {
    resetSettings,
    hardResetApp,
    forceAnnuumSeason,
    setForceAnnuumSeason,
    showZeroStats,
    setShowZeroStats,
    realUserStats,
    simulatedStats,
    setSimulatedStats,
    globalUserStats,
    logoutDeveloper,
    simulatedDate,
    setSimulatedDate,
    userQuotes,
    addUserQuote,
    removeUserQuote,
    simulatedQuoteId,
    setSimulatedQuoteId,
    incrementStat,
    movableFeastsEnabled,
    setMovableFeastsEnabled,
    devTestNotificationEnabled,
    setDevTestNotificationEnabled,
    devLiveTraceEnabled,
    setDevLiveTraceEnabled,
    devLiveTraceEvents,
    clearDevLiveTraceEvents,
    allPrayers,
    userHomeBackgrounds,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<DevTab>('status');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAnnuumPreview, setShowAnnuumPreview] = useState(false);
  const [showMassStreakPreview, setShowMassStreakPreview] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePlaceholder | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: { text: '', author: '' },
  });

  const onAddQuote: SubmitHandler<QuoteFormValues> = (data) => {
    addUserQuote(data);
    form.reset();
    toast({ title: 'Cita agregada correctamente.' });
  };

  const handleLogout = () => {
    logoutDeveloper();
    onBack();
  };

  const handleImageSelection = (id: string | null) => {
    if (!id) {
      setSelectedImage(null);
      return;
    }
    const allImages = [...PlaceHolderImages, ...userHomeBackgrounds, ...allPrayers.filter(p => p.imageUrl).map(p => ({ id: p.id!, imageUrl: p.imageUrl!, description: p.title, imageHint: p.imageHint }))]
    const foundImage = allImages.find(img => img.id === id);
    setSelectedImage(foundImage || null);
    setIsImageViewerOpen(true);
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
            active={activeTab === 'status'}
            onClick={() => { setActiveTab('status'); setIsSidebarOpen(false); }}
            icon={Icon.Activity} 
            label="Estado"
          />
          <NavButton 
            active={activeTab === 'metrics'}
            onClick={() => { setActiveTab('metrics'); setIsSidebarOpen(false); }}
            icon={Icon.Database} 
            label="Métricas"
          />
          <NavButton 
            active={activeTab === 'content'} 
            onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }} 
            icon={Icon.Files} 
            label="Contenido" 
          />
          <NavButton
            active={activeTab === 'trace'}
            onClick={() => { setActiveTab('trace'); setIsSidebarOpen(false); }}
            icon={Icon.ActivitySquare}
            label="Trazas"
          />
          <div className="mt-auto pt-2 border-t border-slate-800">
            <NavButton 
              active={false} 
              onClick={handleLogout} 
              icon={Icon.LogOut} 
              label="Cerrar"
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
            
            {activeTab === 'status' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    title="Modo"
                    value={simulatedStats ? "SIMULADO" : "PROD"}
                    icon={Icon.Zap}
                    color={simulatedStats ? "text-yellow-500" : "text-green-500"}
                  />
                  <StatCard 
                    title="Oraciones Hoy"
                    value={realUserStats.totalPrayersOpened} 
                    icon={Icon.CheckCircle2}
                  />
                  <StatCard 
                    title="Versión Core"
                    value={appVersion}
                    icon={Icon.Cpu}
                  />
                </div>

                <Card className="bg-slate-900 border-slate-800 text-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon.Settings className="size-4" /> Configuración de Sesión
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Simular Fecha</Label>
                        <p className="text-xs text-slate-400">Afecta santoral y rotación de fondos.</p>
                      </div>
                      <div className="flex items-center gap-2">
                         {simulatedDate && (
                            <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                               {format(new Date(simulatedDate), 'dd/MM/yyyy')}
                            </span>
                         )}
                         <Button
                            variant="outline"
                            size="sm"
                            className="bg-slate-950 border-slate-700 h-8"
                            onClick={() => setSimulatedDate(simulatedDate ? null : new Date().toISOString())}
                         >
                            {simulatedDate ? 'Reset' : 'Activar'}
                         </Button>
                      </div>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Temporada Annuum</Label>
                        <p className="text-xs text-slate-400">Burbuja de resumen activa.</p>
                      </div>
                      <Switch checked={forceAnnuumSeason} onCheckedChange={setForceAnnuumSeason} />
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Trazas en Tiempo Real</Label>
                        <p className="text-xs text-slate-400">Captura errores y navegación.</p>
                      </div>
                      <Switch checked={devLiveTraceEnabled} onCheckedChange={setDevLiveTraceEnabled} />
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 text-destructive font-bold">Reseteo Maestro</div>
                      <div className="flex gap-2">
                         <Button variant="outline" size="sm" className="border-red-900/50 hover:bg-red-950/20" onClick={resetSettings}>Ajustes</Button>
                         <Button variant="destructive" size="sm" onClick={hardResetApp}>TODO</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'metrics' && (
               <div className="space-y-6">
                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                          <CardTitle>Contadores Anuales</CardTitle>
                          <CardDescription className="text-slate-400">Datos registrados en el ciclo actual.</CardDescription>
                       </div>
                       {simulatedStats && <Button variant="ghost" size="sm" className="text-yellow-500" onClick={() => setSimulatedStats(null)}>Limpiar Simulación</Button>}
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <MetricInput label="Misa (Racha)" value={realUserStats.massStreak} onChange={v => setSimulatedStats({ ...realUserStats, massStreak: v })} />
                       <MetricInput label="Misa (Días)" value={realUserStats.massDaysCount} onChange={v => setSimulatedStats({ ...realUserStats, massDaysCount: v })} />
                       <MetricInput label="Rosarios" value={realUserStats.rosaryCount} onChange={v => setSimulatedStats({ ...realUserStats, rosaryCount: v })} />
                       <MetricInput label="Ángelus" value={realUserStats.angelusCount} onChange={v => setSimulatedStats({ ...realUserStats, angelusCount: v })} />
                       <MetricInput label="Días Activo" value={realUserStats.daysActive} onChange={v => setSimulatedStats({ ...realUserStats, daysActive: v })} />
                       <MetricInput label="Exámenes" value={realUserStats.examinationCount} onChange={v => setSimulatedStats({ ...realUserStats, examinationCount: v })} />
                       <MetricInput label="Citas Santos" value={realUserStats.saintQuotesOpened} onChange={v => setSimulatedStats({ ...realUserStats, saintQuotesOpened: v })} />
                       <MetricInput label="Cartas" value={realUserStats.lettersWritten} onChange={v => setSimulatedStats({ ...realUserStats, lettersWritten: v })} />
                    </CardContent>
                 </Card>

                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                   <CardHeader>
                      <CardTitle>Histórico Global</CardTitle>
                      <CardDescription className="text-slate-400">Total acumulado desde la instalación.</CardDescription>
                   </CardHeader>
                   <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Días Totales</div>
                         <div className="text-xl font-bold">{globalUserStats.daysActive}</div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Oraciones Totales</div>
                         <div className="text-xl font-bold">{globalUserStats.totalPrayersOpened}</div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Rosarios</div>
                         <div className="text-xl font-bold">{globalUserStats.rosaryCount}</div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                         <div className="text-[10px] text-slate-500 uppercase">Misa</div>
                         <div className="text-xl font-bold">{globalUserStats.massDaysCount}</div>
                      </div>
                   </CardContent>
                 </Card>

                 <div className="grid gap-3 md:grid-cols-2">
                    <Button variant="outline" className="bg-indigo-950/20 border-indigo-900/50 text-indigo-400" onClick={() => setShowAnnuumPreview(true)}>
                       <Icon.Play className="mr-2 size-4" /> Simular Cotidie Annuum
                    </Button>
                    <Button variant="outline" className="bg-amber-950/20 border-amber-900/50 text-amber-400" onClick={() => setShowMassStreakPreview(true)}>
                       <Icon.Flame className="mr-2 size-4" /> Simular Racha de Misa
                    </Button>
                 </div>
               </div>
            )}

            {activeTab === 'content' && (
               <div className="space-y-6">
                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                   <CardHeader>
                      <CardTitle>Utilidades de Contenido</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Button variant="outline" className="bg-slate-950 border-slate-800" onClick={() => {
                            const ics = generateSaintsICS();
                            const blob = new Blob([ics], { type: 'text/calendar' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'cotidie-saints.ics';
                            a.click();
                         }}>
                            <Icon.Calendar className="mr-2 size-4" /> Exportar Calendario ICS
                         </Button>
                         <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                            <Label>Fiestas Móviles</Label>
                            <Switch checked={movableFeastsEnabled} onCheckedChange={setMovableFeastsEnabled} />
                         </div>
                      </div>
                   </CardContent>
                 </Card>

                 <Card className="bg-slate-900 border-slate-800 text-slate-200">
                   <CardHeader>
                      <CardTitle>Explorador de Medios</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {PlaceHolderImages.map(img => (
                          <div key={img.id} className="group relative aspect-video cursor-pointer overflow-hidden rounded border border-slate-800" onClick={() => handleImageSelection(img.id)}>
                            <Image src={img.imageUrl} alt={img.id} fill className="object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">{img.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                   </CardContent>
                 </Card>
               </div>
            )}

            {activeTab === 'trace' && (
              <Card className="bg-slate-900 border-slate-800 text-slate-200 h-[60vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between shrink-0">
                  <div>
                    <CardTitle>Log de Eventos</CardTitle>
                    <CardDescription className="text-slate-400">Monitor en vivo de la aplicación.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearDevLiveTraceEvents} className="text-slate-400 hover:text-red-400">
                    <Icon.Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 p-4 bg-slate-950/50">
                  {devLiveTraceEvents.length === 0 ? (
                    <div className="text-slate-600 italic">No hay eventos registrados...</div>
                  ) : (
                    devLiveTraceEvents.map((ev) => (
                      <div key={ev.id} className={cn("border-l-2 pl-2 py-0.5",
                        ev.level === 'error' ? "border-red-500 text-red-400" :
                        ev.level === 'warn' ? "border-yellow-500 text-yellow-400" :
                        "border-slate-700 text-slate-400")}>
                        <span className="opacity-50">[{new Date(ev.ts).toLocaleTimeString()}]</span>{" "}
                        <span className="font-bold">[{ev.source.toUpperCase()}]</span>: {ev.message}
                        {ev.data && <div className="ml-4 opacity-70 break-all">{ev.data}</div>}
                      </div>
                    )).reverse()
                  )}
                </CardContent>
              </Card>
            )}
            
          </div>
        </div>
      </div>
      
        {showAnnuumPreview && (
           <div className="fixed inset-0 z-[100] bg-black">
               <Button 
                  className="absolute top-4 right-4 z-[110] bg-white text-black hover:bg-gray-200"
                 onClick={() => setShowAnnuumPreview(false)}
               >
                  Salir
               </Button>
              <AnnuumStory onClose={() => setShowAnnuumPreview(false)} />
           </div>
        )}

        {showMassStreakPreview && <MassStreakSparkPreview onClose={() => setShowMassStreakPreview(false)} />}
  
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
                "flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors w-full text-left",
                variant === 'destructive' 
                    ? "text-red-400 hover:bg-red-950/30" 
                    : active 
                        ? "bg-slate-800 text-white font-medium" 
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
        >
            <Icon className="size-4" />
            <span>{label}</span>
        </button>
    )
}

function StatCard({ title, value, icon: Icon, color, className }: { title: string, value: string | number, icon: any, color?: string, className?: string }) {
    return (
        <Card className={cn("bg-slate-900 border-slate-800", className)}>
            <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-full bg-slate-950 border border-slate-800", color || "text-slate-400")}>
                    <Icon className="size-5" />
                </div>
                <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{title}</div>
                    <div className={cn("text-xl font-black text-slate-200")}>{value}</div>
                </div>
            </CardContent>
        </Card>
    )
}

function MetricInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-1">
            <Label className="text-[10px] text-slate-500 uppercase">{label}</Label>
            <Input
                type="number"
                value={value}
                onChange={e => {
                    const v = parseInt(e.target.value);
                    onChange(isNaN(v) ? 0 : v);
                }}
                className="bg-slate-950 border-slate-800 h-8 text-sm"
            />
        </div>
    )
}
