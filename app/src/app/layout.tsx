import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "YoTa",
  description: "Advanced Minutes of Meeting (MoM) AI Copilot for Desktop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased selection:bg-[var(--color-orange)]/20 overflow-hidden`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
