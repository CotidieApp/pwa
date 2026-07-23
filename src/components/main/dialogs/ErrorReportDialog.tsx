import * as Icon from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ErrorReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ErrorReportDialog({ open, onOpenChange }: ErrorReportDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center font-headline text-xl">Reporte de error</AlertDialogTitle>
          <AlertDialogDescription className="text-center pt-2">
            ¿Detectaste algún fallo en Cotidie? <br/>
            Selecciona una vía para informar al desarrollador:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-4 py-6">
          <button
            onClick={() => {
              window.location.href = "mailto:cotidieapp@gmail.com?subject=Reporte de error";
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500/20 transition-colors">
              <Icon.Mail className="size-7" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
          </button>

          <button
            onClick={() => {
              window.location.href = "https://wa.me/56929474804?text=Reporte%20de%20error:";
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="size-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 group-hover:bg-green-500/20 transition-colors">
              <Icon.MessageCircle className="size-7" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</span>
          </button>

          <button
            onClick={() => {
              const username = 'cotidieapp';
              const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              if (isMobile) {
                window.location.href = `https://ig.me/m/${username}`;
              } else {
                window.open(`https://instagram.com/${username}`, '_blank');
              }
              onOpenChange(false);
            }}
            className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
          >
            <div className="size-14 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600 group-hover:bg-pink-500/20 transition-colors">
              <Icon.Instagram className="size-7" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instagram</span>
          </button>
        </div>

        <div className="flex justify-center border-t pt-4">
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0 shadow-none px-8"
          >
            Cancelar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
