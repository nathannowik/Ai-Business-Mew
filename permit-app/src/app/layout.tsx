import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PermitPilot — Soliciting Permit Operations',
  description: 'Automate soliciting-permit applications: fill real township forms and print ready-to-file batches.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
