import { stripHtml } from "./sanitize";

export function formatDisplayDate(isoDate: string): string {
  try {
    const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Strip HTML / chat markup to plain text (TTS, clipboard, snippets). */
export function plainFromHtml(html: string): string {
  return stripHtml(html);
}
