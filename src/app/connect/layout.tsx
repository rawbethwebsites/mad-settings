import type { Metadata } from 'next';
import ConnectBoundary from '@/components/connect/ConnectBoundary';
export const metadata: Metadata = { title: 'Campfire Connect · MAD SETTINGS', robots: { index: false, follow: false } };
export default function ConnectLayout({ children }: { children: React.ReactNode }) { return <ConnectBoundary>{children}</ConnectBoundary>; }
