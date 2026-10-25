"use client";

/** A car crossing its lane, for waits long enough that a static label looks stuck. */
export function RoadLoader() {
  return (
    <div className="relative mt-2 h-5 overflow-hidden" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-line" />
      <svg viewBox="0 0 28 16" className="absolute top-0 h-5 w-9 animate-drive">
        <path fill="#2e3440" d="M3 11h2l2-4h10l3 3h4v3H3v-2z" />
        <circle cx="8" cy="12" r="1.4" fill="#fdfbf7" />
        <circle cx="20" cy="12" r="1.4" fill="#fdfbf7" />
      </svg>
    </div>
  );
}
