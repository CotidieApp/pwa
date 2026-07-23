import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type IntentionsMenuOverlayProps = {
  show: boolean;
  onClose: () => void;
  intentions: string[];
  newIntention: string;
  setNewIntention: Dispatch<SetStateAction<string>>;
  addIntention: () => void;
  removeIntention: (index: number) => void;
};

export function IntentionsMenuOverlay({
  show,
  onClose,
  intentions,
  newIntention,
  setNewIntention,
  addIntention,
  removeIntention,
}: IntentionsMenuOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-16 left-4 right-4 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-2xl p-4 z-50 max-w-sm mx-auto"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Mis Intenciones</h3>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="size-4" /></Button>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={newIntention}
              onChange={(e) => setNewIntention(e.target.value)}
              placeholder="Nueva intención..."
              className="flex-1 bg-background border rounded px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addIntention()}
              name="rosary-new-intention"
              aria-label="Nueva intención"
            />
            <Button size="sm" onClick={addIntention}><Plus className="size-4" /></Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {intentions.map((int, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded group">
                <span className="truncate flex-1 font-medium">{int}</span>
                <button onClick={() => removeIntention(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
              </div>
            ))}
            {intentions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Agrega intenciones para ofrecerlas durante el rosario.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
