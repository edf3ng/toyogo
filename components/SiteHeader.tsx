"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearDriver, readDriver } from "@/lib/driver";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(readDriver()?.name ?? null);
  }, [path]);

  return (
    <header className={`no-print z-30 ${overlay ? "absolute inset-x-0 top-0" : "border-b border-line bg-paper"}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="inline-flex shrink-0 items-center">
          <img src="/logo.png" alt="ToyoGo" width={852} height={253} className="h-11 w-auto sm:h-12" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {name ? <span className="hidden text-muted sm:inline">{name}</span> : null}
          {name ? (
            <button
              type="button"
              className="rounded-md bg-paper/90 px-3 py-2"
              onClick={() => {
                clearDriver();
                setName(null);
                router.push("/");
              }}
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="rounded-md bg-paper/90 px-3 py-2 font-medium text-ink">
              Log in
            </Link>
          )}
          <Link href="/signup" className="rounded-md bg-jade px-3 py-2 font-medium text-white hover:bg-jade-800">
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
