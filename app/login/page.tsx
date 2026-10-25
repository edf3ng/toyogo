"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, TextInput } from "@/components/Field";
import { Landmark } from "@/components/Landmark";
import { login } from "@/lib/account";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Landmark
      marker="Niagara Falls"
      kicker="Stop"
      title="Log in"
      image={{ src: "/images/niagara.jpeg", alt: "Niagara Falls" }}
    >
      <p className="mt-2 text-sm text-muted">
        Log in to retrieve your saved Toyota and preferences.
      </p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting) return;
          const data = new FormData(event.currentTarget);
          const address = email.trim();
          const password = String(data.get("password") ?? "");
          setError("");
          setSubmitting(true);
          try {
            await login(address, password);
            router.push("/dashboard");
          } catch (error) {
            setError(error instanceof Error ? error.message : "Could not log in. Please try again.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Field label="Email">
          <TextInput
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password">
          <TextInput type="password" name="password" autoComplete="current-password" required maxLength={128} />
        </Field>
        {error ? <p role="alert" className="text-sm">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
          <a href="/signup" className="inline-flex h-11 items-center text-sm font-medium text-jade-800">
            Need an account? Sign up
          </a>
        </div>
      </form>
    </Landmark>
  );
}
