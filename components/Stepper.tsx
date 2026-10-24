"use client";

import { motion } from "framer-motion";

const STEPS = [
  { id: 1, label: "Now", at: "12.5%" },
  { id: 2, label: "Drive", at: "37.5%" },
  { id: 3, label: "Today", at: "62.5%" },
  { id: 4, label: "Next", at: "87.5%" },
] as const;

export function Stepper({
  step,
  onJump,
}: {
  step: 1 | 2 | 3 | 4;
  onJump: (step: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div className="no-print mb-6">
      <div className="relative pt-6">
        <div className="absolute top-8 right-3 left-3 h-1 rounded-full bg-road" />
        <motion.div
          className="absolute top-5 h-4 w-7 -translate-x-1/2"
          animate={{ left: STEPS[step - 1].at }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          aria-hidden
        >
          <CarMark />
        </motion.div>
        <ol className="relative grid grid-cols-4">
          {STEPS.map((item) => {
            const done = item.id < step;
            const current = item.id === step;
            const label = (
              <span className={current ? "text-jade-800" : done ? "text-ink" : "text-muted"}>
                <span className="block text-xs tabular-nums">{item.id}</span>
                {item.label}
              </span>
            );
            return (
              <li key={item.id} className="text-center text-sm">
                {done ? (
                  <button type="button" className="w-full pt-5" onClick={() => onJump(item.id)}>
                    {label}
                  </button>
                ) : (
                  <div className="pt-5">{label}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function CarMark() {
  return (
    <svg viewBox="0 0 28 16" className="h-4 w-7 text-paper">
      <path fill="#2e3440" d="M3 11h2l2-4h10l3 3h4v3H3v-2z" />
      <circle cx="8" cy="12" r="1.4" fill="#fdfbf7" />
      <circle cx="20" cy="12" r="1.4" fill="#fdfbf7" />
    </svg>
  );
}
