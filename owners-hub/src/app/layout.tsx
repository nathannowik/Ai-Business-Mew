import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: process.env.APP_NAME || "Owners Hub", template: `%s · ${process.env.APP_NAME || "Owners Hub"}` },
  description: "Daily to-dos and weekly plans for the team.",
  appleWebApp: { capable: true, title: process.env.APP_NAME || "Owners Hub" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4338ca" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
