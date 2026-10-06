"use client";

import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { LeafIcon } from "./Icons";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "@/lib/nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((n) => isNavActive(pathname, n.href));
  const isPublicBook = pathname.startsWith("/book");

  if (isPublicBook) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-cream overflow-x-hidden">
        <header
          className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-cream/95 backdrop-blur-lg border-b border-forest/5"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <LeafIcon size={18} className="text-forest shrink-0" />
          <p className="font-serif text-base lowercase text-forest">book a time</p>
        </header>
        <main className="flex-1 min-w-0 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-cream overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh]">
        {/* Compact mobile top bar — title only (nav is bottom tabs) */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 bg-cream/95 backdrop-blur-lg border-b border-forest/5"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            paddingBottom: "0.75rem",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <LeafIcon size={18} className="text-forest shrink-0" />
            <div className="min-w-0">
              <p className="font-serif text-base lowercase leading-none truncate">
                second brain.
              </p>
              {current && (
                <p className="text-[11px] text-forest/45 mt-0.5 truncate">
                  {current.label}
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
