import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Xenler Mission Control",
  description: "Web dashboard for running and monitoring your OpenClaw AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-[var(--bg)] text-[var(--ink)] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
