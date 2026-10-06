import Link from "next/link";

type BiPolarMarkProps = {
  size?: number;
  /** onDark = sidebar (primary red bg); onLight = cream headers */
  variant?: "onDark" | "onLight";
  showWordmark?: boolean;
  href?: string | null;
  className?: string;
};

/** Minimal bipolar mark: soft circle with two balanced poles. */
export function BiPolarIcon({
  size = 22,
  variant = "onLight",
  className = "",
}: {
  size?: number;
  variant?: "onDark" | "onLight";
  className?: string;
}) {
  const fill = variant === "onDark" ? "#D4A0A6" : "#7C2430";
  const accent = variant === "onDark" ? "#F7F4EF" : "#D4A0A6";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <circle cx="16" cy="16" r="15" fill={fill} />
      {/* North pole */}
      <circle cx="16" cy="10" r="3.25" fill={accent} />
      {/* South pole */}
      <circle cx="16" cy="22" r="3.25" fill={accent} />
      {/* Axis */}
      <rect x="15.1" y="12.5" width="1.8" height="7" rx="0.9" fill={accent} />
    </svg>
  );
}

export function BiPolarMark({
  size = 22,
  variant = "onLight",
  showWordmark = true,
  href = "/thinking-space",
  className = "",
}: BiPolarMarkProps) {
  const word =
    variant === "onDark"
      ? "font-serif text-lg lowercase tracking-tight truncate text-white"
      : "font-serif text-base lowercase tracking-tight truncate text-forest leading-none";

  const inner = (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <BiPolarIcon size={size} variant={variant} />
      {showWordmark && <span className={word}>bi-polar.</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center min-w-0">
        {inner}
      </Link>
    );
  }
  return inner;
}
