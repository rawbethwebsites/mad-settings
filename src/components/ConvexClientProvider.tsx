'use client';

import { useMemo, type ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// One client for the whole app. Without NEXT_PUBLIC_CONVEX_URL (local dev
// without a deployment) children render as-is and online features hide.
export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!client) return <>{children}</>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
