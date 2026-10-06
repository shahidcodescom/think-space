"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicSlot } from "@/lib/types";

type BookInfo = {
  ownerDisplayName: string;
  timezone: string;
  slotMinutes: number;
  slots: PublicSlot[];
  label?: string;
  expiresAt?: string;
  error?: string;
};

export function PublicBookingClient({
  apiBase,
}: {
  /** e.g. /api/book/me or /api/book/t/token */
  apiBase: string;
}) {
  const [info, setInfo] = useState<BookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ title: string; start: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(apiBase);
    const data = await res.json();
    if (!res.ok) {
      setInfo(null);
      setError(data.error || "Unavailable");
      return;
    }
    setInfo(data);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    if (!info) return [];
    const map = new Map<string, PublicSlot[]>();
    for (const s of info.slots) {
      const day = new Date(s.start).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    return [...map.entries()];
  }, [info]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: selected.start,
        name,
        email,
        title: title || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Booking failed");
      await load();
      setSelected(null);
      return;
    }
    setDone({ title: data.title, start: data.start });
  }

  if (error && !info) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-forest">
          {error}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-2xl border border-sage bg-sage-muted/50 p-6 text-center">
          <p className="font-serif text-2xl text-forest">Booked</p>
          <p className="mt-2 text-forest/80">{done.title}</p>
          <p className="mt-1 text-sm text-forest/60">
            {new Date(done.start).toLocaleString("en-IN", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <p className="p-6 text-center text-sm text-forest/50">Loading slots…</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <div>
        <h1 className="font-serif text-2xl text-forest md:text-3xl">
          Book with {info.ownerDisplayName}
        </h1>
        {info.label && (
          <p className="text-sm text-forest/60">{info.label}</p>
        )}
        <p className="mt-1 text-xs text-forest/45">
          {info.slotMinutes}-min slots · {info.timezone}
          {info.expiresAt
            ? ` · link expires ${new Date(info.expiresAt).toLocaleDateString("en-IN")}`
            : ""}
        </p>
      </div>

      {byDay.length === 0 ? (
        <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
          No open slots in the next window.
        </p>
      ) : (
        <div className="max-h-[40vh] space-y-4 overflow-y-auto rounded-2xl border border-forest/10 bg-white p-3">
          {byDay.map(([day, slots]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/45">
                {day}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => {
                  const label = new Date(s.start).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const active = selected?.start === s.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setSelected(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        active
                          ? "border-forest bg-forest text-cream"
                          : "border-forest/15 bg-cream hover:border-sage"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <form
          onSubmit={book}
          className="space-y-3 rounded-2xl border border-forest/10 bg-white p-4"
        >
          <p className="text-sm text-forest/70">
            Selected:{" "}
            <strong>
              {new Date(selected.start).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
          </p>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Your name</span>
            <input
              className="input-field"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Email</span>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Topic (optional)</span>
            <input
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      )}
    </div>
  );
}
