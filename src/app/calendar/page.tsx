"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import {
  BookingSettings,
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
  DateAvailabilityWindow,
  TempBookingLink,
  WeeklyAvailabilitySlot,
} from "@/lib/types";

const TYPES: CalendarEventType[] = [
  "appointment",
  "interview",
  "meeting",
  "other",
];
const STATUSES: CalendarEventStatus[] = [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Tab = "schedule" | "availability" | "links";
type ViewMode = "month" | "agenda";

type FormState = {
  title: string;
  type: CalendarEventType;
  start: string;
  end: string;
  location: string;
  url: string;
  notes: string;
  status: CalendarEventStatus;
};

const emptyForm: FormState = {
  title: "",
  type: "appointment",
  start: "",
  end: "",
  location: "",
  url: "",
  notes: "",
  status: "scheduled",
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string) {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const t1 = s.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const t2 = e.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${t1}–${t2}`;
}

function typeTone(t: CalendarEventType) {
  if (t === "interview") return "bg-peach-soft text-forest";
  if (t === "meeting") return "bg-teal-soft text-forest";
  if (t === "appointment") return "bg-sage-muted text-forest";
  return "bg-cream text-forest";
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("schedule");
  const [view, setView] = useState<ViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const [weekly, setWeekly] = useState<WeeklyAvailabilitySlot[]>([]);
  const [dateWindows, setDateWindows] = useState<DateAvailabilityWindow[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(30);

  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [tempLinks, setTempLinks] = useState<TempBookingLink[]>([]);
  const [slugDraft, setSlugDraft] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [newTemp, setNewTemp] = useState({
    label: "",
    expiresInDays: "7",
    dates: "",
  });

  const loadEvents = useCallback(async () => {
    const q = typeFilter ? `?type=${typeFilter}` : "";
    const res = await fetch(`/api/calendar/events${q}`);
    const data: CalendarEvent[] = await res.json();
    setEvents(data);
    setSelectedId((prev) => {
      if (prev && data.some((e) => e.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, [typeFilter]);

  const loadAvailability = useCallback(async () => {
    const res = await fetch("/api/calendar/availability");
    const data = await res.json();
    setWeekly(data.weeklyAvailability || []);
    setDateWindows(data.dateWindows || []);
    setSlotMinutes(data.settings?.slotMinutes || 30);
  }, []);

  const loadLinks = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([
      fetch("/api/calendar/settings"),
      fetch("/api/calendar/temp-links"),
    ]);
    const s: BookingSettings = await sRes.json();
    setSettings(s);
    setSlugDraft(s.permanentSlug);
    setTempLinks(await tRes.json());
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (tab === "availability") loadAvailability();
    if (tab === "links") loadLinks();
  }, [tab, loadAvailability, loadLinks]);

  const selected = events.find((e) => e.id === selectedId) || null;

  const monthEvents = useMemo(() => {
    const prefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
    return events.filter((e) => e.start.slice(0, 7) === prefix || toLocalInput(e.start).startsWith(prefix));
  }, [events, cursor]);

  const agenda = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => e.status !== "cancelled")
      .filter((e) => new Date(e.end).getTime() >= now - 86400000)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events]);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor]
  );

  function eventsOnDay(day: number) {
    const ds = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.filter((e) => {
      const local = toLocalInput(e.start).slice(0, 10);
      return local === ds || e.start.slice(0, 10) === ds;
    });
  }

  function openCreate(day?: number) {
    setEditing(null);
    let start = "";
    let end = "";
    if (day) {
      const ds = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      start = `${ds}T10:00`;
      end = `${ds}T10:30`;
    } else {
      const n = new Date();
      n.setMinutes(0, 0, 0);
      n.setHours(n.getHours() + 1);
      const e = new Date(n.getTime() + 30 * 60000);
      start = toLocalInput(n.toISOString());
      end = toLocalInput(e.toISOString());
    }
    setForm({ ...emptyForm, start, end });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setEditing(ev);
    setForm({
      title: ev.title,
      type: ev.type,
      start: toLocalInput(ev.start),
      end: toLocalInput(ev.end),
      location: ev.location,
      url: ev.url,
      notes: ev.notes,
      status: ev.status,
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    const payload = {
      title: form.title.trim(),
      type: form.type,
      start: fromLocalInput(form.start),
      end: fromLocalInput(form.end),
      location: form.location,
      url: form.url,
      notes: form.notes,
      status: form.status,
    };
    const res = editing
      ? await fetch(`/api/calendar/events/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: CalendarEvent = await res.json();
    setModalOpen(false);
    await loadEvents();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(ev: CalendarEvent) {
    if (!(await confirm({ title: "Delete event?", message: `Delete “${ev.title}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/calendar/events/${ev.id}`, { method: "DELETE" });
    if (selectedId === ev.id) setSelectedId(null);
    setMobileDetail(false);
    await loadEvents();
  }

  async function saveAvailability() {
    await fetch("/api/calendar/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weeklyAvailability: weekly,
        dateWindows,
        slotMinutes,
      }),
    });
    await loadAvailability();
  }

  async function saveSlug() {
    const res = await fetch("/api/calendar/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permanentSlug: slugDraft,
        permanentEnabled: settings?.permanentEnabled ?? true,
      }),
    });
    const s = await res.json();
    if (res.ok) setSettings(s);
  }

  async function togglePermanent() {
    if (!settings) return;
    const res = await fetch("/api/calendar/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permanentEnabled: !settings.permanentEnabled }),
    });
    setSettings(await res.json());
  }

  async function createTemp(e: React.FormEvent) {
    e.preventDefault();
    const dates = newTemp.dates
      .split(/[,\s]+/)
      .map((d) => d.trim())
      .filter(Boolean);
    await fetch("/api/calendar/temp-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newTemp.label || "Temporary booking",
        expiresInDays: Number(newTemp.expiresInDays) || 7,
        dates,
      }),
    });
    setNewTemp({ label: "", expiresInDays: "7", dates: "" });
    await loadLinks();
  }

  async function revokeTemp(id: string) {
    await fetch(`/api/calendar/temp-links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    await loadLinks();
  }

  function copyPath(path: string) {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    navigator.clipboard?.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  }

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  const showDetail = mobileDetail;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">
              Calendar
            </h1>
            <p className="text-sm text-forest/60">
              Schedule, availability &amp; public booking
            </p>
          </div>
        </div>
        {tab === "schedule" && (
          <button className="btn-primary" onClick={() => openCreate()}>
            <PlusIcon size={16} /> Event
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["schedule", "Schedule"],
            ["availability", "Availability"],
            ["links", "Booking links"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn-ghost text-sm ${tab === k ? "bg-sage-muted" : ""}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "schedule" && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn-ghost text-sm ${view === "month" ? "bg-sage-muted" : ""}`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={`btn-ghost text-sm ${view === "agenda" ? "bg-sage-muted" : ""}`}
              onClick={() => setView("agenda")}
            >
              Agenda
            </button>
            <select
              className="input max-w-[10rem]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <div
              className={`flex min-h-0 w-full flex-col gap-3 lg:w-[55%] ${
                showDetail ? "hidden lg:flex" : "flex"
              }`}
            >
              {view === "month" && (
                <div className="rounded-2xl border border-forest/10 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      className="btn-ghost px-3"
                      onClick={() =>
                        setCursor((c) => {
                          const d = new Date(c.y, c.m - 1, 1);
                          return { y: d.getFullYear(), m: d.getMonth() };
                        })
                      }
                    >
                      ‹
                    </button>
                    <p className="font-serif text-lg text-forest">{monthLabel}</p>
                    <button
                      className="btn-ghost px-3"
                      onClick={() =>
                        setCursor((c) => {
                          const d = new Date(c.y, c.m + 1, 1);
                          return { y: d.getFullYear(), m: d.getMonth() };
                        })
                      }
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-forest/45">
                    {DOW.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {cells.map((day, i) => {
                      if (day === null) {
                        return <div key={`e-${i}`} className="min-h-[4.5rem]" />;
                      }
                      const dayEvents = eventsOnDay(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (dayEvents[0]) {
                              setSelectedId(dayEvents[0].id);
                              setMobileDetail(true);
                            } else {
                              openCreate(day);
                            }
                          }}
                          className="min-h-[4.5rem] rounded-lg border border-forest/5 bg-cream/50 p-1 text-left hover:border-sage"
                        >
                          <span className="text-xs font-medium text-forest">
                            {day}
                          </span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayEvents.slice(0, 2).map((ev) => (
                              <p
                                key={ev.id}
                                className="truncate rounded px-0.5 text-[9px] leading-tight text-forest/80"
                                style={{ background: "rgba(27,48,34,0.06)" }}
                              >
                                {ev.title}
                              </p>
                            ))}
                            {dayEvents.length > 2 && (
                              <p className="text-[9px] text-forest/40">
                                +{dayEvents.length - 2}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "agenda" && (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
                  {agenda.length === 0 && (
                    <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
                      No upcoming events.
                    </p>
                  )}
                  {agenda.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(ev.id);
                        setMobileDetail(true);
                      }}
                      className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-3 text-left ${
                        selectedId === ev.id
                          ? "border-sage bg-sage-muted"
                          : "border-forest/5 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeTone(
                            ev.type
                          )}`}
                        >
                          {ev.type}
                        </span>
                        <span className="font-medium text-forest">{ev.title}</span>
                      </div>
                      <p className="text-xs text-forest/50">
                        {fmtRange(ev.start, ev.end)} · {ev.status}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className={`min-h-0 flex-1 ${
                showDetail ? "flex" : "hidden lg:flex"
              } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
            >
              <div className="mb-3 lg:hidden">
                <MobileBackButton
                  onClick={() => setMobileDetail(false)}
                  label="Calendar"
                />
              </div>
              {selected ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeTone(
                          selected.type
                        )}`}
                      >
                        {selected.type}
                      </span>
                      <h2 className="mt-1 font-serif text-2xl text-forest">
                        {selected.title}
                      </h2>
                      <p className="text-sm text-forest/60">
                        {fmtRange(selected.start, selected.end)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost"
                        onClick={() => openEdit(selected)}
                      >
                        <PencilIcon size={16} /> Edit
                      </button>
                      <button
                        className="btn-ghost text-red-700"
                        onClick={() => remove(selected)}
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Field label="Status" value={selected.status} />
                    <Field
                      label="Location"
                      value={selected.location || "—"}
                    />
                    <Field
                      label="URL"
                      value={
                        selected.url ? (
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Open link
                          </a>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <Field
                      label="Booker"
                      value={
                        selected.bookerName
                          ? `${selected.bookerName}${
                              selected.bookerEmail
                                ? ` · ${selected.bookerEmail}`
                                : ""
                            }`
                          : "—"
                      }
                    />
                  </div>
                  {selected.notes && (
                    <p className="mt-4 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                      {selected.notes}
                    </p>
                  )}
                </>
              ) : (
                <p className="m-auto text-sm text-forest/50">
                  Select an event or tap a day to add one.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "availability" && (
        <div className="space-y-4 overflow-y-auto pb-8">
          <div className="rounded-2xl border border-forest/10 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-forest">Weekly slots</p>
              <label className="flex items-center gap-2 text-sm text-forest/70">
                Slot length
                <input
                  className="input w-20"
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value) || 30)}
                />
                min
              </label>
            </div>
            <div className="space-y-2">
              {weekly.map((w, i) => (
                <div key={w.id} className="flex flex-wrap items-center gap-2">
                  <select
                    className="input"
                    value={w.dayOfWeek}
                    onChange={(e) => {
                      const next = [...weekly];
                      next[i] = { ...w, dayOfWeek: Number(e.target.value) };
                      setWeekly(next);
                    }}
                  >
                    {DOW.map((d, di) => (
                      <option key={d} value={di}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input w-28"
                    type="time"
                    value={w.startTime}
                    onChange={(e) => {
                      const next = [...weekly];
                      next[i] = { ...w, startTime: e.target.value };
                      setWeekly(next);
                    }}
                  />
                  <span className="text-forest/40">–</span>
                  <input
                    className="input w-28"
                    type="time"
                    value={w.endTime}
                    onChange={(e) => {
                      const next = [...weekly];
                      next[i] = { ...w, endTime: e.target.value };
                      setWeekly(next);
                    }}
                  />
                  <button
                    className="btn-ghost text-red-700"
                    type="button"
                    onClick={() => setWeekly(weekly.filter((_, j) => j !== i))}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-3 text-sm"
              onClick={() =>
                setWeekly([
                  ...weekly,
                  {
                    id: `wa-new-${Date.now()}`,
                    dayOfWeek: 2,
                    startTime: "10:00",
                    endTime: "12:00",
                  },
                ])
              }
            >
              + Weekly window
            </button>
          </div>

          <div className="rounded-2xl border border-forest/10 bg-white p-4">
            <p className="mb-3 font-medium text-forest">Date-specific windows</p>
            <div className="space-y-2">
              {dateWindows.map((w, i) => (
                <div key={w.id} className="flex flex-wrap items-center gap-2">
                  <input
                    className="input"
                    type="date"
                    value={w.date}
                    onChange={(e) => {
                      const next = [...dateWindows];
                      next[i] = { ...w, date: e.target.value };
                      setDateWindows(next);
                    }}
                  />
                  <input
                    className="input w-28"
                    type="time"
                    value={w.startTime}
                    onChange={(e) => {
                      const next = [...dateWindows];
                      next[i] = { ...w, startTime: e.target.value };
                      setDateWindows(next);
                    }}
                  />
                  <span className="text-forest/40">–</span>
                  <input
                    className="input w-28"
                    type="time"
                    value={w.endTime}
                    onChange={(e) => {
                      const next = [...dateWindows];
                      next[i] = { ...w, endTime: e.target.value };
                      setDateWindows(next);
                    }}
                  />
                  <button
                    className="btn-ghost text-red-700"
                    type="button"
                    onClick={() =>
                      setDateWindows(dateWindows.filter((_, j) => j !== i))
                    }
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-3 text-sm"
              onClick={() =>
                setDateWindows([
                  ...dateWindows,
                  {
                    id: `dw-new-${Date.now()}`,
                    date: new Date().toISOString().slice(0, 10),
                    startTime: "09:00",
                    endTime: "11:00",
                  },
                ])
              }
            >
              + Date window
            </button>
          </div>

          <button type="button" className="btn-primary" onClick={saveAvailability}>
            Save availability
          </button>
        </div>
      )}

      {tab === "links" && settings && (
        <div className="space-y-4 overflow-y-auto pb-8">
          <div className="rounded-2xl border border-forest/10 bg-white p-4">
            <p className="font-medium text-forest">Permanent booking link</p>
            <p className="mt-1 text-sm text-forest/55">
              Stable public URL. Visitors only see open slots (no private notes).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-forest/60">/book/</span>
              <input
                className="input w-32"
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
              />
              <button type="button" className="btn-ghost" onClick={saveSlug}>
                Save slug
              </button>
              <button type="button" className="btn-ghost" onClick={togglePermanent}>
                {settings.permanentEnabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => copyPath(`/book/${settings.permanentSlug}`)}
              >
                {copied === `/book/${settings.permanentSlug}`
                  ? "Copied"
                  : "Copy link"}
              </button>
            </div>
            <p className="mt-2 font-mono text-xs text-forest/50">
              /book/{settings.permanentSlug}
              {!settings.permanentEnabled && " (disabled)"}
            </p>
          </div>

          <div className="rounded-2xl border border-forest/10 bg-white p-4">
            <p className="font-medium text-forest">Temporary links</p>
            <p className="mt-1 text-sm text-forest/55">
              Expiry + optional date allow-list. Path: /book/t/[token]
            </p>
            <form onSubmit={createTemp} className="mt-3 space-y-2">
              <input
                className="input w-full"
                placeholder="Label"
                value={newTemp.label}
                onChange={(e) =>
                  setNewTemp((t) => ({ ...t, label: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <input
                  className="input w-28"
                  type="number"
                  min={1}
                  placeholder="Days"
                  value={newTemp.expiresInDays}
                  onChange={(e) =>
                    setNewTemp((t) => ({ ...t, expiresInDays: e.target.value }))
                  }
                />
                <input
                  className="input min-w-[12rem] flex-1"
                  placeholder="Dates YYYY-MM-DD, comma-separated (optional)"
                  value={newTemp.dates}
                  onChange={(e) =>
                    setNewTemp((t) => ({ ...t, dates: e.target.value }))
                  }
                />
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
            <div className="mt-4 space-y-2">
              {tempLinks.map((l) => {
                const path = `/book/t/${l.token}`;
                const expired = new Date(l.expiresAt) <= new Date();
                return (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-forest/5 bg-cream/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-forest">{l.label}</p>
                      <p className="truncate font-mono text-xs text-forest/50">
                        {path}
                      </p>
                      <p className="text-xs text-forest/45">
                        expires{" "}
                        {new Date(l.expiresAt).toLocaleString("en-IN")}
                        {l.revoked
                          ? " · revoked"
                          : expired
                            ? " · expired"
                            : " · active"}
                        {l.dates.length
                          ? ` · ${l.dates.length} date(s)`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        onClick={() => copyPath(path)}
                      >
                        {copied === path ? "Copied" : "Copy"}
                      </button>
                      {!l.revoked && (
                        <button
                          type="button"
                          className="btn-ghost text-sm text-red-700"
                          onClick={() => revokeTemp(l.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit event" : "New event"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Title</span>
            <input
              className="input w-full"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Type</span>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as CalendarEventType,
                  }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Status</span>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as CalendarEventStatus,
                  }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Start</span>
              <input
                className="input w-full"
                type="datetime-local"
                required
                value={form.start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">End</span>
              <input
                className="input w-full"
                type="datetime-local"
                required
                value={form.end}
                onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Location</span>
            <input
              className="input w-full"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">URL</span>
            <input
              className="input w-full"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Notes (private)</span>
            <textarea
              className="input min-h-[4rem] w-full"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-forest/45">{label}</p>
      <p className="mt-0.5 text-forest">{value}</p>
    </div>
  );
}
