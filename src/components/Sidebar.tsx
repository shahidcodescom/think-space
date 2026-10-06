"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafIcon } from "./Icons";
import { isNavActive, NAV_ITEMS } from "@/lib/nav";

/** Desktop / tablet sidebar — hidden on small screens (mobile uses bottom tabs). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 lg:w-64 shrink-0 bg-forest text-white flex-col min-h-screen sticky top-0 h-screen">
      <div className="flex items-center px-5 pt-6 pb-4">
        <Link href="/thinking-space" className="flex items-center gap-2">
          <LeafIcon size={22} className="text-sage-light" />
          <span className="font-serif text-xl lowercase tracking-tight">
            second brain.
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scroll-thin pb-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-full text-sm transition-colors ${
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

      <div className="px-5 pb-6 pt-2 mt-auto">
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
  );
}
