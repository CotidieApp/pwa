
'use client';

import type { SVGProps } from 'react';

export function PrayingHandsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M18 10h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-2" />
        <path d="M6 10H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2" />
        <path d="M12 2a4 4 0 0 0-4 4v2.5" />
        <path d="M12 2a4 4 0 0 1 4 4v2.5" />
        <path d="m12 10.5 4.5 1.5.5 4.5" />
        <path d="m12 10.5-4.5 1.5-.5 4.5" />
    </svg>
  );
}
