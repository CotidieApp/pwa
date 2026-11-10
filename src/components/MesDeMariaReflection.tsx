'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PrayerDetail from '@/components/PrayerDetail';
import { getMesDeMariaDayIndex, mesDeMariaReflections, MES_DE_MARIA_REFLECTION_ID } from '@/lib/mes-de-maria';

export default function MesDeMariaReflection() {
  const [index, setIndex] = useState(getMesDeMariaDayIndex);
  const [showInfo, setShowInfo] = useState(false);
  const reflection = mesDeMariaReflections[index];

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2">
        <Button variant="ghost" size="icon" aria-label="Reflexión del día anterior" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ChevronLeft className="size-5" /></Button>
        <p className="text-sm text-center" aria-live="polite">{reflection.day} de {reflection.month === 11 ? 'noviembre' : 'diciembre'}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Información sobre Pequeña reflexión" onClick={() => setShowInfo(true)}><Info className="size-5" /></Button>
          <Button variant="ghost" size="icon" aria-label="Reflexión del día siguiente" disabled={index === mesDeMariaReflections.length - 1} onClick={() => setIndex(i => i + 1)}><ChevronRight className="size-5" /></Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <PrayerDetail key={index} prayer={{
          id: `${MES_DE_MARIA_REFLECTION_ID}-${index + 1}`,
          title: reflection.title,
          categoryId: 'plan-de-vida',
          content: `*${reflection.title}*\n\n${reflection.content}`,
          imageUrl: '/images/immaculate-conception.jpeg',
        }} />
      </div>
      <AlertDialog open={showInfo} onOpenChange={setShowInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pequeña reflexión</AlertDialogTitle>
            <AlertDialogDescription>Esta es una recopilación hecha por la Pastoral Uandes para el Mes de María.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>Entendido</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
