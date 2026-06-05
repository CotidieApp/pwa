import React from "react";

// Modelo para una oración
export interface Prayer {
  id?: string;
  originalId?: string; // To track edits of predefined prayers
  title: string;
  content?: string | { [key: string]: string };
  categoryId: 'devociones' | 'plan-de-vida' | 'oraciones' | 'cartas' | 'santa-misa';
  imageUrl?: string;
  imageHint?: string;
  prayers?: Prayer[];
  showOnDay?: number;       // 0=Domingo, 1=Lunes, ..., 6=Sábado
  isUserDefined?: boolean;
  isDaySpecific?: boolean;
  isLongText?: boolean; // To identify texts that need scroll position saving
  audio?: string;
}

// Categoría de oraciones
export interface Category {
  id: string;
  name: string;
  icon: React.ReactElement;
  prayers?: Prayer[] | CaminoPoint[];
}

// Punto de "Camino"
export interface CaminoPoint {
  id: number;
  text: string;
}

// Santo o festividad del día
export interface SaintOfTheDay {
  month: number;
  day: number;
  name: string;
  bio: string;
  title: string;
  type: string;
}

// Cita (frase espiritual)
export interface Quote {
  id?: string;
  text: string;
  author: string;
  isUserDefined?: boolean;
}

// Imagen de fondo
export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint?: string;
  themeColors?: {
    primary: { h: number; s: number };
    background: { h: number; s: number };
    accent: { h: number; s: number };
  };
  isUserDefined?: boolean;
};
