import type { MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AudioRenameDialogProps = {
  open: boolean;
  onClose: () => void;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  value: string;
  onChangeValue: (value: string) => void;
  onSubmit: () => void;
};

export function AudioRenameDialog({
  open,
  onClose,
  inputRef,
  value,
  onChangeValue,
  onSubmit,
}: AudioRenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar nombre visible</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Nombre visible del audio"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={value.trim().length === 0}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
