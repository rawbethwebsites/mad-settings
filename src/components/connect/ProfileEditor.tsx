'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Save, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { CONNECT_PROMPTS, CONNECT_TAGS, type ConnectMode } from '../../../convex/connectConstants';
import ConnectShell, { ConnectError, ConnectLoading, connectError, useConnectPlayer, useConnectTime } from './ConnectShell';
import ConnectPhoto from './ConnectPhoto';

type Profile = NonNullable<FunctionReturnType<typeof api.connect.me>>;
export default function ProfileEditor() {
  const playerId = useConnectPlayer(); const me = useQuery(api.connect.me, playerId ? { playerId } : 'skip');
  return <ConnectShell title="My profile">{me === undefined || !playerId ? <ConnectLoading /> : <ProfileForm key={playerId} me={me} playerId={playerId} />}</ConnectShell>;
}
function ProfileForm({ me, playerId }: { me: Profile | null; playerId: string }) {
  const router = useRouter();
  const now = useConnectTime();
  const save = useMutation(api.connect.saveProfile); const uploadUrl = useMutation(api.connect.uploadUrl); const attach = useMutation(api.connect.attachPhoto); const remove = useMutation(api.connect.removePhoto); const del = useMutation(api.connect.deleteProfile);
  const [name, setName] = useState(me?.campName ?? ''); const [dob, setDob] = useState(me?.dob ?? '');
  const [modes, setModes] = useState<ConnectMode[]>(me?.modes ?? ['campfire', 'squad']); const [prompts, setPrompts] = useState(me?.prompts.length ? me.prompts : [{ question: 0, answer: '' }, { question: 1, answer: '' }]);
  const [tags, setTags] = useState<string[]>(me?.tags ?? []); const [instagram, setInstagram] = useState(me?.socials?.instagram ?? ''); const [discord, setDiscord] = useState(me?.socials?.discord ?? '');
  const [visibility, setVisibility] = useState<'everyone' | 'matches' | 'paused'>(me?.visibility ?? 'everyone');
  const [more, setMore] = useState(false); const [photo, setPhoto] = useState<File | null>(null); const [preview, setPreview] = useState('');
  const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    const timer = window.setTimeout(() => setPreview(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [photo]);
  const upload = async (file: File) => {
    const url = await uploadUrl({ playerId });
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
    if (!response.ok) throw new Error('Photo upload failed.');
    const { storageId } = await response.json();
    await attach({ playerId, storageId });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setStatus('');
    try {
      await save({ playerId, campName: name, dob, modes, prompts: prompts.filter(p => p.answer.trim()), tags, socials: { instagram: instagram || undefined, discord: discord || undefined }, visibility });
      if (photo) { await upload(photo); setPhoto(null); setPreview(''); }
      if (!me) router.push('/connect');
      else setStatus('Saved.');
    } catch (e) { const message = connectError(e); setError(message.replace('tap Save', `tap ${me ? 'Save profile' : 'Start meeting campers'}`)); if (message.includes('Add more')) setMore(true); }
    finally { setBusy(false); }
  };
  return <>
    <ConnectError error={error} />{status && <p role="status" className="connect-notice">{status}</p>}
    {me?.verified && <p className="connect-badge verified">Ranger verified</p>}
    {me && (me.banned || me.suspended || me.hidden || me.warning || (me.mutedUntil ?? 0) > now) && <div className="connect-notice"><p role="alert">Ask a Ranger at camp for help with your profile.</p>{me.warning && <p>{me.warning}</p>}{(me.mutedUntil ?? 0) > now && <p className="connect-small">Chat available after {new Date(me.mutedUntil!).toLocaleString()}.</p>}</div>}
    <form onSubmit={submit} className="connect-form connect-panel">
      <div><label htmlFor="camp-name">Your name</label><input id="camp-name" required minLength={2} maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /></div>
      <div><label htmlFor="camp-dob">Birthday</label><input id="camp-dob" type="date" required value={dob} disabled={!!me} onChange={e => setDob(e.target.value)} autoComplete="bday" /><p className="connect-small connect-muted connect-field-help">18+ · Birthday stays private.</p></div>
      <div><label htmlFor="camp-photo">Photo (optional)</label><input id="camp-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || (me?.photos.length ?? 0) >= 4} onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { e.target.value = ''; setError('Choose a JPEG, PNG or WebP under 5 MB.'); return; } setError(''); setPhoto(file); }} />{photo && preview && <div className="connect-photo-choice" style={{ marginTop: 8 }}><Image src={preview} alt="Your selected photo" width={64} height={64} unoptimized /><span className="connect-small">Only you see it until approved.</span></div>}</div>
      <details open={more} onToggle={e => setMore(e.currentTarget.open)}><summary className="connect-label">Add more (optional)</summary><div className="connect-profile-more">
      <fieldset><legend className="connect-label">Meet</legend>{(['campfire', 'squad'] as const).map(m => <label key={m} className="connect-check"><input type="checkbox" checked={modes.includes(m)} onChange={() => setModes(s => s.includes(m) ? s.filter(v => v !== m) : [...s, m])} />{m === 'campfire' ? 'Friends' : 'Teammates'}</label>)}</fieldset>
      <fieldset><legend className="connect-label">About you</legend>{prompts.map((p, i) => <div key={i} style={{ marginTop: 12 }}><label htmlFor={`prompt-${i}`}>Prompt {i + 1}</label><select id={`prompt-${i}`} value={p.question} onChange={e => setPrompts(s => s.map((v, j) => i === j ? { ...v, question: Number(e.target.value) } : v))}>{CONNECT_PROMPTS.map((text, q) => <option key={q} value={q} disabled={prompts.some((p, j) => j !== i && p.question === q)}>{text}</option>)}</select><label htmlFor={`answer-${i}`} style={{ marginTop: 12 }}>Your answer {i + 1}</label><textarea id={`answer-${i}`} maxLength={120} value={p.answer} onChange={e => setPrompts(s => s.map((v, j) => i === j ? { ...v, answer: e.target.value } : v))} /></div>)}</fieldset>
      <fieldset><legend className="connect-label">Vibe tags · up to five ({tags.length}/5)</legend><div className="connect-row">{CONNECT_TAGS.map(t => <button key={t} type="button" className={`connect-btn${tags.includes(t) ? ' good' : ''}`} aria-pressed={tags.includes(t)} disabled={!tags.includes(t) && tags.length >= 5} onClick={() => setTags(s => s.includes(t) ? s.filter(v => v !== t) : [...s, t])}>{t}</button>)}</div></fieldset>
      <div><label htmlFor="camp-instagram">Instagram (matches only)</label><input id="camp-instagram" value={instagram} maxLength={31} onChange={e => setInstagram(e.target.value)} autoComplete="off" /></div><div><label htmlFor="camp-discord">Discord (matches only)</label><input id="camp-discord" value={discord} maxLength={40} onChange={e => setDiscord(e.target.value)} autoComplete="off" /></div>
      <div><label htmlFor="camp-visibility">Visibility</label><select id="camp-visibility" value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)}><option value="everyone">Everyone</option><option value="matches">Matches only</option><option value="paused">Paused</option></select></div>
      </div></details>
      {modes.length === 0 && <p role="alert" className="connect-small">Open Add more and choose Friends or Teammates.</p>}
      <button className="connect-btn primary connect-submit" disabled={busy || modes.length === 0}>{me ? <Save size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}{busy ? 'Saving…' : me ? 'Save profile' : 'Start meeting campers'}</button>
    </form>
    {me && me.photos.length > 0 && <section className="connect-panel"><h2><Camera size={20} style={{ display: 'inline' }} aria-hidden="true" /> Your photos</h2><div className="connect-photo-grid">{me.photos.map(p => <figure key={p.storageId}><ConnectPhoto profileId={me.id} playerId={playerId} alt="Your camp photo" storageId={p.storageId} revision={me.photos.map(p => p.status).join()} /><figcaption className="connect-small" style={{ margin: '8px 0' }}>{p.status === 'pending' ? 'Only you · awaiting approval' : p.status === 'approved' ? 'Visible to campers' : 'Choose a different photo'}</figcaption><button type="button" className="connect-btn danger" disabled={busy} onClick={async () => { if (!confirm('Remove this photo?')) return; setBusy(true); setError(''); try { await remove({ playerId, storageId: p.storageId }); setStatus('Photo removed.'); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}><Trash2 size={16} aria-hidden="true" />Remove photo</button></figure>)}</div></section>}
    {me && <details className="connect-panel"><summary>Delete profile</summary><p className="connect-small connect-muted">Deletes photos and sent messages. Closes matches. Safety records stay.</p><button className="connect-btn danger" disabled={busy} style={{ marginTop: 16 }} onClick={async () => { if (!confirm('Delete your profile, photos and sent messages? This cannot be undone. Safety records are retained.')) return; setBusy(true); setError(''); try { await del({ playerId }); router.push('/connect'); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}><Trash2 size={16} aria-hidden="true" />Delete my profile</button></details>}
  </>;
}
