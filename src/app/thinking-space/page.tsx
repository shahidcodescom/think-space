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
} from "@/components/Icons";
import { ChatMessage, Profile } from "@/lib/types";
import { plainFromHtml } from "@/lib/format";

type Stats = {
  notes: number;
  tasks: number;
  memories: number;
  assets: number;
};

export default function ThinkingSpacePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats>({ notes: 0, tasks: 0, memories: 0, assets: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [chatRes, statsRes, profileRes] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/stats"),
      fetch("/api/profile"),
    ]);
    setMessages(await chatRes.json());
    setStats(await statsRes.json());
    setProfile(await profileRes.json());
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

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex">
      {/* Center chat */}
      <div className="flex-1 flex flex-col min-w-0 px-4 md:px-8 py-6">
        <header className="mb-6">
          <h1 className="section-title">Your thinking space.</h1>
          <p className="text-forest/55 mt-1 text-sm md:text-base">
            Ask. Find. Organise. Get things done.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="card p-5 max-w-xl">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                  <RobotIcon size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-forest mb-1">Welcome</h3>
                  <p className="text-sm text-forest/70">
                    Try asking <em>“List my notes”</em> or <em>“At a glance”</em>.
                    I answer from your local Second Brain data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end items-end gap-2">
                <div className="bg-sage-light text-forest rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]">
                  {msg.content}
                </div>
                <div className="w-8 h-8 rounded-full bg-sage-muted text-forest flex items-center justify-center shrink-0">
                  <PersonIcon size={16} />
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-3 max-w-2xl">
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                  <RobotIcon size={18} />
                </div>
                <div className="card p-4 flex-1">
                  <div
                    className="text-sm text-forest/85 space-y-1 prose-sm"
                    dangerouslySetInnerHTML={{
                      __html:
                        msg.html ||
                        `<p>${msg.content.replace(/\n/g, "<br/>")}</p>`,
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-forest/5">
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        speak(plainFromHtml(msg.html || msg.content))
                      }
                    >
                      <SpeakerIcon size={14} /> Listen
                    </button>
                    <button className="btn-ghost" onClick={() => copyMsg(msg)}>
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

        <form onSubmit={send} className="mt-2">
          <div className="flex items-center gap-2 bg-white/80 border border-forest/10 rounded-2xl px-3 py-2 shadow-soft">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent outline-none text-sm px-2 py-2 placeholder:text-forest/40"
              placeholder="Ask anything about your notes, tasks, meetings or memories..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-11 h-11 rounded-full bg-forest text-white flex items-center justify-center hover:bg-forest-soft disabled:opacity-40 transition-colors"
              aria-label="Send"
            >
              <SendIcon size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-3 text-xs text-forest/60">
            <span className="inline-flex items-center gap-1.5">
              <MicIcon size={14} /> Voice
              <span className="text-forest/30">▾</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GlobeIcon size={14} /> {profile?.language || "English (India)"}
              <span className="text-forest/30">▾</span>
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="accent-forest"
                checked={!!profile?.readAloud}
                onChange={async (e) => {
                  const readAloud = e.target.checked;
                  setProfile((p) => (p ? { ...p, readAloud } : p));
                  await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ readAloud }),
                  });
                }}
              />
              Read replies aloud
            </label>
            <span className="inline-flex items-center gap-1.5">
              <WaveIcon size={14} /> {profile?.voice || "Default voice"}
              <span className="text-forest/30">▾</span>
            </span>
          </div>
        </form>
      </div>

      {/* Right glance panel */}
      <aside className="hidden lg:flex w-64 shrink-0 border-l border-forest/5 bg-cream-soft/60 flex-col px-5 py-6">
        <h2 className="text-sm font-semibold text-forest/70 mb-4">
          Your at a glance
        </h2>
        <div className="space-y-3">
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
            label={`${stats.assets} Assets`}
            tone="bg-white"
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
      className={`card flex items-center gap-3 px-4 py-4 ${tone} hover:opacity-90 transition-opacity`}
    >
      <div className="text-forest/70">{icon}</div>
      <span className="flex-1 text-sm font-medium text-forest">{label}</span>
      <ChevronRightIcon size={16} className="text-forest/40" />
    </Link>
  );
}
