"use client";

import { useParams } from "next/navigation";
import { PublicBookingClient } from "@/components/PublicBookingClient";

export default function PermanentBookPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  if (!slug) return null;
  return <PublicBookingClient apiBase={`/api/book/${encodeURIComponent(slug)}`} />;
}
