import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Cimeat AI - Smart Calorie Tracker",
  description: "2026 Premium Healthy Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} antialiased selection:bg-orange/20 overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
