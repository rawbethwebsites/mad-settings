'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { Flag, Gamepad2, Send } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { CONNECT_PROMPTS, CONNECT_REACTIONS, CONNECT_STICKERS } from '../../../convex/connectConstants';
import ConnectShell, { connectError, ConnectError, ConnectLoading, useConnectPlayer } from './ConnectShell';

const GAMES = [{ id: 'whot', name: 'Whot!' }, { id: 'ocho', name: 'Ocho!' }, { id: 'ayo', name: 'Ayo' }, { id: 'ludo', name: 'Ludo' }, { id: 'connect4', name: 'Connect 4' }, { id: 'tictactoe', name: 'Endless Tic Tac Toe' }, { id: 'dots', name: 'Dots & Boxes' }];
export default function TentTalk() {
  const { id } = useParams<{ id: string }>(); const playerId = useConnectPlayer(); const router = useRouter();
  const valid = /^[a-z0-9]{20,64}$/.test(id ?? ''); const matchId = id as Id<'connectMatches'>;
  const chat = useQuery(api.connect.chat, playerId && valid ? { playerId, matchId } : 'skip');
  const send = useMutation(api.connect.sendMessage); const markRead = useMutation(api.connect.markRead); const react = useMutation(api.connect.react);
  const unmatch = useMutation(api.connect.unmatch); const block = useMutation(api.connect.block); const flag = useMutation(api.connect.flag); const challenge = useMutation(api.matches.create);
  const [body, setBody] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [game, setGame] = useState('whot'); const [reason, setReason] = useState(''); const [reportMessage, setReportMessage] = useState<Id<'connectMessages'> | ''>('');
  const latest = chat?.messages.at(-1)?.id;
  const chatReady = !!chat;
  useEffect(() => { if (chatReady && playerId) void markRead({ playerId, matchId }).catch(() => {}); }, [playerId, matchId, latest, markRead, chatReady]); // read only when entering or a new message arrives
  const sendText = async (e?: FormEvent, sticker?: string) => {
    e?.preventDefault(); if (!playerId || !chat || busy) return;
    setBusy(true); setError('');
    try { await send({ playerId, matchId, body: sticker ? '' : body, ...(sticker ? { sticker } : {}) }); if (!sticker) setBody(''); /* TODO: Tent Talk send sfx when sound kit lands. */ }
    catch (e) { setError(connectError(e)); } finally { setBusy(false); }
  };
  if (!valid || chat === null) return <ConnectShell title="Chat unavailable"><p className="connect-notice">Tap Matches to open another chat.</p><Link href="/connect/matches" className="connect-btn primary">Matches</Link></ConnectShell>;
  return <ConnectShell title={chat ? `Chat with ${chat.match.peer.campName}` : 'Chat'}>
    <ConnectError error={error} />{notice && <p role="status" className="connect-notice">{notice}</p>}
    {chat === undefined || !playerId ? <ConnectLoading /> : <>
      <p className="connect-muted">{chat.match.mode === 'campfire' ? 'Friends' : 'Teammates'}{chat.match.peer.verified ? ' · Ranger verified' : ''}</p>
      <details className="connect-panel"><summary>More options</summary>
      <details className="connect-panel"><summary className="connect-label" style={{ minHeight: 44, cursor: 'pointer' }}>Camper safety · Unmatch / Block / Flag</summary>
        <div className="connect-row"><button className="connect-btn" disabled={busy} onClick={async () => { if (!confirm('Unmatch? This fire will close for both campers.')) return; setBusy(true); try { await unmatch({ playerId, matchId }); router.push('/connect/matches'); } catch (e) { setError(connectError(e)); setBusy(false); } }}>Unmatch</button><button className="connect-btn danger" disabled={busy} onClick={async () => { if (!confirm(`Block ${chat.match.peer.campName}? Both of you will disappear from each other's Trail and this fire closes.`)) return; setBusy(true); try { await block({ playerId, target: chat.match.peer.id }); router.push('/connect/matches'); } catch (e) { setError(connectError(e)); setBusy(false); } }}>Block camper</button></div>
        <form className="connect-form" style={{ marginTop: 20 }} onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await flag({ playerId, target: chat.match.peer.id, matchId, reason, ...(reportMessage ? { messageId: reportMessage } : {}) }); setNotice('Your flag and chat context are with the Rangers.'); setReason(''); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}><div><label htmlFor="flag-item">Flagged item</label><select id="flag-item" value={reportMessage} onChange={e => setReportMessage(e.target.value as typeof reportMessage)}><option value="">This Tent Talk</option>{chat.messages.filter(m => !m.mine).map(m => <option key={m.id} value={m.id}>{(m.sticker || m.body).slice(0, 70)}</option>)}</select></div><div><label htmlFor="chat-flag-reason">Why are you flagging this?</label><textarea id="chat-flag-reason" required maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></div><button className="connect-btn" disabled={busy || !reason.trim()}><Flag size={18} />Flag to a Ranger</button></form>
      </details>
      <details className="connect-panel"><summary className="connect-label" style={{ minHeight: 44, cursor: 'pointer' }}>Challenge to a game</summary>{chat.challenge ? <div className="connect-form"><div><label htmlFor="challenge-game">Pick a game</label><select id="challenge-game" value={game} onChange={e => setGame(e.target.value)}>{GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div><button className="connect-btn primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const id = await challenge({ playerId, code: chat.challenge!.code, game, invite: [chat.challenge!.target] }); router.push(`/games/${game}?match=${id}`); } catch (e) { setError(connectError(e)); } finally { setBusy(false); } }}><Gamepad2 size={20} />Send Challenge</button></div> : <p className="connect-muted">Join the same camp room to send a Challenge. <Link href="/join" className="connect-btn" style={{ marginTop: 12 }}>Join a camp room</Link></p>}</details>
      {(chat.match.peer.socials?.instagram || chat.match.peer.socials?.discord) && <p className="connect-small connect-notice">Shared with matches only: {chat.match.peer.socials.instagram ? `Instagram: ${chat.match.peer.socials.instagram}` : ''} {chat.match.peer.socials.discord ? `Discord: ${chat.match.peer.socials.discord}` : ''}</p>}
      {chat.messageCount === 0 && chat.match.peer.prompts[0] && <section className="connect-panel"><h2>Start with a question</h2><p className="connect-eyebrow">{CONNECT_PROMPTS[chat.match.peer.prompts[0].question]}</p><p style={{ marginTop: 8 }}>{chat.match.peer.prompts[0].answer}</p><button className="connect-btn" style={{ marginTop: 16 }} onClick={() => setBody(`Tell me more about “${chat.match.peer.prompts[0].answer}”`)}>Use this question</button></section>}
      </details>
      <div className="connect-message-list" role="log" aria-live="polite" aria-label="Chat messages">{chat.messages.map(m => <article key={m.id} className={`connect-message${m.mine ? ' mine' : ''}`}><p className="connect-small connect-muted">{m.mine ? 'You' : chat.match.peer.campName}</p>{m.sticker && <p style={{ fontSize: 36 }} aria-label={`Camp sticker ${m.sticker}`}>{m.sticker}</p>}{m.body && <p>{m.body}</p>}<time dateTime={new Date(m.createdAt).toISOString()}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><div className="connect-reactions" aria-label="Message reactions">{CONNECT_REACTIONS.map(emoji => { const r = m.reactions.find(r => r.emoji === emoji); return <button key={emoji} aria-label={`React ${emoji}${r ? `, ${r.count} reactions` : ''}`} aria-pressed={!!r?.mine} disabled={busy || !chat.canSend} onClick={async () => { try { await react({ playerId, messageId: m.id, emoji }); } catch (e) { setError(connectError(e)); } }}>{emoji}{r ? ` ${r.count}` : ''}</button>; })}</div></article>)}</div>
      {chat.messages.length >= 150 && <p className="connect-small connect-muted">Showing the latest 150 messages.</p>}
      <form className="connect-composer" onSubmit={sendText}>
        {!chat.canSend && <p role="status" className="connect-notice">{chat.messagingPaused ? 'Chat is paused; tap Games while you wait.' : 'Chat is muted; ask a Ranger at camp for help.'}</p>}
        <details><summary>Stickers</summary><div className="connect-stickers" aria-label="Eight camp stickers">{CONNECT_STICKERS.map(s => <button key={s} type="button" aria-label={`Send ${s} camp sticker`} disabled={busy || !chat.canSend} onClick={() => void sendText(undefined, s)}>{s}</button>)}</div></details>
        <label htmlFor="tent-message" className="connect-label">Message {chat.match.peer.campName}</label><textarea id="tent-message" maxLength={500} value={body} onChange={e => setBody(e.target.value)} disabled={!chat.canSend} />
        <div className="connect-between" style={{ marginTop: 8 }}><p className="connect-small connect-muted">{body.length}/500{chat.messageCount < 10 && <span style={{ display: 'block' }}>No links or numbers yet.</span>}</p><button className="connect-btn primary" disabled={busy || !chat.canSend || !body.trim()}><Send size={18} />{busy ? 'Sending…' : 'Send'}</button></div>
      </form>
    </>}
  </ConnectShell>;
}
