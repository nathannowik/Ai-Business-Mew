import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mew AI — Business Control Panel",
  description: "One app to run your business's AI services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
