"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiPolarMark } from "@/components/BiPolarMark";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((s) => {
        if (!s.setupRequired) {
          router.replace(s.authenticated ? "/thinking-space" : "/login");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
        setBusy(false);
        return;
      }
      router.replace("/thinking-space");
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest/40 mb-2">
              First-run setup
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl text-forest tracking-tight">
              Create your account.
            </h1>
            <p className="text-sm text-forest/55 mt-1.5">
              One local owner account for this workspace. No further sign-ups.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Username
              </label>
              <input
                className="input-field"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. shahid"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-forest/40 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                className="input-field"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-red-700/90 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account & continue"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-forest/40 mt-6 tracking-wide uppercase">
          A calmer mind &amp; brighter tomorrow.
        </p>
      </div>
    </div>
  );
}
