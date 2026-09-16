import type { ReactNode } from 'react';

interface InfoTipProps {
  text: string;
}

export default function InfoTip({ text }: InfoTipProps): ReactNode {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label="O que significa?"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400/30 text-[10px] font-bold leading-none text-slate-400 transition-colors focus:outline-none group-hover:bg-indigo-500 group-hover:text-white group-focus-within:bg-indigo-500 group-focus-within:text-white"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-60 -translate-x-1/2 whitespace-normal rounded-md bg-slate-800 px-3 py-2 text-left text-xs font-normal leading-snug text-slate-100 shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-full left-1/2 z-10 mb-1 hidden h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800 group-hover:block group-focus-within:block"
      />
    </span>
  );
}