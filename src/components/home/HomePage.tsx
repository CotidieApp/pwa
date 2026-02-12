"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import type { TouchEvent } from "react";
import type { Category, Quote } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";
import CategoryList from "@/components/CategoryList";
import { catholicQuotes } from "@/lib/quotes";
import { getImageObjectPosition } from "@/lib/image-display";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronRight, Edit, Trash2 } from "lucide-react";

interface HomePageProps {
  onSelectCategory: (category: Category) => void;
  onOpenCustomPlan: (slot: 1 | 2 | 3 | 4, options?: { edit?: boolean; openFirstPrayer?: boolean }) => void;
  onCreateCustomPlan: (slot: 1 | 2 | 3 | 4, name: string) => void;
}

interface EasterEggQuote {
  id: number;
  text: string;
  author: string;
}

export default function HomePage({ onSelectCategory, onOpenCustomPlan, onCreateCustomPlan }: HomePageProps) {
  const settings = useSettings();

  const {
    homeBackgroundId,
    userQuotes,
    simulatedQuoteId,
    categories,
    allHomeBackgrounds,
    quoteOfTheDay: rawQuoteOfTheDay,
    shownEasterEggQuoteIds,
    registerEasterEggQuote,
    customPlans,
    deleteCustomPlan,
  } = settings || {};

  const [easterEggQuotes, setEasterEggQuotes] = useState<EasterEggQuote[]>([]);
  const [isCustomPlansVisible, setIsCustomPlansVisible] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [createPlanSlot, setCreatePlanSlot] = useState<(1 | 2 | 3 | 4) | null>(null);
  const [createPlanName, setCreatePlanName] = useState("");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const bgImage = allHomeBackgrounds?.find((img) => img.id === homeBackgroundId);

  const quoteOfTheDay = useMemo(() => {
    if (!settings) return null;
    if (!simulatedQuoteId) return rawQuoteOfTheDay;

    const allQuotes: Quote[] = [
      ...catholicQuotes.map((q, i) => ({ ...q, id: `cq_${i}` })),
      ...(userQuotes || []),
    ];

    return allQuotes.find((q) => q.id === simulatedQuoteId) || rawQuoteOfTheDay;
  }, [rawQuoteOfTheDay, simulatedQuoteId, userQuotes, settings]);

  const triggerEasterEgg = useCallback(() => {
    if (!settings || !registerEasterEggQuote) return;

    const allQuotesWithIds: Quote[] = [
      ...catholicQuotes.map((q, i) => ({ ...q, id: `cq_${i}` })),
      ...(userQuotes || []),
    ];

    let availableQuotes = allQuotesWithIds.filter(
      (q) => !(shownEasterEggQuoteIds || []).includes(q.id!)
    );

    if (availableQuotes.length === 0) {
      registerEasterEggQuote(null, true);
      availableQuotes = allQuotesWithIds;
    }

    const randomQuote =
      availableQuotes[Math.floor(Math.random() * availableQuotes.length)];

    if (randomQuote) {
      registerEasterEggQuote(randomQuote.id!);
      const newQuote: EasterEggQuote = {
        id: Date.now(),
        text: randomQuote.text,
        author: randomQuote.author,
      };
      setEasterEggQuotes((prev) => [...prev, newQuote]);
      setTimeout(() => {
        setEasterEggQuotes((prev) =>
          prev.filter((q) => q.id !== newQuote.id)
        );
      }, 15000);
    }
  }, [userQuotes, shownEasterEggQuoteIds, registerEasterEggQuote, settings]);

  if (!settings) {
    return <div className="h-full w-full bg-background" />;
  }

  const objectPosition = getImageObjectPosition(bgImage?.id);

  const handleTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchMove = (e: TouchEvent) => {
    const start = touchStartRef.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > 40) return;
    if (dx < -70) {
      setIsCustomPlansVisible(true);
      touchStartRef.current = null;
    }
    if (dx > 70) {
      setIsCustomPlansVisible(false);
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const start = touchStartRef.current;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > 40) {
      touchStartRef.current = null;
      return;
    }
    if (dx < -70) setIsCustomPlansVisible(true);
    if (dx > 70) setIsCustomPlansVisible(false);
    touchStartRef.current = null;
  };

  const handleRequestCreatePlan = (slot: 1 | 2 | 3 | 4) => {
    setCreatePlanSlot(slot);
    setCreatePlanName("");
    setIsCreatePlanOpen(true);
  };

  const handleConfirmCreatePlan = () => {
    if (!createPlanSlot) return;
    const trimmed = createPlanName.trim();
    if (!trimmed) return;
    onCreateCustomPlan(createPlanSlot, trimmed);
    setIsCreatePlanOpen(false);
  };

  return (
    <>
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <div
          className="h-full w-full bg-cover bg-no-repeat transition-all duration-500"
          style={{
            backgroundImage: "var(--home-bg-image)",
            backgroundPosition: objectPosition,
          }}
          data-ai-hint={bgImage?.imageHint}
        />
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex flex-col h-[100svh] min-h-[100svh] pt-[env(safe-area-inset-top)] text-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          aria-label="Cambiar menú"
          className="absolute right-0 top-0 z-30 h-[9px] w-[9px] opacity-0 focus:outline-none"
          onClick={() => setIsCustomPlansVisible((v) => !v)}
        />
        <main className="flex flex-col flex-1 min-h-0 items-center justify-center text-center px-4 py-[clamp(0.75rem,2vh,1.5rem)]">
          <div className="md:max-w-md mx-auto">
            <h1 className="!text-[clamp(4.25rem,18vw,7.25rem)] leading-none font-premium text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.9)] transition-opacity duration-300">
              <span
                role="button"
                tabIndex={0}
                className="inline-block w-fit cursor-pointer select-none"
                onClick={triggerEasterEgg}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerEasterEgg();
                  }
                }}
              >
                Cotidie
              </span>
            </h1>

            {quoteOfTheDay && (
              <div className="mt-[clamp(0.75rem,2vh,1.5rem)]">
                <blockquote className="text-white/95 text-[clamp(1.15rem,4.8vw,1.65rem)] leading-snug italic whitespace-normal break-words [text-shadow:0_10px_40px_rgba(0,0,0,1),0_4px_14px_rgba(0,0,0,1)]">
                  “{quoteOfTheDay.text}”
                </blockquote>
                <p className="text-white/95 text-[clamp(1rem,4vw,1.25rem)] mt-[clamp(0.35rem,1vh,0.5rem)] [text-shadow:0_10px_40px_rgba(0,0,0,1),0_4px_14px_rgba(0,0,0,1)]">
                  – {quoteOfTheDay.author}
                </p>
              </div>
            )}
          </div>
        </main>

        <footer className="w-full md:max-w-md mx-auto px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-hidden">
          <div
            className={[
              "flex w-full transform-gpu transition-transform duration-300 ease-out",
              isCustomPlansVisible ? "-translate-x-full" : "translate-x-0",
            ].join(" ")}
          >
            <div
              className={[
                "w-full shrink-0 px-[clamp(1rem,4vw,1.5rem)]",
                isCustomPlansVisible ? "pointer-events-none" : "pointer-events-auto",
              ].join(" ")}
            >
              {categories && <CategoryList categories={categories} onSelectCategory={onSelectCategory} />}
            </div>

            <div
              className={[
                "w-full shrink-0 px-[clamp(1rem,4vw,1.5rem)]",
                isCustomPlansVisible ? "pointer-events-auto" : "pointer-events-none",
              ].join(" ")}
            >
              <div className="space-y-[clamp(0.35rem,1.2vh,0.5rem)]">
                {([1, 2, 3, 4] as const).map((slot) => {
                  const plan = customPlans?.[slot - 1] || null;
                  return (
                    <Card
                      key={slot}
                      className="bg-card/80 shadow-lg backdrop-blur-sm border-border/50 p-[clamp(0.6rem,1.8vh,0.75rem)] min-h-[clamp(56px,9vh,72px)] flex items-center justify-between cursor-pointer hover:bg-accent/20 transition-colors"
                      onClick={() =>
                        plan ? onOpenCustomPlan(slot, { openFirstPrayer: true }) : handleRequestCreatePlan(slot)
                      }
                    >
                      {plan ? (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="text-accent bg-accent/10 rounded-lg font-headline h-[clamp(40px,7vh,48px)] w-[clamp(40px,7vh,48px)] flex items-center justify-center text-[clamp(1rem,4vw,1.125rem)]">
                              {slot}
                            </div>
                            <div className="flex flex-col">
                              <h2 className="font-headline text-[clamp(0.95rem,3.4vw,1rem)] leading-tight text-foreground">{plan.name}</h2>
                              <div className="text-[clamp(0.7rem,2.6vw,0.75rem)] text-muted-foreground">{`${plan.prayerIds.length} oraciones`}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-primary"
                              aria-label="Editar plan"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCustomPlan(slot, { edit: true });
                              }}
                            >
                              <Edit className="size-4" />
                            </Button>

                            {deleteCustomPlan && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                    aria-label="Eliminar plan"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        deleteCustomPlan(slot);
                                      }}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            <ChevronRight className="size-6 text-muted-foreground" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-4 w-full">
                          <div className="text-accent bg-accent/10 rounded-lg font-headline h-[clamp(40px,7vh,48px)] w-[clamp(40px,7vh,48px)] flex items-center justify-center text-[clamp(1rem,4vw,1.125rem)]">
                            {slot}
                          </div>
                          <div className="flex flex-col">
                            <div className="h-[clamp(1.1rem,3.4vw,1.25rem)]" />
                            <div className="h-[clamp(0.7rem,2.6vw,0.75rem)]" />
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <Dialog
        open={isCreatePlanOpen}
        onOpenChange={(open) => {
          setIsCreatePlanOpen(open);
          if (!open) {
            setCreatePlanSlot(null);
            setCreatePlanName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear plan</DialogTitle>
            <DialogDescription>Escribe un nombre para tu plan.</DialogDescription>
          </DialogHeader>
          <Input
            value={createPlanName}
            onChange={(e) => setCreatePlanName(e.target.value)}
            placeholder="Nombre del plan"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmCreatePlan();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCreatePlan} disabled={createPlanName.trim().length === 0}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {easterEggQuotes.length > 0 && (
        <div className="enjoy-animation-container pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-20">
          {easterEggQuotes.map((quote) => (
            <div
              key={quote.id}
              className="enjoy-balloon text-center max-w-xs bg-black/50 rounded-xl p-4 text-white shadow-lg animate-bounce"
            >
              <p>"{quote.text}"</p>
              <p className="text-sm mt-1">- {quote.author}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
