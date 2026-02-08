"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";

type FriendProfile = {
  uid: string;
  username: string;
  email: string;
  city: string;
  initialFootprintKg: number | null;
  carbonOffsetKgTotal: number;
};

export default function FriendDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = String(params?.id ?? "");

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function handleAuthFailure() {
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      if (!uid) {
        setError("Missing friend id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const res = await fetch(`/api/social/user?uid=${encodeURIComponent(uid)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleAuthFailure();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load friend.");
        setLoading(false);
        return;
      }

      setProfile({
        uid: data.uid,
        username: data.username ?? "",
        email: data.email ?? "",
        city: data.city ?? "",
        initialFootprintKg: data.initialFootprintKg ?? null,
        carbonOffsetKgTotal: data.carbonOffsetKgTotal ?? 0,
      });
      setLoading(false);
    };

    void load();
  }, [router, uid]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.18]" />
      </div>

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
          className="w-full max-w-3xl"
        >
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400/90 to-lime-300/80 shadow-[0_16px_35px_rgba(16,185,129,0.18)]" />
                  <div>
                    <CardTitle className="text-2xl tracking-tight">Friend Profile</CardTitle>
                    <CardDescription className="text-zinc-300">
                      View stats and profile details.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]"
                >
                  <a href="/social">Back to Social</a>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {error ? (
                <Alert className="border-rose-500/30 bg-rose-500/10 text-zinc-50">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              ) : null}

              {loading ? <p className="text-zinc-300">Loading profile...</p> : null}

              {!loading && profile ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Username</p>
                      <p className="mt-1 text-zinc-100">{profile.username || "N/A"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">City</p>
                      <p className="mt-1 text-zinc-100">{profile.city || "N/A"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Email</p>
                      <p className="mt-1 text-zinc-100">{profile.email || "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-200/70">
                        Initial Footprint
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {profile.initialFootprintKg !== null
                          ? `${profile.initialFootprintKg} kg`
                          : "N/A"}
                      </p>
                      <p className="text-xs text-zinc-400">Estimated per year</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-200/70">
                        Carbon Offset
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {profile.carbonOffsetKgTotal} kg
                      </p>
                      <p className="text-xs text-zinc-400">Total offset achieved</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
