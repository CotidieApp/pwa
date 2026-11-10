import React from 'react';

// React renders all source text as text nodes, including literal HTML.
const inline = (text: string): React.ReactNode[] => {
  const tokens = /\\([\\`*_{}\[\]()#+\-.!>])|`([^`\n]+)`|\*\*\*([^\n]+?)\*\*\*|\*\*([^\n]+?)\*\*|__([^\n]+?)__|\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  const nodes: React.ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(tokens)) {
    const index = match.index!;
    nodes.push(text.slice(end, index));
    const key = `${index}`;
    if (match[1]) nodes.push(match[1]);
    else if (match[2]) nodes.push(<code key={key} className="rounded bg-muted px-1 font-mono">{match[2]}</code>);
    else if (match[3]) nodes.push(<strong key={key}><em>{inline(match[3])}</em></strong>);
    else if (match[4] || match[5]) nodes.push(<strong key={key}>{inline(match[4] || match[5])}</strong>);
    else nodes.push(<em key={key}>{inline(match[6] || match[7])}</em>);
    end = index + match[0].length;
  }
  nodes.push(text.slice(end));
  return nodes;
};

export function renderLetterText(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  const special = (line: string) => /^(?:#{1,3}\s|[-*•]\s|\d+\.\s|>\s?|---\s*$)/.test(line);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,3})\s+(.+?)(?:\s+#+)?$/);
    if (heading) {
      const Tag = `h${heading[1].length}` as 'h1' | 'h2' | 'h3';
      const size = ['text-[1.6em]', 'text-[1.35em]', 'text-[1.15em]'][heading[1].length - 1];
      nodes.push(<Tag key={i} className={`${size} font-bold mt-6 mb-3 first:mt-0`}>{inline(heading[2])}</Tag>);
    } else if (/^---\s*$/.test(line)) {
      nodes.push(<hr key={i} className="my-6 border-border/60" />);
    } else if (/^(?:[-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const start = ordered ? Number(line.match(/^\d+/)![0]) : undefined;
      const items: React.ReactNode[] = [];
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*•]\s+/;
      const key = i;
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(pattern, ''))}</li>);
        i++;
      }
      i--;
      nodes.push(ordered
        ? <ol key={key} start={start} className="my-3 ml-6 list-decimal space-y-1">{items}</ol>
        : <ul key={key} className="my-3 ml-6 list-disc space-y-1">{items}</ul>);
    } else if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      const key = i;
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      i--;
      nodes.push(<blockquote key={key} className="my-3 border-l-2 border-primary/50 pl-4 whitespace-pre-wrap">{inline(quote.join('\n'))}</blockquote>);
    } else {
      const paragraph = [line];
      const key = i;
      while (i + 1 < lines.length && lines[i + 1].trim() && !special(lines[i + 1])) paragraph.push(lines[++i]);
      nodes.push(<p key={key} className="mt-3 first:mt-0 whitespace-pre-wrap">{inline(paragraph.join('\n'))}</p>);
    }
  }
  return nodes;
}

export default function LetterContent({ text, zoom = 1 }: { text: string; zoom?: number }) {
  return <div data-letter-content className="text-foreground/90 leading-relaxed touch-pan-y [overflow-wrap:anywhere]" style={{ fontSize: `${zoom}em` }}>{renderLetterText(text)}</div>;
}
