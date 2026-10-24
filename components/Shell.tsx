"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { COPY } from "@/config/copy";

const FULL_BLEED = new Set(["/", "/drive"]);

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const bleed = FULL_BLEED.has(path);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader overlay={bleed} />
      <div className={bleed ? "flex-1" : "mx-auto w-full max-w-5xl flex-1 px-4 py-6"}>{children}</div>
      {bleed ? null : (
        <footer className="mx-auto w-full max-w-5xl border-t border-line px-4 py-4 text-sm text-muted print:hidden">
          <p>{COPY.footer}</p>
          <p className="mt-1">{COPY.modelCredit}</p>
        </footer>
      )}
    </div>
  );
}
