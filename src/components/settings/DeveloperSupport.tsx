'use client';

import { ArrowUpRight, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const PAYPAL_SUPPORT_URL = 'https://ko-fi.com/cotidie';
const MERCADO_PAGO_SUPPORT_URL = 'https://link.mercadopago.cl/cotidie';

export default function DeveloperSupport() {
  return (
    <div className="space-y-3 border-t pt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-auto min-h-10 w-full whitespace-normal py-2 sm:w-auto" aria-describedby="developer-support-note">
            <HandHeart aria-hidden="true" />
            ¿Una donación? No me quejo.
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Elige cómo aportar</DialogTitle>
            <DialogDescription>Elige el medio de pago que más te acomode. Tu aporte es voluntario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Button asChild variant="outline" className="h-auto min-h-14 justify-between whitespace-normal px-4 py-3 text-left">
              <a href={MERCADO_PAGO_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                <span className="min-w-0">
                  <span className="block">Mercado Pago</span>
                  <span className="block text-xs font-normal text-muted-foreground">En pesos chilenos (CLP)</span>
                </span>
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only">(abre en otra pestaña)</span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-auto min-h-14 justify-between whitespace-normal px-4 py-3 text-left">
              <a href={PAYPAL_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                <span className="min-w-0">
                  <span className="block">PayPal</span>
                  <span className="block text-xs font-normal text-muted-foreground">En dólares (USD), a través de Ko-fi</span>
                </span>
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only">(abre en otra pestaña)</span>
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <p className="text-sm text-muted-foreground">
        Para que a Cotidie no le falten mejoras… ni a su programador el pan de cada día.
      </p>
      <p id="developer-support-note" className="text-xs text-muted-foreground">
        Puedes elegir cómo aportar al tocar el botón.
      </p>
    </div>
  );
}
