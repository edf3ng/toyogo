"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mountains } from "@/components/Mountains";
import { EASE, enterTransition } from "@/components/appear";

export function Landmark({
  marker,
  kicker,
  title,
  image,
  sceneKey,
  children,
}: {
  marker: string;
  kicker: string;
  title: string;
  image?: { src: string; alt: string };
  sceneKey?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const picture = image?.src ?? "mountains";
  const bodyKey = sceneKey ?? `${marker}-${title}`;

  return (
    <section className="mx-auto max-w-xl">
      <div className={`relative overflow-hidden border border-line ${image ? "h-60" : "h-40"}`}>
        <AnimatePresence>
          <motion.div
            key={picture}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={enterTransition(reduce, 0.55)}
          >
            {image ? (
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 576px) 100vw, 576px"
                className="object-cover"
              />
            ) : (
              <Mountains banner />
            )}
          </motion.div>
        </AnimatePresence>
        <motion.div
          key={marker}
          className="absolute bottom-3 left-3 border border-road bg-paper px-3 py-2"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...enterTransition(reduce, 0.4), delay: reduce ? 0 : 0.14, ease: EASE }}
        >
          <p className="text-xs text-muted">{kicker}</p>
          <p className="font-semibold leading-tight">{marker}</p>
        </motion.div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={bodyKey}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ ...enterTransition(reduce, 0.38), delay: reduce ? 0 : 0.08 }}
        >
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          {children}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
