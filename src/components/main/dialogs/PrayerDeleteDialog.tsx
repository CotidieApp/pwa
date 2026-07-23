import type { Prayer } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type PrayerDeleteDialogProps = {
  prayerPendingDelete: Prayer | null;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
};

export function PrayerDeleteDialog({ prayerPendingDelete, onOpenChange, onConfirmDelete }: PrayerDeleteDialogProps) {
  return (
    <AlertDialog
      open={Boolean(prayerPendingDelete)}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {prayerPendingDelete?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {prayerPendingDelete?.isUserDefined
              ? 'Esta acción eliminará permanentemente este contenido.'
              : 'Este contenido se ocultará y podrá restaurarse desde Control de Contenido.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirmDelete}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
