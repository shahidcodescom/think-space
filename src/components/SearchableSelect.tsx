"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
} from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Accessible name when no visible label is associated */
  "aria-label"?: string;
};

/**
 * Type-to-filter combobox styled like `.input-field`.
 * Keyboard: ArrowUp/Down, Enter, Escape, Home/End.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyMessage = "No matches",
  required = false,
  id,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const autoId = useId();
  const listboxId = `${id ?? autoId}-listbox`;
  const inputId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    } else {
      const idx = filtered.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset query only when open flips
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(opt: SearchableSelectOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) choose(opt);
    }
  }

  const display = open ? query : selected?.label || "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[activeIndex]
            ? `${listboxId}-opt-${activeIndex}`
            : undefined
        }
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
        className="input-field pr-9"
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forest/35 text-xs"
      >
        ▾
      </span>

      {/* Hidden native select for HTML5 required validation when closed */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={value}
          onChange={() => {}}
          required
        />
      )}

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto scroll-thin rounded-xl border border-forest/10 bg-white shadow-card py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-forest/40">{emptyMessage}</li>
          ) : (
            filtered.map((opt, idx) => {
              const active = idx === activeIndex;
              const selectedOpt = opt.value === value;
              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${idx}`}
                  data-idx={idx}
                  role="option"
                  aria-selected={selectedOpt}
                  className={`cursor-pointer px-3 py-2.5 text-sm min-h-[40px] flex items-center ${
                    active
                      ? "bg-sage-muted text-forest"
                      : selectedOpt
                        ? "bg-cream text-forest font-medium"
                        : "text-forest/80 hover:bg-cream"
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(opt);
                  }}
                >
                  {opt.label}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
