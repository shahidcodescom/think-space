"use client";

import { useEffect } from "react";
import { CloseIcon } from "./Icons";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]"
        aria-label="Dismiss dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-3xl shadow-card border border-forest/10 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scroll-thin animate-sheet-up sm:animate-none"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {/* Mobile drag affordance */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-forest/15" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-2 sm:pt-5 pb-3 sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-forest/5">
          <h2 className="font-serif text-xl text-forest truncate">{title}</h2>
          <button
            onClick={onClose}
            className="tap-target rounded-xl bg-sage-muted/50 text-forest p-2 active:bg-sage-muted"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-5 pb-5 pt-3">{children}</div>
      </div>
    </div>
  );
}
