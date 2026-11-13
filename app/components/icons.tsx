type Props = { className?: string };

/** Rounded, scalloped lobes — the coriander tell. */
export function CorianderLeaf({ className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M50 96V58" />
      <path d="M50 60c-9 1-17-2-22-8-6 2-12-2-12-9s6-10 10-9c-3-6 1-13 8-13 3 0 6 2 7 4 1-7 5-12 9-12s8 5 9 12c1-2 4-4 7-4 7 0 11 7 8 13 4-1 10 2 10 9s-6 11-12 9c-5 6-13 9-22 8Z" />
      <path d="M50 58V26M50 46l-14-10M50 46l14-10" />
    </svg>
  );
}

/** Pointed, sharply serrated leaflets — the parsley tell. */
export function ParsleyLeaf({ className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M50 96V60" />
      <path d="M50 62 33 55l5-6-13-6 9-4-11-11h13l-3-13 11 9 6-17 6 17 11-9-3 13h13L66 39l9 4-13 6 5 6Z" />
      <path d="M50 60V24M50 46 37 34M50 46l13-12" />
    </svg>
  );
}

export function CameraIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.4-2h5.8l1.4 2h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.6" />
    </svg>
  );
}

export function ShareIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  );
}

export function RetakeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5" />
    </svg>
  );
}

export function GalleryIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 16-4.8-4.8-8.7 8.3" />
    </svg>
  );
}
