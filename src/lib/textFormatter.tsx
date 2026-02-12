import React from 'react';
import { cn } from '@/lib/utils';

// Helper to escape HTML special characters
const escapeHtml = (str: string) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
};

export const renderText = (text: string): React.ReactNode[] => {
  const paragraphs = text.split(/\n\n+/);
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const rawBlock = paragraphs[i];

    // --- Line Break ---
    if (/^---\s*$/.test(rawBlock.trim())) {
      rendered.push(<hr key={`hr-${i}`} className="my-6 border-border/60" />);
      continue;
    }
    
    // --- Centered Title: *Title* ---
    const titleMatch = rawBlock.match(/^\*(.*?)\*$/);
    if (titleMatch) {
      rendered.push(
        <h3
          key={`title-${i}`}
          className="text-lg font-semibold text-center text-foreground/90 mt-6 mb-3 first:mt-0"
        >
          {titleMatch[1]}
        </h3>
      );
      continue;
    }

    // Process lines within the paragraph for other rules
    const lines = rawBlock.split('\n');
    const lineElements: React.ReactNode[] = [];
    
    for (let j = 0; j < lines.length; j++) {
      let line = lines[j];

      // Format bold, italic, underline first
      line = escapeHtml(line)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<u>$1</u>');

      // V. / R. lines
      if (line.trim().startsWith('<strong>V.</strong>') || line.trim().startsWith('<strong>R.</strong>')) {
        lineElements.push(
          <p key={`vr-${i}-${j}`} className="mt-2" dangerouslySetInnerHTML={{ __html: line }} />
        );
        continue;
      }
      
      // Camino points
      const caminoMatch = line.match(/^<strong>(\d+)\.<\/strong>\s*(.*)/);
      if (caminoMatch) {
         lineElements.push(
          <p key={`camino-${caminoMatch[1]}-${i}-${j}`} className="mt-2" dangerouslySetInnerHTML={{ __html: line }} />
        );
        continue;
      }

      // Litany lines
      const litanyStarters = [
        'ruega por nosotros', 'ten piedad de nosotros', 'Perdónanos, Señor',
        'Escúchanos, Señor', 'Ten misericordia de nosotros', 'Para que seamos dignos'
      ];
      const trimmedLine = lines[j].trim().toLowerCase();
      if (litanyStarters.some(starter => trimmedLine.startsWith(starter))) {
        lineElements.push(
          <p key={`litany-${i}-${j}`} className="ml-4 mt-2" dangerouslySetInnerHTML={{ __html: line }} />
        );
        continue;
      }

      // If it's not the first line of a multi-line block, add a line break
      if (j > 0) {
        lineElements.push(<br key={`br-${i}-${j}`} />);
      }
      lineElements.push(<span key={`span-${i}-${j}`} dangerouslySetInnerHTML={{ __html: line }} />);
    }
    
    rendered.push(<p key={`p-${i}`} className="mt-3 first:mt-0">{lineElements}</p>);
  }

  return rendered;
};
