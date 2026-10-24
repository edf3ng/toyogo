"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, TextInput } from "@/components/Field";
import { writeDriver } from "@/lib/driver";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

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
          Demo sign-in — no account is created and nothing is stored.
        </figcaption>
      </figure>
      <form
        className="border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const address = email.trim();
          const password = String(data.get("password") ?? "");
          if (!address.includes("@") || password.length === 0) {
            setError("Enter an email and any password. This screen does not check them.");
            return;
          }
          const local = address.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Driver";
          const name = local.charAt(0).toUpperCase() + local.slice(1);
          writeDriver({ name, email: address });
          router.push("/signup");
        }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to ToyoGo</h1>
        <p className="mt-2 text-sm text-muted">
          Any email and password open the demo. The password is not kept.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label="Email">
            <TextInput
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="text"
              name="password"
              placeholder="anything"
              autoComplete="off"
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm text-ink">{error}</p> : null}
        <button
          type="submit"
          className="mt-5 h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
