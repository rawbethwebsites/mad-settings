'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { camperId } from '@/lib/camper';
import { naira } from '@/lib/account';

// "My camp" button: wallet balance when logged in, otherwise a nudge to sign up
export default function WalletChip() {
  const [key, setKey] = useState('');
  useEffect(() => { const t = setTimeout(() => setKey(camperId()), 0); return () => clearTimeout(t); }, []);
  const me = useQuery(api.accounts.me, key ? { playerKey: key } : 'skip');
  const a = me?.account;
  return (
    <Link href="/account" className="mt-4 flex items-center justify-between gap-3 min-h-11 px-4 py-2 bg-brand-acid text-brand-black font-display font-black uppercase poster-border">
      <span>{a ? (a.status === 'approved' ? '💰 My wallet' : '⏳ Payment being checked') : '🎟️ Sign up / Log in'}</span>
      <span>{a ? naira(a.balance) : '→'}</span>
    </Link>
  );
}
