"use client";

import { ConfirmProvider } from "./ConfirmDialog";

/** Root client providers — keeps ConfirmProvider stable across AppShell layout switches. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
