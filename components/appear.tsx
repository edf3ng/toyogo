"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Children, type ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export function enterTransition(reduce: boolean | null, duration = 0.42): Transition {
  if (reduce) return { duration: 0 };
  return { duration, ease: EASE };
}

/** First paint of a route. Full-bleed screens fade only so the car does not jump. */
export function PageEnter({
  id,
  bleed = false,
  className,
  children,
}: {
  id: string;
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={id}
      className={className}
      initial={reduce ? false : bleed ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition(reduce, bleed ? 0.5 : 0.42)}
    >
      {children}
    </motion.div>
  );
}

/** Swap one block for another when a step, tab, or car changes. */
export function Swap({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        className={className}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={enterTransition(reduce, 0.32)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Fields and cards arrive one after another on login and customize stops. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduce ? 0 : 0.07,
            delayChildren: reduce ? 0 : 0.05,
          },
        },
      }}
    >
      {Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: enterTransition(reduce, 0.34) },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
