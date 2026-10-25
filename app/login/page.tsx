"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, TextInput } from "@/components/Field";
import { Landmark } from "@/components/Landmark";
import { writeDriver } from "@/lib/driver";
import { readTrip } from "@/lib/trip";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <Landmark
      marker="Niagara Falls"
      kicker="Stop"
      title="Log in"
      image={{ src: "/images/niagara.jpeg", alt: "Niagara Falls" }}
    >
      <p className="mt-2 text-sm text-muted">
        Demo sign-in — no account is created and nothing is stored. Any password is accepted, then
        discarded.
      </p>
      <form
        className="mt-5 grid gap-4"
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
          router.push(readTrip() ? "/dashboard" : "/signup");
        }}
      >
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
          <TextInput type="text" name="password" placeholder="anything" autoComplete="off" />
        </Field>
        {error ? <p className="text-sm">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
          >
            Log in
          </button>
          <a href="/signup" className="inline-flex h-11 items-center text-sm font-medium text-jade-800">
            Need an account? Sign up
          </a>
        </div>
      </form>
    </Landmark>
  );
}
