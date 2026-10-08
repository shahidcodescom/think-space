"use client";

import { useEffect, useState } from "react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Profile } from "@/lib/types";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<{ username: string; email: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setAccount({ username: d.user.username, email: d.user.email });
      })
      .catch(() => setAccount(null));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setPwBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setPwBusy(false);
    if (!res.ok) {
      setPwMsg({ ok: false, text: data.error || "Could not change password" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwMsg({ ok: true, text: "Password updated." });
  }

  async function logout() {
    setLogoutBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setProfile(await res.json());
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <p className="text-sm text-forest/50">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="mb-6">
        <h1 className="section-title">Profile.</h1>
        <p className="text-forest/55 mt-1 text-sm">
          Personal preferences, password, and sign out. App configuration lives in{" "}
          <Link href="/settings" className="text-forest/70 underline-offset-2 hover:underline">
            Settings
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <h2 className="font-serif text-lg text-forest">Preferences</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Name
          </label>
          <input
            className="input-field"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Language
          </label>
          <SearchableSelect
            options={[
              { value: "English (India)", label: "English (India)" },
              { value: "English (US)", label: "English (US)" },
              { value: "English (UK)", label: "English (UK)" },
              { value: "Hindi", label: "Hindi" },
            ]}
            value={profile.language}
            onChange={(language) => setProfile({ ...profile, language })}
            aria-label="Language"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Voice
          </label>
          <SearchableSelect
            options={[
              { value: "Default voice", label: "Default voice" },
              { value: "Calm voice", label: "Calm voice" },
              { value: "Bright voice", label: "Bright voice" },
            ]}
            value={profile.voice}
            onChange={(voice) => setProfile({ ...profile, voice })}
            aria-label="Voice"
            required
          />
        </div>
        </div>

        <ToggleSwitch
          checked={profile.readAloud}
          onChange={(readAloud) => setProfile({ ...profile, readAloud })}
          label="Read replies aloud in Thinking space"
        />

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
          {saved && <span className="text-sm text-sage-dark">Saved</span>}
        </div>
      </form>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg text-forest">Account</h2>
            <p className="text-sm text-forest/55 mt-0.5">
              {account ? (
                <>
                  Signed in as{" "}
                  <span className="font-medium text-forest/80">{account.username}</span> ·{" "}
                  {account.email}
                </>
              ) : (
                "Local owner account"
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={logout}
            disabled={logoutBusy}
          >
            {logoutBusy ? "Signing out…" : "Sign out"}
          </button>
        </div>

        <form onSubmit={changePassword} className="space-y-3 border-t border-forest/5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest/50">
            Change password
          </p>
          <input
            type="password"
            className="input-field"
            placeholder="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              className="input-field"
              placeholder="New password (min 8)"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? "text-sage-dark" : "text-red-700/90"}`}>
              {pwMsg.text}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={pwBusy}>
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
      </div>

      <p className="mt-6 text-xs text-forest/40 tracking-wide uppercase">
        Think. Capture. Act. · A calmer mind &amp; brighter tomorrow.
      </p>
    </div>
  );
}
