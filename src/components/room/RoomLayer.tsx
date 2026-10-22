'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { getPlayer, updatePlayer } from '@/lib/player';
import { camperId, stripServerError } from '@/lib/camper';

const btn = 'font-display font-black uppercase poster-border px-4 py-2 text-sm';

interface Toast {
  key: string;
  title: string;
  act?: { label: string; run: () => void };
  link?: { label: string; href: string };
}

export default function RoomLayer() {
  const pathname = usePathname();
  const router = useRouter();

  const [playerId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : camperId(),
  );
  const [code, setCode] = useState<string | null>(null);
  const [gone, setGone] = useState<'kicked' | 'closed' | 'missing' | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  // undefined = haven't learnt the room state yet; null = no live round; id = that round
  const [knownRound, setKnownRound] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState('');

  const heartbeat = useMutation(api.rooms.heartbeat);
  const award = useMutation(api.rooms.award);
  const joinMatch = useMutation(api.matches.join);
  const declineMatch = useMutation(api.matches.decline);

  // Follow the saved room code (updates when /join saves a player). The async
  // timeout satisfies the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    const read = () => setCode(getPlayer()?.roomCode || null);
    const t = window.setTimeout(read, 0);
    window.addEventListener('focus', read);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('focus', read);
    };
  }, [pathname]);

  const inRoom = !!playerId && !!code;
  const room = useQuery(
    api.rooms.get,
    inRoom ? { code: code as string, playerId: playerId as string } : 'skip',
  );
  const invites = useQuery(
    api.matches.invites,
    inRoom ? { code: code as string, playerId: playerId as string } : 'skip',
  );

  const dropRoom = () => {
    updatePlayer({ roomCode: '' });
    setCode(null);
  };

  // Liveness: every 15s; kick / close / vanish clears the room
  useEffect(() => {
    if (!inRoom) return;
    const c = code as string;
    const p = playerId as string;
    const beat = () => {
      heartbeat({ code: c, playerId: p })
        .then(status => {
          if (status === 'kicked' || status === 'closed' || status === 'missing') {
            dropRoom();
            // Codes from before rooms existed are unknown to the server: forget them quietly
            if (status !== 'missing') setGone(status);
          }
        })
        .catch(() => {});
    };
    beat();
    const t = window.setInterval(beat, 15000);
    return () => window.clearInterval(t);
  }, [inRoom, code, playerId, heartbeat]);

  // Solo points reach the room leaderboard
  useEffect(() => {
    if (!inRoom) return;
    const c = code as string;
    const p = playerId as string;
    const onScore = (e: Event) => {
      const d = (e as CustomEvent<{ game: string; points: number }>).detail;
      if (!d || d.points <= 0) return;
      award({ code: c, playerId: p, game: d.game, points: d.points }).catch(() => {});
    };
    window.addEventListener('mad:score', onScore);
    return () => window.removeEventListener('mad:score', onScore);
  }, [inRoom, code, playerId, award]);

  // Build toasts during render from reactive query data → no cascading sets
  const isGamesPage = pathname.startsWith('/games') || pathname.startsWith('/room');
  const toasts: Toast[] = [];
  // Invites reach a camper on any page, homepage included
  {
    for (const i of invites ?? []) {
      const key = `inv:${i.id}`;
      if (dismissed.includes(key)) continue;
      toasts.push({
        key,
        title: `${i.fromAvatar} ${i.from} INVITES YOU TO ${i.game.toUpperCase()}!`,
        act: {
          label: '✓ JOIN',
          run: () => {
            joinMatch({ matchId: i.id, playerId: playerId as string })
              .then(() => router.push(`/games/${i.game}?match=${i.id}`))
              .catch(e => setError(stripServerError(e)));
          },
        },
      });
    }
    const liveRound = room?.round ?? null;
    if (
      liveRound &&
      knownRound !== undefined &&
      liveRound.id !== knownRound &&
      room !== null && room !== undefined &&
      pathname !== `/room/${room.code}/play` &&
      !dismissed.includes(`round:${liveRound.id}`)
    ) {
      toasts.push({
        key: `round:${liveRound.id}`,
        title: `HOST STARTED ${liveRound.game.toUpperCase()}!`,
        link: { label: 'PLAY NOW →', href: `/room/${room.code}/play` },
      });
    }
  }

  // First live round we learn about is recorded in silence (async callback keeps
  // eslint's set-state-in-effect rule happy and never flashes on initial load);
  // a LATER change means the host just started a new round → toast.
  useEffect(() => {
    const id = room?.round?.id ?? null;
    const t = window.setTimeout(() => {
      setKnownRound(prev => (prev === undefined ? id : prev === id ? prev : prev));
    }, 0);
    return () => window.clearTimeout(t);
  }, [room?.round?.id]);
  const acceptRound = (id: string | null) => {
    setKnownRound(id);
  };

  const dismissToast = (key: string) => {
    if (key.startsWith('inv:') && playerId) {
      declineMatch({ matchId: key.slice(4) as never, playerId }).catch(() => {});
    }
    if (key.startsWith('round:')) {
      acceptRound(key.slice(6));
      return;
    }
    setDismissed(d => [...d, key].slice(-20));
  };

  // Kicked/closed notice auto-hides; never shown over the homepage
  useEffect(() => {
    if (!gone) return;
    const t = window.setTimeout(() => setGone(null), 8000);
    return () => window.clearTimeout(t);
  }, [gone]);

  const showGone = gone !== null && isGamesPage;
  if (!showGone && toasts.length === 0 && !error) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:max-w-sm z-50 space-y-3">
      {error && (
        <div role="alert" className="p-4 poster-border poster-shadow bg-brand-coral text-brand-black">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display font-bold text-sm uppercase">{error}</p>
            <button onClick={() => setError('')} aria-label="Dismiss" className="font-display font-black">✕</button>
          </div>
        </div>
      )}
      {showGone && (
        <div className="p-4 poster-border poster-shadow bg-brand-coral text-brand-black">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display font-black uppercase">
              {gone === 'kicked' ? 'THE HOST REMOVED YOU' : 'THE HOST CLOSED THE ROOM'}
            </p>
            <button onClick={() => setGone(null)} aria-label="Dismiss" className="font-display font-black">✕</button>
          </div>
          <button onClick={() => router.push('/join')} className={`${btn} bg-brand-black text-brand-cream w-full mt-3`}>
            JOIN ANOTHER →
          </button>
        </div>
      )}
      {toasts.map(t => (
        <div key={t.key} className="p-4 poster-border poster-shadow bg-brand-acid text-brand-black">
          <p className="font-display font-black uppercase">{t.title}</p>
          <div className="flex gap-2 mt-3">
            {t.act && (
              <button onClick={t.act.run} className={`${btn} bg-brand-black text-brand-cream flex-1`}>
                {t.act.label}
              </button>
            )}
            {t.link && (
              <button
              onClick={() => {
                acceptRound(t.key.startsWith('round:') ? t.key.slice(6) : null);
                router.push(t.link!.href);
              }}
              className={`${btn} bg-brand-black text-brand-cream flex-1`}
            >
                {t.link.label}
              </button>
            )}
            <button onClick={() => dismissToast(t.key)} className={`${btn} bg-white`}>
              {t.act ? '✗ PASS' : 'DISMISS'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
