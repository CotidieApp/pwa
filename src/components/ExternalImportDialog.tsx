'use client';

import React, { useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';

export default function ExternalImportDialog({ onConfirm, onCancel }: {
  onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const applying = useRef(false);
  return <AlertDialog open onOpenChange={open => { if (!open && !applying.current) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Importar archivo recibido</AlertDialogTitle>
        <AlertDialogDescription>
          El archivo recibido desde otra aplicación puede reemplazar los ajustes, planes y contenido
          personal que incluye. Los datos que no incluya se conservarán. ¿Quieres aplicarlo?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy} onClick={onCancel}>Cancelar</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={async event => {
          event.preventDefault();
          if (applying.current) return;
          applying.current = true;
          setBusy(true);
          await onConfirm();
        }}>{busy ? 'Importando…' : 'Importar'}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
