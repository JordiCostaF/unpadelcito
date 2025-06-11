import type { SVGProps } from 'react';

export function PadelRacketIcon(props: SVGProps<SVGSVGElement>) {
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
      <ellipse cx="12" cy="9" rx="5" ry="7"/>
      <path d="M12 16v5"/>
      <path d="M10.5 21h3"/>
      <line x1="9.5" y1="9" x2="14.5" y2="9" />
      <line x1="12" y1="6.5" x2="12" y2="11.5" />
    </svg>
  );
}
