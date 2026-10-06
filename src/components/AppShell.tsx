"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { LeafIcon, MenuIcon } from "./Icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-cream">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-cream/95 backdrop-blur border-b border-forest/5">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-sage-muted"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-2">
            <LeafIcon size={18} className="text-forest" />
            <span className="font-serif text-lg lowercase">second brain.</span>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
