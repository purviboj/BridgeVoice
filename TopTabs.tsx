'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/auth', label: 'Login / Signup' },
  { href: '/about-bridgevoice', label: 'About BridgeVoice' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/research-insights', label: 'Research Insights' },
  { href: '/community-impact', label: 'Community Impact' }
];

export default function TopTabs() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-white">
            +
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">BridgeVoice</p>
            <p className="text-sm font-semibold text-slate-900">Care Communication Portal</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-full bg-cyan-50 p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        </div>
      </nav>
    </header>
  );
}
