"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readDriver } from "@/lib/driver";
import { ACCOUNT_CHANGED, loadAccount, logout } from "@/lib/account";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const menuRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => setName(readDriver()?.name ?? null);
    const controller = new AbortController();
    sync();
    setMenuOpen(false);
    setAccountError("");
    window.addEventListener(ACCOUNT_CHANGED, sync);
    loadAccount(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) setAccountError(error instanceof Error ? error.message : "Could not load your account.");
    });
    return () => {
      controller.abort();
      window.removeEventListener(ACCOUNT_CHANGED, sync);
    };
  }, [path]);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`no-print z-[2000] w-full border-b border-line bg-white ${overlay ? "absolute inset-x-0 top-0" : "relative"}`}>
      <div className="flex w-full items-center justify-between gap-3 px-3 py-1">
        <Link href="/" className="inline-flex shrink-0 items-center">
          <img src="/logo.png" alt="ToyoGo" width={852} height={253} className="h-11 w-auto sm:h-12" />
        </Link>
        <nav ref={menuRef} aria-label="Account" className="relative ml-auto flex min-w-0 items-center gap-2 text-sm">
          {name ? (
            <>
              <button
                ref={triggerRef}
                type="button"
                aria-expanded={menuOpen}
                aria-controls="account-dropdown"
                className="flex min-w-0 items-center gap-2 rounded-md px-3 py-2 font-medium text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-jade"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="truncate">{name}</span>
                <span aria-hidden="true">{menuOpen ? "▴" : "▾"}</span>
              </button>
              {menuOpen ? (
                <div id="account-dropdown" className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-md border border-line bg-white py-1 shadow-lg">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-ink hover:bg-paper focus-visible:bg-paper"
                    onClick={() => setMenuOpen(false)}
                  >
                    Summary
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-4 py-2 text-ink hover:bg-paper focus-visible:bg-paper"
                    onClick={() => setMenuOpen(false)}
                  >
                    Customize
                  </Link>
                  <button
                    type="button"
                    disabled={signingOut}
                    className="block w-full px-4 py-2 text-left text-ink hover:bg-paper focus-visible:bg-paper"
                    onClick={async () => {
                      setSigningOut(true);
                      setAccountError("");
                      try {
                        await logout();
                        setName(null);
                        setMenuOpen(false);
                        router.push("/");
                      } catch (error) {
                        setAccountError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
                      } finally {
                        setSigningOut(false);
                      }
                    }}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md bg-paper/90 px-3 py-2 font-medium text-ink">
                Log in
              </Link>
              <Link href="/signup" className="rounded-md bg-jade px-3 py-2 font-medium text-white hover:bg-jade-800">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
      {accountError ? <p role="alert" className="px-3 pb-2 text-sm">{accountError}</p> : null}
    </header>
  );
}
