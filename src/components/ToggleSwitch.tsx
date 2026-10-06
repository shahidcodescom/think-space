"use client";

import { useId } from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

/** Accessible red-themed toggle switch (replaces checkbox for on/off prefs). */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = "",
}: ToggleSwitchProps) {
  const autoId = useId();
  const labelId = `${id ?? autoId}-label`;

  function toggle() {
    if (!disabled) onChange(!checked);
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 min-h-[44px] select-none text-sm text-forest/75 ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={toggle}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed ${
          checked ? "bg-forest" : "bg-forest/20"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span
        id={labelId}
        className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
        onClick={toggle}
      >
        {label}
      </span>
    </div>
  );
}
