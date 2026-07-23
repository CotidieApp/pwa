import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

type LettersInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartasReminderEnabled: boolean;
  setCartasReminderEnabled: (enabled: boolean) => void;
};

export function LettersInfoDialog({
  open,
  onOpenChange,
  cartasReminderEnabled,
  setCartasReminderEnabled,
}: LettersInfoDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Información sobre Cartas</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Escribe una carta al Señor. Agradece lo vivido, pide claridad por lo que se viene,
                ruega ante una necesidad..., pero, sobre todo, háblale; no como un servidor a su señor,
                sino como un hijo a su Padre. Amor de Padre es el Suyo, no lo olvides.
              </p>
              <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="font-medium text-foreground">Recordatorio de Cartas</div>
                    <p className="text-xs text-foreground/75 leading-relaxed">
                      Si pasan 30 días sin escribir una carta nueva, Cotidie te enviará una notificación
                      para invitarte a retomar este hábito filial.
                    </p>
                  </div>
                  <Switch
                    checked={cartasReminderEnabled}
                    onCheckedChange={setCartasReminderEnabled}
                    aria-label="Activar recordatorio de Cartas"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * El contador se reinicia automáticamente al crear una carta nueva.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end">
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendido
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
