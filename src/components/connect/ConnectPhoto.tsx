'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useMutation } from 'convex/react';
import { ImageOff } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export default function ConnectPhoto({ profileId, playerId, alt, className = '', storageId, revision = '', preview = false }: { profileId: string; playerId: string; alt: string; className?: string; storageId?: string; revision?: string; preview?: boolean }) {
  const urls = useMutation(api.connect.photoUrls);
  const [state, setState] = useState<{ profileId: string; photos: { storageId: string; url: string; status: string }[]; error: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let disposed = false; let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await urls({ playerId, profileId: profileId as Id<'connectProfiles'> });
        if (disposed) return;
        setState({ profileId, photos: result.photos, error: false });
        timer = setTimeout(refresh, Math.max(5000, result.expiresAt - Date.now() - 30_000));
      } catch { if (!disposed) setState({ profileId, photos: [], error: true }); }
    };
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, [profileId, playerId, urls, revision]);
  const photos = state?.profileId === profileId ? state.photos : [];
  const photo = storageId ? photos.find(p => p.storageId === storageId) : photos[index % Math.max(1, photos.length)];
  return <div className={className}>
    <div className="connect-photo-wrap">{photo ? <Image key={photo.url} src={photo.url} alt={alt} fill unoptimized sizes="(max-width: 700px) 100vw, 660px" className="connect-photo" referrerPolicy="no-referrer" onError={() => setState(s => s ? { ...s, photos: [], error: true } : s)} /> : <div className="connect-photo-placeholder"><span><ImageOff size={28} aria-hidden="true" style={{ margin: '0 auto 8px' }} />{state?.error ? 'Photo unavailable. Reopen to retry.' : state ? 'No approved photo to show.' : 'Loading photo…'}</span></div>}</div>
    {!preview && !storageId && photos.length > 1 && <div className="connect-photo-pager" aria-label="Profile photos">{photos.map((p, i) => <button type="button" key={p.storageId} className="connect-btn" aria-label={`Photo ${i + 1}`} aria-pressed={index === i} onClick={() => setIndex(i)}>{i + 1}</button>)}</div>}
  </div>;
}
