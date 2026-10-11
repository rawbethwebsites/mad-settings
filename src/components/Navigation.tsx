
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export default function Navigation({ night = false }: { night?: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { name: 'PROGRAM', href: '/#program' },
    { name: 'GAMES', href: '/#games' },
    { name: 'REGISTER', href: '/register' },
    { name: 'JOIN', href: '/join' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-300 px-6 py-4",
      isScrolled || night ? "bg-brand-black/90 md:bg-brand-black/80 md:backdrop-blur-md text-brand-cream py-3" : "bg-transparent text-brand-black"
    )}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="font-display font-black text-2xl tracking-tighter">
          MAD SETTINGS
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center font-display font-bold text-sm tracking-widest">
          {links.map(link => (
            <a key={link.name} href={link.href} className="hover:text-brand-purple transition-colors">
              {link.name}
            </a>
          ))}
          <a href="/register" className="bg-brand-purple text-brand-cream px-4 py-2 poster-border poster-shadow hover:translate-x-1 hover:-translate-y-1 transition-transform min-h-11 inline-flex items-center">
            REGISTER
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Close menu" : "Open menu"}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-brand-cream text-brand-black border-t-4 border-brand-black p-6 flex flex-col gap-6 font-display font-black text-2xl animate-in slide-in-from-top">
          {links.map(link => (
            <a key={link.name} href={link.href} onClick={() => setIsOpen(false)}>
              {link.name}
            </a>
          ))}
          <a href="/register" className="bg-brand-purple text-brand-cream p-4 text-center poster-border poster-shadow">
            REGISTER FOR CAMP
          </a>
        </div>
      )}
    </nav>
  );
}
