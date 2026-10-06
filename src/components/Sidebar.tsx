"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainIcon,
  CloseIcon,
  LeafIcon,
  MeetingIcon,
  MemoryIcon,
  NoteIcon,
  ProfileIcon,
  TaskIcon,
  ThoughtIcon,
  LockIcon,
  AssetIcon,
} from "./Icons";

const NAV = [
  { href: "/thinking-space", label: "Thinking space", icon: BrainIcon },
  { href: "/notes", label: "Notes", icon: NoteIcon },
  { href: "/tasks", label: "Tasks", icon: TaskIcon },
  { href: "/meetings", label: "Meetings / MOM", icon: MeetingIcon },
  { href: "/thoughts", label: "Thoughts", icon: ThoughtIcon },
  { href: "/memories", label: "Memories", icon: MemoryIcon },
  { href: "/assets", label: "Assets", icon: AssetIcon },
  { href: "/secrets", label: "Secrets", icon: LockIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

export function Sidebar({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-forest/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed md:static z-50 inset-y-0 left-0 w-64 shrink-0 bg-forest text-white flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <Link href="/thinking-space" className="flex items-center gap-2" onClick={onClose}>
            <LeafIcon size={22} className="text-sage-light" />
            <span className="font-serif text-xl lowercase tracking-tight">
              second brain.
            </span>
          </Link>
          <button
            className="md:hidden p-1 rounded-lg hover:bg-white/10"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scroll-thin">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm transition-colors ${
                  active
                    ? "bg-sage-light/90 text-forest font-medium"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 pb-6 pt-4 mt-auto">
          <svg
            viewBox="0 0 200 80"
            className="w-full opacity-30 text-sage-light mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M20 60c20-40 40-50 60-30 10 10 20 5 30-10 15-22 35-20 50 5 8 14 20 20 30 15" />
            <path d="M40 55c15-25 30-30 45-15M100 40c10-15 25-18 40-5" />
            <path d="M55 70c5-20 20-30 35-20" />
          </svg>
          <p className="text-[10px] tracking-[0.18em] uppercase text-white/60 leading-relaxed">
            A calmer mind &amp; brighter tomorrow.
          </p>
        </div>
      </aside>
    </>
  );
}
