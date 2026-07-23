import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Jaculatoria } from '@/lib/rosary-immersive/types';

type JaculatoriasMenuOverlayProps = {
  show: boolean;
  onClose: () => void;
  jaculatorias: Jaculatoria[];
  newJaculatoria: Jaculatoria;
  setNewJaculatoria: Dispatch<SetStateAction<Jaculatoria>>;
  addJaculatoria: () => void;
  updateJaculatoria: (index: number, field: 'v' | 'r', value: string) => void;
  removeJaculatoria: (index: number) => void;
};

export function JaculatoriasMenuOverlay({
  show,
  onClose,
  jaculatorias,
  newJaculatoria,
  setNewJaculatoria,
  addJaculatoria,
  updateJaculatoria,
  removeJaculatoria,
}: JaculatoriasMenuOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-16 left-4 right-4 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-2xl p-4 z-50 max-w-md mx-auto"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Jaculatorias</h3>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="size-4" /></Button>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <input
              value={newJaculatoria.v}
              onChange={(e) => setNewJaculatoria((prev) => ({ ...prev, v: e.target.value }))}
              placeholder="V. ..."
              className="w-full bg-background border rounded px-3 py-2 text-sm"
              name="rosary-new-jaculatoria-v"
              aria-label="Nueva jaculatoria V"
            />
            <input
              value={newJaculatoria.r}
              onChange={(e) => setNewJaculatoria((prev) => ({ ...prev, r: e.target.value }))}
              placeholder="F. ..."
              className="w-full bg-background border rounded px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addJaculatoria()}
              name="rosary-new-jaculatoria-r"
              aria-label="Nueva jaculatoria F"
            />
            <Button size="sm" onClick={addJaculatoria}><Plus className="size-4" /></Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {jaculatorias.map((item, i) => (
              <div key={i} className="space-y-2 bg-muted/50 p-2 rounded">
                <div className="flex items-center gap-2">
                  <input
                    value={item.v}
                    onChange={(e) => updateJaculatoria(i, 'v', e.target.value)}
                    placeholder="V. ..."
                    className="flex-1 bg-background border rounded px-3 py-2 text-sm"
                    name={`rosary-jaculatoria-${i}-v`}
                    aria-label={`Jaculatoria ${i + 1} V`}
                  />
                  <button
                    onClick={() => removeJaculatoria(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <input
                  value={item.r}
                  onChange={(e) => updateJaculatoria(i, 'r', e.target.value)}
                  placeholder="F. ..."
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  name={`rosary-jaculatoria-${i}-r`}
                  aria-label={`Jaculatoria ${i + 1} F`}
                />
              </div>
            ))}
            {jaculatorias.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Agrega jaculatorias para el cierre del rosario.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
