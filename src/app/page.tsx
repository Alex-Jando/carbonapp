"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      {/* Ambient green background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.18]" />
      </div>

      {/* Floating accents */}
      <motion.div
        className="pointer-events-none absolute left-8 top-32 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl"
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-12 bottom-40 h-32 w-32 rounded-full bg-lime-300/15 blur-2xl"
        animate={{ y: [0, 22, 0], x: [0, -12, 0] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl items-center justify-center px-4 py-12">
        <motion.section
          initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl text-center"
        >
          <Card className="border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
            {/* Logo / mark */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-300 shadow-[0_18px_45px_rgba(16,185,129,0.25)]">
              <span className="text-xl font-bold text-zinc-950">CO₂</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">CarbonApp</h1>

            <p className="mt-3 text-zinc-300">
              Track your carbon footprint. Make smarter choices. Reduce your
              impact.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Button
                asChild
                className="h-11 bg-gradient-to-r from-emerald-400 to-lime-300 text-zinc-950 shadow-[0_18px_55px_rgba(16,185,129,0.22)] hover:brightness-105 active:brightness-95"
              >
                <Link href="/login">Log in</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 border-white/20 bg-white/[0.02] text-zinc-100 hover:bg-white/[0.08]"
              >
                <Link href="/signup">Create account</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-zinc-500">
              Secure • Private • Designed for sustainability
            </p>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}
