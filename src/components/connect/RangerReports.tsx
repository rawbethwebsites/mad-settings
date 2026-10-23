'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import RangerGuard, { type RangerRole } from './RangerGuard';
import { ConnectError, ConnectLoading, connectError } from './ConnectShell';

type Report = FunctionReturnType<typeof api.connectRangers.reports>[number];
type Chat = FunctionReturnType<typeof api.connectRangers.reportedChat>;
export default function RangerReports() { return <RangerGuard title="Flags to the Rangers" moderate>{(playerId, role) => <ReportQueue playerId={playerId} role={role} />}</RangerGuard>; }
function ReportQueue({ playerId, role }: { playerId: string; role: RangerRole }) {
  const reports = useQuery(api.connectRangers.reports, { playerId });
  return <><p className="connect-muted">Three different campers’ open flags hide a profile until review. Read the flagged context before deciding. Private Tent Talk is only available through an open chat report.</p>{reports === undefined ? <ConnectLoading /> : reports.length === 0 ? <p className="connect-panel" role="status">No open flags. New reports appear live.</p> : reports.map(report => <ReportCard key={report.id} report={report} playerId={playerId} role={role} />)}</>;
}
function ReportCard({ report, playerId, role }: { report: Report; playerId: string; role: RangerRole }) {
  const resolve = useMutation(api.connectRangers.resolveReport); const open = useMutation(api.connectRangers.reportedChat);
  const [chat, setChat] = useState<Chat | null>(null); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const actions = [{ id: 'dismiss', label: 'Dismiss flag' }, { id: 'warn', label: 'Warn camper' }, { id: 'mute', label: 'Mute 24 hours' }, { id: 'suspend', label: 'Suspend camper' }, ...(role === 'headRanger' ? [{ id: 'ban', label: 'Ban camper' }] : [])] as { id: 'dismiss' | 'warn' | 'mute' | 'suspend' | 'ban'; label: string }[];
  return <article className="connect-panel"><h2>{report.campName}</h2><p className="connect-small connect-muted">{report.messageId ? 'Flagged message' : report.matchId ? 'Flagged Tent Talk' : 'Flagged profile'} · {new Date(report.createdAt).toLocaleString()}</p><h3 style={{ marginTop: 16 }}>Flag reason</h3><p>{report.reason}</p><h3 style={{ marginTop: 16 }}>Flagged context</h3><blockquote className="connect-notice">{report.context}</blockquote><ConnectError error={error} />
    {report.matchId && <button className="connect-btn" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { setChat(await open({ playerId, reportId: report.id })); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>Open reported chat · access is audited</button>}
    {chat && <section aria-label="Reported chat context"><p className="connect-small connect-muted" style={{ marginTop: 12 }}>Latest 150 messages. Only this reported conversation.</p>{chat.messages.map(m => <p key={m.id} className="connect-notice"><strong>{m.campName}</strong>: {m.sticker} {m.body}<time className="connect-small connect-muted" style={{ display: 'block' }}>{new Date(m.createdAt).toLocaleString()}</time></p>)}</section>}
    <div style={{ marginTop: 20 }}><label className="connect-label" htmlFor={`note-${report.id}`}>Ranger note · warn notes are shown to the camper</label><textarea className="connect-input" id={`note-${report.id}`} maxLength={300} value={note} onChange={e => setNote(e.target.value)} /></div>
    <div className="connect-row" style={{ marginTop: 16 }}>{actions.map(action => <button key={action.id} className={`connect-btn${action.id === 'ban' || action.id === 'suspend' ? ' danger' : ''}`} disabled={busy} onClick={async () => { if (!confirm(`${action.label} for ${report.campName}? This will resolve this flag and append an audit entry.`)) return; setBusy(true); setError(''); try { await resolve({ playerId, reportId: report.id, action: action.id, ...(note.trim() ? { note: note.trim() } : {}) }); setChat(null); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>{action.label}</button>)}</div>
  </article>;
}
