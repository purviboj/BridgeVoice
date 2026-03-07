import './globals.css';
import type { Metadata } from 'next';
import TopTabs from '@/components/TopTabs';

export const metadata: Metadata = {
  title: 'BridgeVoice',
  description: 'Real-time healthcare captions, translations, and summaries'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopTabs />
        {children}
      </body>
    </html>
  );
}
