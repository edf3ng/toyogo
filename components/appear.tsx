"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Children, createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

const HydratedContext = createContext({ hydrated: false, animate: false });

/** Waits until the client has taken over so motion styles do not fight SSR HTML. */
export function Hydrated({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setHydrated(true);
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <HydratedContext.Provider value={{ hydrated, animate }}>{children}</HydratedContext.Provider>;
}

export function useHydrated(): boolean {
  return useContext(HydratedContext).hydrated;
}

export function useEnterMotion(): boolean {
  const { animate } = useContext(HydratedContext);
  const reduce = useReducedMotion();
  return animate && !reduce;
}

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
  const hydrated = useHydrated();
  const motionOn = useEnterMotion();
  if (!hydrated) {
    return (
      <div key={id} className={className}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      key={id}
      className={className}
      initial={motionOn ? (bleed ? { opacity: 0 } : { opacity: 0, y: 18 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={enterTransition(!motionOn, bleed ? 0.5 : 0.42)}
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
  const hydrated = useHydrated();
  const motionOn = useEnterMotion();
  if (!hydrated) {
    return <div className={className}>{children}</div>;
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        className={className}
        initial={motionOn ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={motionOn ? { opacity: 0, y: -8 } : undefined}
        transition={enterTransition(!motionOn, 0.32)}
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
  const hydrated = useHydrated();
  const motionOn = useEnterMotion();
  if (!hydrated) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={motionOn ? "hidden" : false}
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: motionOn ? 0.07 : 0,
            delayChildren: motionOn ? 0.05 : 0,
          },
        },
      }}
    >
      {Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: motionOn ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 },
            show: { opacity: 1, y: 0, transition: enterTransition(!motionOn, 0.34) },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
