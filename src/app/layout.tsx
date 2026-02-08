import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CarbonApp",
  description: "CarbonApp",
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
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold tracking-wide">
                CarbonApp
              </span>
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
