"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";

type AuthResponse = {
  localId?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
};

function prettyError(message?: string) {
  if (!message) return "Login failed.";
  // Optional: map your API errors to friendly text here
  return message;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as AuthResponse;

      if (!res.ok || !data.localId) {
        setError(prettyError(data.error));
        return;
      }

      if (data.idToken) localStorage.setItem("auth_id_token", data.idToken);
      if (data.refreshToken) localStorage.setItem("auth_refresh_token", data.refreshToken);
      localStorage.setItem("auth_local_id", data.localId);

      router.push("/questionnaire");
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      {/* Ambient green background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.18]" />
      </div>

      {/* floating blobs */}
      <motion.div
        className="pointer-events-none absolute left-6 top-24 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl"
        animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-10 top-1/3 h-28 w-28 rounded-full bg-lime-300/15 blur-2xl"
        animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
        transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400/90 to-lime-300/80 shadow-[0_16px_35px_rgba(16,185,129,0.18)]" />
                <div>
                  <CardTitle className="text-2xl tracking-tight">
                    Welcome back
                  </CardTitle>
                  <CardDescription className="text-zinc-300">
                    Log in to track and reduce your footprint.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="h-11 border-white/10 bg-black/20 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-400/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className="h-11 border-white/10 bg-black/20 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-400/40"
                  />
                </div>

                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Alert className="border-rose-500/30 bg-rose-500/10 text-zinc-50">
                      <AlertDescription className="text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                ) : null}

                <div className="flex items-center justify-between">
                  <Link
                    href="/signup"
                    className="text-sm text-zinc-300 underline-offset-4 hover:text-zinc-100 hover:underline"
                  >
                    Create account
                  </Link>

                  {/* If you later add reset password */}
                  <span className="text-xs text-zinc-500">Secure login</span>
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="relative h-11 w-full overflow-hidden bg-gradient-to-r from-emerald-400 to-lime-300 text-zinc-950 shadow-[0_18px_55px_rgba(16,185,129,0.22)] hover:brightness-105 active:brightness-95"
                >
                  <motion.span
                    whileTap={{ scale: 0.985 }}
                    className="relative z-10"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </motion.span>
                  {/* sheen */}
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 hover:opacity-100">
                    <span className="absolute -left-1/3 top-0 h-full w-1/2 rotate-12 bg-white/20 blur-xl" />
                  </span>
                </Button>

                <p className="text-center text-xs text-zinc-500">
                  By continuing, you agree to basic app terms.
                </p>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Green theme • Motion UI • Firebase-ready
            </span>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
