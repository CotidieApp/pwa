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
import type { StoredSpiritualAudioItem } from '@/components/main/spiritualAudio';

type AudioDeleteDialogProps = {
  audioPendingDelete: StoredSpiritualAudioItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
};

export function AudioDeleteDialog({ audioPendingDelete, onOpenChange, onConfirmDelete }: AudioDeleteDialogProps) {
  return (
    <AlertDialog
      open={Boolean(audioPendingDelete)}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar audio</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que deseas eliminar "{audioPendingDelete?.title}" de tu biblioteca?
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
