import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope, Sora } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'NodeWave Project Tracker',
  description: 'Deliverable tracking for high-value projects with state-based permissions.',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b1220',
};

// Plain `children` typing on purpose: the global `LayoutProps` helper only exists after
// `next dev|build|typegen` has run, so it breaks `tsc` on a fresh checkout (CI).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} ${plexMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
