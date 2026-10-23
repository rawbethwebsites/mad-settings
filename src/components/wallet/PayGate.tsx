'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { camperId } from '@/lib/camper';
import { naira, serverMessage } from '@/lib/account';
import { Btn } from '@/components/arcade/ui';

// Games with an entry fee: pay from the wallet once, then play until you leave the game.
export default function PayGate({ game, children }: { game: string; children: ReactNode }) {
  const price = useQuery(api.accounts.priceFor, { game });
  const [key] = useState(() => (typeof window === 'undefined' ? '' : camperId()));
  const me = useQuery(api.accounts.me, price ? { playerKey: key } : 'skip');
  const pay = useMutation(api.accounts.payToPlay);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (price === undefined) return null;
  if (price === 0 || paid) return <>{children}</>;

  const account = me?.account;
  const go = async () => {
    setBusy(true); setError('');
    try { await pay({ playerKey: key, game }); setPaid(true); }
    catch (e) { setError(serverMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 poster-border poster-shadow bg-white text-center">
      <div className="text-5xl mb-2">🎟️</div>
      <h2 className="font-display font-black text-2xl uppercase italic mb-1">{naira(price)} to play</h2>
      <p className="font-body mb-4">Pay once and play as many rounds as you like until you leave this game.</p>
      {me === undefined ? null : !account ? (
        <Link href="/account" className="block py-3 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase">Log in or sign up →</Link>
      ) : account.status !== 'approved' ? (
        <p className="p-3 poster-border bg-brand-acid font-body">Your camp payment is still being checked. You can play paid games once it is approved.</p>
      ) : (
        <>
          <p className="font-display font-bold uppercase text-sm mb-3">Wallet: {naira(account.balance)}</p>
          {account.balance >= price
            ? <Btn className="w-full" disabled={busy} onClick={go}>{busy ? 'Paying…' : `Pay ${naira(price)} and play →`}</Btn>
            : <Link href="/account" className="block py-3 poster-border bg-brand-purple text-brand-cream font-display font-black uppercase">Top up your wallet →</Link>}
        </>
      )}
      {error && <p role="alert" className="mt-3 font-body text-sm text-brand-coral">{error}</p>}
    </div>
  );
}
