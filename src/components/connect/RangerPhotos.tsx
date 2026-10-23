'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import RangerGuard from './RangerGuard';
import ConnectPhoto from './ConnectPhoto';
import { ConnectError, ConnectLoading, connectError } from './ConnectShell';

export default function RangerPhotos() { return <RangerGuard title="Photo clearing" moderate>{playerId => <PhotoQueue playerId={playerId} />}</RangerGuard>; }
function PhotoQueue({ playerId }: { playerId: string }) {
  const queue = useQuery(api.connectRangers.photos, { playerId });
  const review = useMutation(api.connectRangers.reviewPhoto);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  return <><p className="connect-muted">Only approved photos reach the Trail. Reject images that are unsafe, not the camper’s own, or disclose sensitive details.</p><ConnectError error={error} />{notice && <p role="status" className="connect-notice">{notice}</p>}{queue === undefined ? <ConnectLoading /> : queue.length === 0 ? <p role="status" className="connect-panel">The photo clearing is clear. New uploads appear here live.</p> : queue.map(item => <article className="connect-panel" key={item.storageId}>
    <h2>{item.profile.campName}</h2><ConnectPhoto profileId={item.profile.id} playerId={playerId} storageId={item.storageId} alt={`Pending photo for ${item.profile.campName}`} />
    <div className="connect-row" style={{ marginTop: 16 }}>{[true, false].map(approve => <button key={String(approve)} className={`connect-btn ${approve ? 'good' : 'danger'}`} disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await review({ playerId, target: item.profile.id, storageId: item.storageId, approve }); setNotice(`${item.profile.campName}: photo ${approve ? 'approved' : 'rejected'}. Action recorded in the Ranger log.`); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>{approve ? 'Approve photo' : 'Reject photo'}</button>)}</div>
  </article>)}</>;
}
