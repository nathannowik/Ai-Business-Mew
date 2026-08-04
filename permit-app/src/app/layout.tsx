import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'PermitPilot — Soliciting Permit Operations',
  description: 'Automate soliciting-permit applications: fill real township forms and print ready-to-file batches.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Sidebar />
          <div className="main">
            <div className="content">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
