"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, TextInput } from "@/components/Field";
import { writeDriver } from "@/lib/driver";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function enter(name: string, address: string) {
    writeDriver({ name, email: address });
    router.push("/");
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <figure>
        <div className="relative aspect-[16/9] w-full border border-line">
          <Image
            src="/images/reststop.jpg"
            alt="A quiet highway rest stop and a long view of the horizon."
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <figcaption className="mt-2 text-sm text-muted">
          Demo sign-in. Any email and password open the trip. Nothing is checked, and nothing is
          stored on a server.
        </figcaption>
      </figure>
      <form
        className="border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const address = email.trim();
          if (!address.includes("@") || password.length === 0) {
            setError("Enter an email and any password. This screen does not check them.");
            return;
          }
          const local = address.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Driver";
          const name = local.charAt(0).toUpperCase() + local.slice(1);
          enter(name, address);
        }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to ToyoGo</h1>
        <p className="mt-2 text-sm text-muted">
          The trip stays in this browser tab. Signing in only puts a name on the header.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label="Email">
            <TextInput
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" hint="Anything you type is accepted.">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
          >
            Sign in
          </button>
          <button
            type="button"
            className="h-11 rounded-md border border-line px-4 text-sm"
            onClick={() => enter("Elena", "elena@example.com")}
          >
            Continue as Elena
          </button>
        </div>
      </form>
    </div>
  );
}
