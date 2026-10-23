'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { camperId } from '@/lib/camper';
import { cn } from '@/lib/utils';

const LINKS = [
  { name: 'Program', href: '/#program' },
  { name: 'Games', href: '/games' },
  { name: 'Casino', href: '/casino' },
  { name: 'Meet campers', href: '/connect' },
  { name: 'Tickets', href: '/account' },
];

// Slim translucent bar (Apple style). On phones it opens into a full-screen sheet.
export default function Navigation({ night = false }: { night?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setKey(camperId()), 0);
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Lock the page behind the open menu, and let Escape close it
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const me = useQuery(api.accounts.me, key ? { playerKey: key } : 'skip');
  const signedIn = !!me?.account;
  const dark = night || scrolled || open;

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 inset-x-0 z-[120] h-12 transition-colors duration-300',
          dark ? 'bg-black/85 md:bg-black/70 text-white md:backdrop-blur-xl md:backdrop-saturate-150' : 'bg-transparent text-brand-black',
          scrolled && !open && 'border-b border-white/10',
        )}
      >
        <div className="max-w-5xl h-full mx-auto px-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-display font-black text-[17px] tracking-tight" onClick={() => setOpen(false)}>
            MAD SETTINGS
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium">
            {LINKS.map(l => (
              <a key={l.name} href={l.href} className="opacity-80 hover:opacity-100 transition-opacity">{l.name}</a>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <a
              href={signedIn ? '/account' : '/account?mode=login'}
              className="min-h-11 px-3 inline-flex items-center text-[13px] font-medium opacity-90 hover:opacity-100"
            >
              {signedIn ? 'My camp' : 'Log in'}
            </a>
            <a
              href="/account"
              className={cn('hidden md:inline-flex items-center h-7 px-3 rounded-full text-[12px] font-semibold', dark ? 'bg-white text-black' : 'bg-brand-black text-white')}
            >
              Get tickets
            </a>
            <button
              type="button"
              className="md:hidden min-h-11 min-w-11 -mr-2 inline-flex items-center justify-center"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
            >
              {/* Two lines that turn into an X */}
              <span className="relative block w-[18px] h-3">
                <span className={cn('absolute left-0 w-full h-[1.5px] bg-current rounded transition-all duration-300', open ? 'top-[5px] rotate-45' : 'top-[2px]')} />
                <span className={cn('absolute left-0 w-full h-[1.5px] bg-current rounded transition-all duration-300', open ? 'top-[5px] -rotate-45' : 'top-[8px]')} />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Phone menu: full-screen frosted sheet */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-[110] bg-black/85 text-white backdrop-blur-2xl transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div className="pt-16 px-8 pb-10 h-full flex flex-col overflow-y-auto">
          <ul className="space-y-1">
            {LINKS.map((l, i) => (
              <li
                key={l.name}
                className={cn('transition-all duration-500 ease-out', open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2')}
                style={{ transitionDelay: open ? `${80 + i * 40}ms` : '0ms' }}
              >
                <a href={l.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="block py-2 text-[28px] font-semibold tracking-tight">
                  {l.name}
                </a>
              </li>
            ))}
          </ul>

          <div
            className={cn('mt-auto pt-10 space-y-3 transition-all duration-500 ease-out', open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')}
            style={{ transitionDelay: open ? '300ms' : '0ms' }}
          >
            {signedIn ? (
              <a href="/account" tabIndex={open ? 0 : -1} className="flex items-center justify-center h-12 rounded-full bg-white text-black text-[15px] font-semibold">
                My camp
              </a>
            ) : (
              <>
                <a href="/account" tabIndex={open ? 0 : -1} className="flex items-center justify-center h-12 rounded-full bg-white text-black text-[15px] font-semibold">
                  Get tickets
                </a>
                <a href="/account?mode=login" tabIndex={open ? 0 : -1} className="flex items-center justify-center h-12 rounded-full border border-white/30 text-[15px] font-semibold">
                  Already registered? Log in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
