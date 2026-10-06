"use client";

import { useParams } from "next/navigation";
import { PublicBookingClient } from "@/components/PublicBookingClient";

export default function TempBookPage() {
  const params = useParams();
  const token = String(params.token || "");
  if (!token) return null;
  return (
    <PublicBookingClient apiBase={`/api/book/t/${encodeURIComponent(token)}`} />
  );
}
