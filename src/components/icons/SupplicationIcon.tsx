
'use client';

import type { SVGProps } from 'react';

export function SupplicationIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M4 19a2 2 0 0 1-2-2v-2.2a2 2 0 0 1 1.2-1.8L4 12.4V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v5.4l.8.6a2 2 0 0 1 1.2 1.8V17a2 2 0 0 1-2 2Z" />
      <path d="M20 19a2 2 0 0 0 2-2v-2.2a2 2 0 0 0-1.2-1.8L20 12.4V7a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v5.4l-.8.6a2 2 0 0 0-1.2 1.8V17a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
