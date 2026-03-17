'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function CartasIntro() {
  return (
    <Card className="mb-4 bg-card/80 shadow-md backdrop-blur-sm border-border/50">
      <CardContent className="p-6 text-sm text-foreground/90 space-y-3">
        <p>
          Escribe una carta al Señor. Agradece lo vivido, pide claridad por lo que se viene,
          ruega ante una necesidad..., pero, sobre todo, háblale; no como un servidor a su señor,
          sino como un hijo a su Padre. Amor de Padre es el Suyo, no lo olvides.
        </p>
        <blockquote className="italic text-foreground/80 pl-4 border-l-2 border-border">
          "Cuando te pongas delante de Dios, ten el descaro santo de un hijo que habla con su Padre."
        </blockquote>
        <div className="text-right text-foreground/80">- San Josemaría Escrivá</div>
      </CardContent>
    </Card>
  );
}
