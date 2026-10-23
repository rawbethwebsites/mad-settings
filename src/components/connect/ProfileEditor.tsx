'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { CONNECT_PROMPTS, CONNECT_TAGS, type ConnectMode } from '../../../convex/connectConstants';
import ConnectShell, { ConnectError, ConnectLoading, connectError, useConnectPlayer, useConnectTime } from './ConnectShell';
import ConnectPhoto from './ConnectPhoto';

type Profile = NonNullable<FunctionReturnType<typeof api.connect.me>>;
export default function ProfileEditor() {
  const playerId = useConnectPlayer(); const me = useQuery(api.connect.me, playerId ? { playerId } : 'skip');
  return <ConnectShell title={me ? 'My camp' : 'Make yourself at camp'}>{me === undefined || !playerId ? <ConnectLoading /> : <ProfileForm key={me?.id ?? 'new'} me={me} playerId={playerId} />}</ConnectShell>;
}
function ProfileForm({ me, playerId }: { me: Profile | null; playerId: string }) {
  const now = useConnectTime();
  const save = useMutation(api.connect.saveProfile); const uploadUrl = useMutation(api.connect.uploadUrl); const attach = useMutation(api.connect.attachPhoto); const remove = useMutation(api.connect.removePhoto); const del = useMutation(api.connect.deleteProfile);
  const [name, setName] = useState(me?.campName ?? ''); const [dob, setDob] = useState(me?.dob ?? '');
  const [modes, setModes] = useState<ConnectMode[]>(me?.modes ?? ['campfire']); const [prompts, setPrompts] = useState(me?.prompts ?? [{ question: 0, answer: '' }, { question: 1, answer: '' }]);
  const [tags, setTags] = useState<string[]>(me?.tags ?? []); const [instagram, setInstagram] = useState(me?.socials?.instagram ?? ''); const [discord, setDiscord] = useState(me?.socials?.discord ?? '');
  const [visibility, setVisibility] = useState<'everyone' | 'matches' | 'paused'>(me?.visibility ?? 'everyone'); const [consent, setConsent] = useState(!!me);
  const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!consent || busy) return;
    setBusy(true); setError(''); setStatus('');
    try { await save({ playerId, campName: name, dob, modes, prompts, tags, socials: { instagram: instagram || undefined, discord: discord || undefined }, visibility }); setStatus('Profile saved. Add a photo below and visit a Ranger for verification.'); }
    catch (e) { setError(connectError(e)); } finally { setBusy(false); }
  };
  return <>
    <p className="connect-muted">Two stories, a few vibes, and a name around the fire.</p>
    <ConnectError error={error} />{status && <p role="status" className="connect-notice">{status}</p>}
    {me && <div className="connect-notice"><strong>{me.verified ? 'Ranger verified' : 'Not yet verified'}</strong><p className="connect-small">{me.verified ? 'You can send Logs once a photo is approved.' : 'Find a Ranger at camp. Unverified campers can browse but cannot send Logs.'}</p>{(me.banned || me.suspended || me.hidden) && <p role="alert">Your profile is under Ranger review. Contact a Ranger at camp.</p>}{me.warning && <p role="alert">Ranger note: {me.warning}</p>}{(me.mutedUntil ?? 0) > now && <p>Messaging muted until {new Date(me.mutedUntil!).toLocaleString()}.</p>}</div>}
    <form onSubmit={submit} className="connect-form connect-panel">
      <div><label htmlFor="camp-name">Camp name · required</label><input id="camp-name" required minLength={2} maxLength={24} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" /><p className="connect-small connect-muted">Unique at this event. Spaces and capitals do not make a different name.</p></div>
      <div><label htmlFor="camp-dob">Date of birth · required, 18+ only</label><input id="camp-dob" type="date" required value={dob} disabled={!!me} onChange={e => setDob(e.target.value)} autoComplete="bday" /><p className="connect-small connect-muted">Never shown to other campers. Your birth date cannot be changed after saving.</p></div>
      <fieldset><legend className="connect-label">Who are you meeting? · choose at least one</legend>{(['campfire', 'squad'] as const).map(m => <label key={m} className="connect-check"><input type="checkbox" checked={modes.includes(m)} onChange={() => setModes(s => s.includes(m) ? s.filter(v => v !== m) : [...s, m])} />{m === 'campfire' ? 'Campfire · Friends' : 'Squad · Game teammates'}</label>)}</fieldset>
      <fieldset><legend className="connect-label">Two Campfire prompts · required</legend>{prompts.map((p, i) => <div key={i} style={{ marginTop: 16 }}><label htmlFor={`prompt-${i}`}>Prompt {i + 1}</label><select id={`prompt-${i}`} value={p.question} onChange={e => setPrompts(s => s.map((v, j) => i === j ? { ...v, question: Number(e.target.value) } : v))}>{CONNECT_PROMPTS.map((text, q) => <option key={q} value={q} disabled={prompts.some((p, j) => j !== i && p.question === q)}>{text}</option>)}</select><label htmlFor={`answer-${i}`} style={{ marginTop: 12 }}>Your answer {i + 1}</label><textarea id={`answer-${i}`} required maxLength={120} value={p.answer} onChange={e => setPrompts(s => s.map((v, j) => i === j ? { ...v, answer: e.target.value } : v))} /><p className="connect-small connect-muted">{p.answer.length}/120</p></div>)}</fieldset>
      <fieldset><legend className="connect-label">Vibe tags · up to five ({tags.length}/5)</legend><div className="connect-row">{CONNECT_TAGS.map(t => <button key={t} type="button" className={`connect-btn${tags.includes(t) ? ' good' : ''}`} aria-pressed={tags.includes(t)} disabled={!tags.includes(t) && tags.length >= 5} onClick={() => setTags(s => s.includes(t) ? s.filter(v => v !== t) : [...s, t])}>{t}</button>)}</div></fieldset>
      <details><summary className="connect-label" style={{ minHeight: 44, cursor: 'pointer' }}>Optional socials · only your matches see these</summary><label htmlFor="camp-instagram">Instagram handle</label><input id="camp-instagram" value={instagram} maxLength={31} onChange={e => setInstagram(e.target.value)} autoComplete="off" /><label htmlFor="camp-discord" style={{ marginTop: 16 }}>Discord handle</label><input id="camp-discord" value={discord} maxLength={40} onChange={e => setDiscord(e.target.value)} autoComplete="off" /></details>
      <div><label htmlFor="camp-visibility">Profile visibility</label><select id="camp-visibility" value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)}><option value="everyone">Everyone · appear on the Trail</option><option value="matches">Matches only · keep existing fires</option><option value="paused">Paused · leave the Trail for now</option></select></div>
      {!me && <label className="connect-check"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I am 18 or older. I will use my own photos, respect campers and follow Ranger guidance.</span></label>}
      <button className="connect-btn primary" disabled={busy || !consent || modes.length === 0}>{busy ? 'Saving…' : me ? 'Save camp profile' : 'Create camp profile'}</button>
    </form>
    <section className="connect-panel"><h2>Camp photos</h2><p className="connect-muted">1–4 of your own photos. Only approved photos appear to others. JPEG, PNG or WebP, maximum 5 MB each. A draft stays off the Trail until a photo is approved.</p>
      {!me ? <p className="connect-notice">Save your profile first, then add your photos here.</p> : <><div className="connect-photo-grid" style={{ marginTop: 20 }}>{me.photos.map(p => <figure key={p.storageId}><ConnectPhoto profileId={me.id} playerId={playerId} alt="Your camp photo" storageId={p.storageId} revision={me.photos.map(p => p.status).join()} /><figcaption className="connect-small" style={{ margin: '8px 0' }}>{p.status === 'pending' ? 'Waiting for Ranger approval' : p.status === 'approved' ? 'Approved · visible to campers' : 'Rejected · try a different photo'}</figcaption><button type="button" className="connect-btn danger" disabled={busy} onClick={async () => { if (!confirm('Remove this photo?')) return; setBusy(true); setError(''); try { await remove({ playerId, storageId: p.storageId }); setStatus('Photo removed.'); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>Remove photo</button></figure>)}</div>
        <label htmlFor="camp-photo" className="connect-label" style={{ marginTop: 24 }}>Add photo ({me.photos.length}/4)</label><input id="camp-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || me.photos.length >= 4 || me.banned || me.suspended || me.hidden} className="connect-input" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setError(''); if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPEG, PNG or WebP up to 5 MB.'); return; } setBusy(true); setStatus('Uploading photo…'); try { const url = await uploadUrl({ playerId }); const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file }); if (!response.ok) throw new Error('Photo upload could not finish.'); const { storageId } = await response.json(); await attach({ playerId, storageId }); setStatus('Photo uploaded. A Ranger will review it before it appears on the Trail.'); } catch (e) { setError(connectError(e)); setStatus(''); } finally { setBusy(false); } }} />
      </>}
    </section>
    {me && <section className="connect-panel"><h2>Leave no trace</h2><p className="connect-muted">Delete your profile, stored photos, swipes and messages you sent. This closes your fires. Ranger audit and moderation evidence are retained for camp safety; bans do not reset.</p><button className="connect-btn danger" disabled={busy} style={{ marginTop: 20 }} onClick={async () => { if (!confirm('Delete your camp profile, photos, swipes and sent messages? This cannot be undone.')) return; setBusy(true); setError(''); try { await del({ playerId }); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}>Delete my profile</button></section>}
  </>;
}
