'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, UsersRound, X } from 'lucide-react';

const KEY = 'mad-connect-how-it-works-dismissed';
export default function HowItWorks() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setShow(localStorage.getItem(KEY) !== 'yes'); }
      catch { setShow(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!show) return null;
  return <aside className="connect-steps" aria-label="How it works">
    <div><p className="connect-small connect-muted">How it works</p><ol>
      <li><Heart size={16} aria-hidden="true" style={{ display: 'inline' }} /> Like</li>
      <li aria-hidden="true">→</li><li><UsersRound size={16} aria-hidden="true" style={{ display: 'inline' }} /> Match</li>
      <li aria-hidden="true">→</li><li><MessageCircle size={16} aria-hidden="true" style={{ display: 'inline' }} /> Chat</li>
    </ol></div>
    <button type="button" className="connect-btn" aria-label="Dismiss How it works" onClick={() => {
      setShow(false);
      try { localStorage.setItem(KEY, 'yes'); } catch { /* Dismiss still works without storage. */ }
    }}><X size={16} aria-hidden="true" /><span className="sr-only">Got it</span></button>
  </aside>;
}
