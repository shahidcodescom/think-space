"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafIcon } from "./Icons";
import {
  isNavActive,
  NAV_GROUPS,
  navItemsInGroup,
} from "@/lib/nav";

/** Desktop / tablet sidebar — every app section, grouped. Hidden on mobile. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 lg:w-60 shrink-0 bg-forest text-white flex-col min-h-screen sticky top-0 h-screen">
      <div className="flex items-center px-4 pt-5 pb-3">
        <Link href="/thinking-space" className="flex items-center gap-2 min-w-0">
          <LeafIcon size={20} className="text-sage-light shrink-0" />
          <span className="font-serif text-lg lowercase tracking-tight truncate">
            second brain.
          </span>
        </Link>
      </div>

      <nav
        className="flex-1 px-2.5 space-y-3 overflow-y-auto scroll-thin pb-3"
        aria-label="Main"
      >
        {NAV_GROUPS.map((group) => {
          const items = navItemsInGroup(group.id);
          if (!items.length) return null;
          return (
            <div key={group.id}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`flex items-center gap-2.5 px-3 py-1.5 min-h-[36px] rounded-full text-[13px] transition-colors ${
                          active
                            ? "bg-sage-light/90 text-forest font-medium"
                            : "text-white/85 hover:bg-white/10"
                        }`}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="px-4 pb-5 pt-1 mt-auto border-t border-white/10">
        <p className="text-[10px] tracking-[0.14em] uppercase text-white/50 leading-relaxed">
          A calmer mind &amp; brighter tomorrow.
        </p>
      </div>
    </aside>
  );
}
