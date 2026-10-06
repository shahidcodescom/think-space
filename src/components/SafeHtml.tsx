"use client";

import { sanitizeHtml } from "@/lib/sanitize";

export function SafeHtml({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const clean = sanitizeHtml(html);
  return (
    <div
      className={`prose-note ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
