import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TimerFinishedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TimerFinishedDialog({ open, onOpenChange }: TimerFinishedDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¡Tiempo terminado!</AlertDialogTitle>
          <AlertDialogDescription>
            Tu tiempo de oración ha concluido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogAction onClick={() => onOpenChange(false)}>
          Aceptar
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
