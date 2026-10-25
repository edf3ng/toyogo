"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Hydrated, PageEnter } from "@/components/appear";
import { SiteHeader } from "@/components/SiteHeader";

const FULL_BLEED = new Set(["/", "/dashboard"]);

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const bleed = FULL_BLEED.has(path);

  return (
    <Hydrated>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader overlay={bleed} />
        <PageEnter
          id={path}
          bleed={bleed}
          className={bleed ? "flex-1" : "mx-auto w-full max-w-5xl flex-1 px-4 py-6"}
        >
          {children}
        </PageEnter>
      </div>
    </Hydrated>
  );
}
