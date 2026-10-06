"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  MemoryIcon,
  MicIcon,
  NoteIcon,
  PersonIcon,
  RobotIcon,
  SendIcon,
  SpeakerIcon,
  TaskIcon,
  WaveIcon,
  AssetIcon,
  LockIcon,
  ProjectIcon,
  ClientsIcon,
  RecurringIcon,
  FinanceIcon,
  BelongingIcon,
  CalendarIcon,
  JobsIcon,
  SkillsIcon,
  LibraryIcon,
} from "@/components/Icons";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { ChatMessage, LlmSettingsPublic, Profile } from "@/lib/types";
import { plainFromHtml } from "@/lib/format";

type Stats = {
  notes: number;
  tasks: number;
  memories: number;
  assets: number;
  secrets: number;
  projects: number;
  clients: number;
  recurrings?: number;
  financeTransactions?: number;
  belongings?: number;
  calendarEvents?: number;
  upcomingAppointments?: number;
  jobs?: number;
  jobsActive?: number;
  skills?: number;
  skillsHave?: number;
  library?: number;
  openLends?: number;
  openDues?: number;
  upcomingRenewals?: number;
};

export default function ThinkingSpacePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats>({
    notes: 0,
    tasks: 0,
    memories: 0,
    assets: 0,
    secrets: 0,
    projects: 0,
    clients: 0,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [llmInfo, setLlmInfo] = useState<LlmSettingsPublic | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [chatRes, statsRes, profileRes, llmRes] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/stats"),
      fetch("/api/profile"),
      fetch("/api/llm/settings"),
    ]);
    setMessages(await chatRes.json());
    setStats(await statsRes.json());
    setProfile(await profileRes.json());
    if (llmRes.ok) setLlmInfo(await llmRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, data.user, data.assistant]);
      if (profile?.readAloud) {
        speak(plainFromHtml(data.assistant.html || data.assistant.content));
      }
      const statsRes = await fetch("/api/stats");
      setStats(await statsRes.json());
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function copyMsg(msg: ChatMessage) {
    const text = plainFromHtml(msg.html || msg.content);
    await navigator.clipboard.writeText(text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function setReadAloud(readAloud: boolean) {
    setProfile((p) => (p ? { ...p, readAloud } : p));
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAloud }),
    });
  }

  return (
    /* Viewport-locked shell: messages scroll; composer stays pinned at bottom */
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Center chat column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="shrink-0 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <h1 className="section-title">Your thinking space.</h1>
          <p className="text-forest/55 mt-1 text-sm md:text-base">
            Ask. Find. Organise. Get things done.
          </p>
          {llmInfo && (
            <p className="mt-2 text-xs text-forest/45 leading-relaxed">
              {llmInfo.enabled ? (
                <>
                  LLM on · {llmInfo.provider}
                  {llmInfo.model ? ` · ${llmInfo.model}` : ""} ·{" "}
                </>
              ) : (
                <>Rule-based answers · </>
              )}
              <Link
                href="/profile"
                className="underline decoration-forest/25 hover:text-forest hover:decoration-forest"
              >
                Configure in Profile
              </Link>
            </p>
          )}
        </header>

        {/* Scrollable transcript */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 sm:px-6 md:px-8 space-y-4 pb-3">
          {messages.length === 0 && (
            <div className="card p-4 sm:p-5 max-w-xl">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                  <RobotIcon size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-forest mb-1">Welcome</h3>
                  <p className="text-sm text-forest/70 leading-relaxed">
                    Try asking <em>“List my notes”</em>,{" "}
                    <em>“List my projects”</em>, <em>“List my secrets”</em>, or{" "}
                    <em>“At a glance”</em>. I answer from your local Bi-Polar data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end items-end gap-2">
                <div className="bg-sage-light text-forest rounded-2xl rounded-br-md px-3.5 sm:px-4 py-2.5 text-sm max-w-[85%] sm:max-w-[75%] break-words">
                  {msg.content}
                </div>
                <div className="w-8 h-8 rounded-full bg-sage-muted text-forest flex items-center justify-center shrink-0">
                  <PersonIcon size={16} />
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-2.5 sm:gap-3 max-w-2xl">
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                  <RobotIcon size={18} />
                </div>
                <div className="card p-3.5 sm:p-4 flex-1 min-w-0">
                  <div
                    className="text-sm text-forest/85 space-y-1 prose-sm break-words"
                    dangerouslySetInnerHTML={{
                      __html:
                        msg.html ||
                        `<p>${msg.content.replace(/\n/g, "<br/>")}</p>`,
                    }}
                  />
                  {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {msg.links.map((link) => (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          className="inline-flex items-center rounded-full bg-sage-muted px-2.5 py-1 text-xs font-medium text-forest hover:bg-sage-light transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2 mt-3 pt-2 border-t border-forest/5">
                    <button
                      type="button"
                      className="btn-ghost text-xs sm:text-sm px-3"
                      onClick={() =>
                        speak(plainFromHtml(msg.html || msg.content))
                      }
                    >
                      <SpeakerIcon size={14} /> Listen
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-xs sm:text-sm px-3"
                      onClick={() => copyMsg(msg)}
                    >
                      <CopyIcon size={14} />{" "}
                      {copiedId === msg.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pinned composer — does not scroll with messages */}
        <form
          onSubmit={send}
          className="shrink-0 border-t border-forest/5 bg-cream/95 backdrop-blur-lg px-3 sm:px-6 md:px-8 pt-3 pb-3 sm:pb-4"
        >
          <div className="flex items-center gap-2 bg-white border border-forest/10 rounded-2xl pl-3 pr-1.5 py-1.5 shadow-soft focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/30">
            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm px-1.5 py-2.5 placeholder:text-forest/40"
              placeholder="Ask anything about your notes, tasks, meetings or memories..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-11 h-11 rounded-full bg-forest text-white flex items-center justify-center hover:bg-forest-soft active:bg-forest-deep disabled:opacity-40 transition-colors shrink-0 tap-target"
              aria-label="Send"
            >
              <SendIcon size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 sm:mt-3 text-xs text-forest/60">
            <span className="inline-flex items-center gap-1.5 min-h-[36px]">
              <MicIcon size={14} className="shrink-0" /> Voice
              <span className="text-forest/30">▾</span>
            </span>
            <span className="inline-flex items-center gap-1.5 min-h-[36px]">
              <GlobeIcon size={14} className="shrink-0" />{" "}
              {profile?.language || "English (India)"}
              <span className="text-forest/30">▾</span>
            </span>
            <ToggleSwitch
              checked={!!profile?.readAloud}
              onChange={setReadAloud}
              label="Read replies aloud"
              className="min-h-[36px] text-xs sm:text-sm"
            />
            <span className="inline-flex items-center gap-1.5 min-h-[36px]">
              <WaveIcon size={14} className="shrink-0" />{" "}
              {profile?.voice || "Default voice"}
              <span className="text-forest/30">▾</span>
            </span>
          </div>
        </form>
      </div>

      {/* Right glance panel — independent scroll */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 border-l border-forest/5 bg-cream-soft/60 flex-col min-h-0">
        <h2 className="shrink-0 text-sm font-semibold text-forest/70 px-5 pt-6 pb-3">
          Your at a glance
        </h2>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 pb-6 space-y-3">
          <GlanceCard
            href="/notes"
            icon={<NoteIcon size={22} />}
            label={`${stats.notes} Notes`}
            tone="bg-sage-muted"
          />
          <GlanceCard
            href="/tasks"
            icon={<TaskIcon size={22} />}
            label={`${stats.tasks} Tasks`}
            tone="bg-peach-soft"
          />
          <GlanceCard
            href="/memories"
            icon={<MemoryIcon size={22} />}
            label={`${stats.memories} Memories`}
            tone="bg-teal-soft"
          />
          <GlanceCard
            href="/assets"
            icon={<AssetIcon size={22} />}
            label={`${stats.assets ?? 0} Assets`}
            tone="bg-white"
          />
          <GlanceCard
            href="/secrets"
            icon={<LockIcon size={22} />}
            label={`${stats.secrets ?? 0} Secrets`}
            tone="bg-sage-muted/70"
          />
          <GlanceCard
            href="/projects"
            icon={<ProjectIcon size={22} />}
            label={`${stats.projects ?? 0} Projects`}
            tone="bg-peach-soft"
          />
          <GlanceCard
            href="/clients"
            icon={<ClientsIcon size={22} />}
            label={`${stats.clients ?? 0} Clients`}
            tone="bg-teal-soft"
          />
          <GlanceCard
            href="/recurrings"
            icon={<RecurringIcon size={22} />}
            label={`${stats.recurrings ?? 0} Recurrings`}
            tone="bg-white"
          />
          <GlanceCard
            href="/finance"
            icon={<FinanceIcon size={22} />}
            label={`${stats.financeTransactions ?? 0} Finance`}
            tone="bg-peach-soft/70"
          />
          <GlanceCard
            href="/belongings"
            icon={<BelongingIcon size={22} />}
            label={`${stats.belongings ?? 0} Belongings`}
            tone="bg-teal-soft/60"
          />
          <GlanceCard
            href="/calendar"
            icon={<CalendarIcon size={22} />}
            label={`${stats.upcomingAppointments ?? stats.calendarEvents ?? 0} Calendar`}
            tone="bg-white"
          />
          <GlanceCard
            href="/jobs"
            icon={<JobsIcon size={22} />}
            label={`${stats.jobsActive ?? stats.jobs ?? 0} Jobs`}
            tone="bg-peach-soft/60"
          />
          <GlanceCard
            href="/skills"
            icon={<SkillsIcon size={22} />}
            label={`${stats.skills ?? 0} Skills`}
            tone="bg-sage-muted/50"
          />
          <GlanceCard
            href="/library"
            icon={<LibraryIcon size={22} />}
            label={`${stats.library ?? 0} Library`}
            tone="bg-teal-soft/50"
          />
        </div>
      </aside>
    </div>
  );
}

function GlanceCard({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className={`card flex items-center gap-3 px-4 py-3.5 min-h-[52px] ${tone} hover:opacity-90 active:opacity-80 transition-opacity`}
    >
      <div className="text-forest/70 shrink-0">{icon}</div>
      <span className="flex-1 text-sm font-medium text-forest truncate">
        {label}
      </span>
      <ChevronRightIcon size={16} className="text-forest/40 shrink-0" />
    </Link>
  );
}
