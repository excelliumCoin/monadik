// src/app/layout.tsx
import './globals.css';
import Providers from './providers';
import Link from 'next/link';

export const metadata = {
  title: 'Monad Racer',
  description: 'Racing on Monad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>

          <header className="topbar">
            <div className="topbar__wrap">
              <Link href="/" className="topbar__brand">
                <span className="topbar__logo" aria-hidden>🏁</span>
                Monadik Racer
              </Link>
              <nav className="topbar__nav">
                <Link href="/">Home</Link>
                <Link href="/leaderboard">Leaderboard</Link>
              </nav>
            </div>
          </header>


          <main className="page">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
