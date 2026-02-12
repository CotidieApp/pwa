
'use client';

import type { Category } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

type CategoryListProps = {
  categories: Category[];
  onSelectCategory: (category: Category) => void;
};

export default function CategoryList({ categories, onSelectCategory }: CategoryListProps) {
  return (
    <div className="space-y-[clamp(0.35rem,1.2vh,0.5rem)]">
      {categories.map((category) => (
        <Card
          key={category.id}
          className="bg-card/80 shadow-lg backdrop-blur-sm border-border/50 p-[clamp(0.6rem,1.8vh,0.75rem)] min-h-[clamp(56px,9vh,72px)] flex items-center justify-between cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={() => onSelectCategory(category)}
        >
          <div className="flex items-center gap-4">
            <div className="text-accent bg-accent/10 rounded-lg h-[clamp(40px,7vh,48px)] w-[clamp(40px,7vh,48px)] flex items-center justify-center">
              {category.icon}
            </div>
            <h2 className="font-headline text-[clamp(0.95rem,3.4vw,1rem)] leading-tight">{category.name}</h2>
          </div>
          <ChevronRight className="size-6 text-muted-foreground" />
        </Card>
      ))}
    </div>
  );
}
