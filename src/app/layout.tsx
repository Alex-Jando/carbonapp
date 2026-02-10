import type { ReactNode } from "react";
import Link from "next/link";
import { AppLogo } from "@/src/components/brand/AppLogo";
import "./globals.css";

export const metadata = {
  title: "Carbon Pals",
  description: "Carbon Pals",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-zinc-950 text-zinc-50">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="hover:opacity-90">
                <AppLogo size={30} showLabel />
              </Link>
            </div>
            <nav className="flex items-center gap-6 text-sm text-zinc-300">
              <a href="/home" className="hover:text-white">
                Home
              </a>
              <a href="/feed" className="hover:text-white">
                Feed
              </a>
              <a href="/social" className="hover:text-white">
                Social
              </a>
            </nav>
          </div>
        </header>
        <div className="min-h-[calc(100vh-64px)]">{children}</div>
      </body>
    </html>
  );
}
