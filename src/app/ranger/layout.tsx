import type { Metadata } from 'next';
import ConnectBoundary from '@/components/connect/ConnectBoundary';
export const metadata: Metadata = { title: 'Ranger station · MAD SETTINGS', robots: { index: false, follow: false } };
export default function RangerLayout({ children }: { children: React.ReactNode }) { return <ConnectBoundary>{children}</ConnectBoundary>; }
