"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BiPolarMark } from "@/components/BiPolarMark";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/thinking-space";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((s) => {
        if (s.setupRequired) {
          router.replace("/setup");
          return;
        }
        if (s.authenticated) {
          router.replace(next);
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setBusy(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/thinking-space");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-cream">
        <p className="text-sm text-forest/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <BiPolarMark size={28} variant="onLight" href={null} />
        </div>
        <div className="card p-6 sm:p-8 space-y-5">
          <header>
            <h1 className="font-serif text-2xl sm:text-3xl text-forest tracking-tight">
              Welcome back.
            </h1>
            <p className="text-sm text-forest/55 mt-1.5">
              Sign in to your Bi-Polar workspace.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Username or email
              </label>
              <input
                className="input-field"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-700/90 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-forest/40 mt-6 tracking-wide uppercase">
          Think. Capture. Act.
        </p>
        <p className="text-center text-xs text-forest/35 mt-2">
          First time?{" "}
          <Link href="/setup" className="text-forest/60 underline-offset-2 hover:underline">
            Initial setup
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-cream">
          <p className="text-sm text-forest/50">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
