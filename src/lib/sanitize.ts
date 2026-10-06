/**
 * Lightweight allowlist HTML sanitizer for TipTap note content.
 * Works in Node and the browser — no jsdom / DOMPurify engine constraints.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
  "span",
]);

const VOID_TAGS = new Set(["br"]);

function isSafeHref(href: string): boolean {
  const v = href.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("/") ||
    v.startsWith("#")
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize TipTap HTML for safe storage and rendering.
 * Strips scripts, event handlers, and disallowed tags/attrs.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";

  // Nuke comments and dangerous blocks early
  const html = dirty
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|link|meta)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|link|meta)[^>]*\/?>/gi, "");

  // Tokenize tags and text
  const parts = html.split(/(<[^>]+>)/g);
  const out: string[] = [];
  const stack: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<")) {
      const close = /^<\/\s*([a-z0-9]+)\s*>$/i.exec(part);
      if (close) {
        const tag = close[1].toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) continue;
        if (!stack.includes(tag)) continue; // e.g. skipped unsafe <a>
        // pop until matching
        while (stack.length) {
          const top = stack.pop()!;
          out.push(`</${top}>`);
          if (top === tag) break;
        }
        continue;
      }

      const open = /^<\s*([a-z0-9]+)([^>]*)\/?\s*>$/i.exec(part);
      if (!open) continue;
      const tag = open[1].toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) continue;

      const rawAttrs = open[2] || "";
      const attrs: string[] = [];

      if (tag === "a") {
        const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs);
        const href = (hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || "").trim();
        if (href && isSafeHref(href)) {
          attrs.push(`href="${escapeAttr(href)}"`);
          attrs.push('rel="noopener noreferrer"');
          attrs.push('target="_blank"');
        } else {
          // drop unsafe <a> entirely; keep child text, skip matching close
          continue;
        }
      }

      // Drop all other attributes (class, style, on*, etc.)
      const selfClosing = VOID_TAGS.has(tag) || /\/\s*>$/.test(part);
      if (selfClosing) {
        out.push(`<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
      } else {
        out.push(`<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
        stack.push(tag);
      }
    } else {
      out.push(escapeText(part));
    }
  }

  while (stack.length) {
    out.push(`</${stack.pop()}>`);
  }

  return out.join("").trim();
}

/** Convert HTML (or plain text) to a single-line plain snippet for lists/AI. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Wrap plain text as a TipTap-friendly paragraph if it is not already HTML. */
export function ensureHtml(content: string): string {
  if (!content) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(content)) return sanitizeHtml(content);
  return sanitizeHtml(`<p>${escapeText(content)}</p>`);
}
