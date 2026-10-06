"use client";

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-forest/40" onClick={onClose} />
      <div className="relative card w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto scroll-thin">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-forest">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sage-muted"
            aria-label="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
