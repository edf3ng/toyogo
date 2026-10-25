"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Mountains } from "@/components/Mountains";
import { EASE, enterTransition, useEnterMotion, useHydrated } from "@/components/appear";

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
  const hydrated = useHydrated();
  const motionOn = useEnterMotion();
  const picture = image?.src ?? "mountains";
  const bodyKey = sceneKey ?? `${marker}-${title}`;
  const pictureInner = image ? (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes="(max-width: 576px) 100vw, 576px"
      className="object-cover"
    />
  ) : (
    <Mountains banner />
  );
  const plate = (
    <>
      <p className="text-xs text-muted">{kicker}</p>
      <p className="font-semibold leading-tight">{marker}</p>
    </>
  );
  const body = (
    <>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </>
  );

  return (
    <section className="mx-auto max-w-xl">
      <div className={`relative overflow-hidden border border-line ${image ? "h-60" : "h-40"}`}>
        {hydrated ? (
          <AnimatePresence>
            <motion.div
              key={picture}
              className="absolute inset-0"
              initial={motionOn ? { opacity: 0, scale: 1.06 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={motionOn ? { opacity: 0 } : undefined}
              transition={enterTransition(!motionOn, 0.55)}
            >
              {pictureInner}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0">{pictureInner}</div>
        )}
        {hydrated ? (
          <motion.div
            key={marker}
            className="absolute bottom-3 left-3 border border-road bg-paper px-3 py-2"
            initial={motionOn ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enterTransition(!motionOn, 0.4), delay: motionOn ? 0.14 : 0, ease: EASE }}
          >
            {plate}
          </motion.div>
        ) : (
          <div className="absolute bottom-3 left-3 border border-road bg-paper px-3 py-2">{plate}</div>
        )}
      </div>
      {hydrated ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={bodyKey}
            initial={motionOn ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -10 } : undefined}
            transition={{ ...enterTransition(!motionOn, 0.38), delay: motionOn ? 0.08 : 0 }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div>{body}</div>
      )}
    </section>
  );
}
