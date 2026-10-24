"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearDriver, readDriver } from "@/lib/driver";

const LINKS = [
  { href: "/", label: "Start" },
  { href: "/signup", label: "Your car" },
  { href: "/dashboard", label: "Verdict" },
  { href: "/car", label: "The car" },
];

export function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(readDriver()?.name ?? null);
  }, [path]);

  return (
    <header className="no-print border-b border-line bg-paper">
      <div className="relative h-28 overflow-hidden sm:h-36">
        <Image
          src="/images/highway.jpg"
          alt="An empty two-lane road through dry hills."
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_60%]"
        />
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-end justify-between gap-3 px-4 py-3">
        <Link href="/" className="leading-tight">
          <span className="block text-xl font-semibold tracking-tight text-ink">ToyoGo</span>
          <span className="text-xs text-muted">Hybrid or EV, from your own numbers</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => {
            const current = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={current ? "font-medium text-jade-800" : "text-ink"}
                aria-current={current ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          {name ? (
            <>
              <span className="text-muted">{name}</span>
              <button
                type="button"
                className="text-ink"
                onClick={() => {
                  clearDriver();
                  setName(null);
                  router.push("/login");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="font-medium text-jade-800">
              Sign in
            </Link>
          )}
        </nav>
      </div>
      <div className="relative h-2.5 bg-road" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber" />
      </div>
    </header>
  );
}
