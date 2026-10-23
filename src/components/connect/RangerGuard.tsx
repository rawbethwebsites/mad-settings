'use client';

import type { ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { Shield } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import ConnectShell, { ConnectLoading, useConnectPlayer } from './ConnectShell';
export type RangerRole = 'headRanger' | 'ranger' | 'gateRanger';
export default function RangerGuard({ title, moderate = false, children }: { title: string; moderate?: boolean; children: (playerId: string, role: RangerRole) => ReactNode }) {
  const playerId = useConnectPlayer(); const r = useQuery(api.connectRangers.me, playerId ? { playerId } : 'skip');
  return <ConnectShell title={title}>{!playerId || r === undefined ? <ConnectLoading /> : !r || (moderate && r.role === 'gateRanger') ? <section className="connect-panel connect-empty"><Shield size={48} style={{ margin: 'auto' }} /><h2>Rangers only.</h2><p className="connect-muted">{r ? 'Gate Rangers verify campers. A Ranger or Head Ranger handles moderation.' : 'This browser has not been assigned a Ranger role. Ask the Head Ranger at camp.'}</p><p className="connect-small connect-muted" style={{ marginTop: 16 }}>There is no public admin signup. The first Head Ranger is seeded internally by the event operator.</p></section> : children(playerId, r.role)}</ConnectShell>;
}
