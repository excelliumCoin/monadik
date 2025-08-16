'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const is = (p: string) => (pathname === p || pathname?.startsWith(p) ? 'active' : '');
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-black tracking-tight text-xl neon-text">
          Monad Racer
        </Link>
        <nav className="flex items-center gap-1">
          <Link className={`navlink ${is('/')}`} href="/">Ana Sayfa</Link>
          <Link className={`navlink ${is('/leaderboard')}`} href="/leaderboard?scope=game">Leaderboard</Link>
        </nav>
      </div>
    </header>
  );
}
