"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { CloseIcon, MoreIcon } from "./Icons";
import {
  isNavActive,
  MOBILE_TAB_HREFS,
  NAV_GROUPS,
  NAV_ITEMS,
  navItemsInGroup,
} from "@/lib/nav";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = useMemo(
    () => NAV_ITEMS.filter((n) => (MOBILE_TAB_HREFS as readonly string[]).includes(n.href)),
    []
  );
  const moreItems = useMemo(
    () => NAV_ITEMS.filter((n) => !(MOBILE_TAB_HREFS as readonly string[]).includes(n.href)),
    []
  );
  const moreActive = moreItems.some((n) => isNavActive(pathname, n.href));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-forest/10 bg-cream/95 backdrop-blur-lg"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5 gap-0.5 px-1 pt-1">
          {primary.map(({ href, shortLabel, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`tap-target flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors ${
                    active
                      ? "text-forest bg-sage-muted/80"
                      : "text-forest/55 active:bg-sage-muted/40"
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-[10px] font-medium leading-none">{shortLabel}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`tap-target w-full flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors ${
                moreActive || moreOpen
                  ? "text-forest bg-sage-muted/80"
                  : "text-forest/55 active:bg-sage-muted/40"
              }`}
              aria-label="More destinations"
            >
              <MoreIcon size={22} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[55] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]"
            aria-label="Dismiss"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="relative bg-cream rounded-t-3xl shadow-card border border-forest/10 max-h-[80vh] overflow-y-auto scroll-thin animate-sheet-up"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <p className="font-serif text-xl text-forest">More</p>
                <p className="text-xs text-forest/50">Everything else in your workspace</p>
              </div>
              <button
                type="button"
                className="tap-target rounded-xl bg-sage-muted/60 text-forest p-2"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="px-3 pb-3 space-y-4 overflow-y-auto">
              {NAV_GROUPS.map((group) => {
                const items = navItemsInGroup(group.id).filter(
                  (n) => !(MOBILE_TAB_HREFS as readonly string[]).includes(n.href)
                );
                if (!items.length) return null;
                return (
                  <div key={group.id}>
                    <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-forest/40">
                      {group.label}
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {items.map(({ href, label, icon: Icon }) => {
                        const active = isNavActive(pathname, href);
                        return (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => setMoreOpen(false)}
                              className={`tap-target flex items-center gap-3 rounded-2xl px-3 py-3 border transition-colors ${
                                active
                                  ? "bg-sage-muted border-sage text-forest"
                                  : "bg-white border-forest/5 text-forest/80 active:bg-sage-muted/50"
                              }`}
                            >
                              <span className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center shrink-0">
                                <Icon size={20} />
                              </span>
                              <span className="text-sm font-medium leading-tight">{label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
