"use client";

import { BackIcon } from "./Icons";

export function MobileBackButton({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden tap-target inline-flex items-center gap-1 rounded-xl text-forest/70 active:bg-sage-muted px-2 -ml-2 mb-2 text-sm font-medium"
    >
      <BackIcon size={18} />
      {label}
    </button>
  );
}
