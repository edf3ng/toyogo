import type { ReactNode } from "react";
import Image from "next/image";
import { Mountains } from "@/components/Mountains";

export function Landmark({
  marker,
  kicker,
  title,
  image,
  children,
}: {
  marker: string;
  kicker: string;
  title: string;
  image?: { src: string; alt: string };
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-xl">
      <div className={`relative overflow-hidden border border-line ${image ? "h-60" : "h-40"}`}>
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
        <div className="absolute bottom-3 left-3 border border-road bg-paper px-3 py-2">
          <p className="text-xs text-muted">{kicker}</p>
          <p className="font-semibold leading-tight">{marker}</p>
        </div>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </section>
  );
}
