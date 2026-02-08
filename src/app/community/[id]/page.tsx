"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { CompletedTaskList } from "@/src/components/feed/CompletedTaskList";
import { AppLogo } from "@/src/components/brand/AppLogo";

type Member = {
  uid: string;
  username: string;
  email: string;
  carbonOffsetKgTotal?: number;
  initialFootprintKg?: number | null;
};

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = String(params?.id ?? "");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCompleted, setRecentCompleted] = useState<Array<Record<string, unknown>>>([]);

  function handleAuthFailure() {
    localStorage.removeItem("auth_id_token");
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
      const res = await fetch(`/api/social/community?communityId=${encodeURIComponent(communityId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleAuthFailure();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load community.");
        return;
      }

      setName(data.name ?? "Community");
      const memberIds = Array.isArray(data.members) ? data.members : [];
      const memberResults: Member[] = [];
      for (const id of memberIds) {
        const memberRes = await fetch(`/api/social/user?uid=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (memberRes.status === 401) {
          handleAuthFailure();
          return;
        }
        const memberData = await memberRes.json();
        if (memberRes.ok) {
          memberResults.push({
            uid: memberData.uid,
            username: memberData.username ?? "",
            email: memberData.email ?? "",
            carbonOffsetKgTotal: memberData.carbonOffsetKgTotal ?? 0,
            initialFootprintKg: memberData.initialFootprintKg ?? null
          });
        }
      }
      setMembers(memberResults);
      const completedRes = await fetch(
        `/api/completed-tasks?communityId=${encodeURIComponent(communityId)}&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const completedData = await completedRes.json();
      if (completedRes.ok) {
        setRecentCompleted(
          Array.isArray(completedData.items) ? completedData.items : [],
        );
      }
      setLoading(false);
    };

    if (communityId) {
      void load();
    }
  }, [communityId, router]);

  const totals = useMemo(() => {
    const totalOffset = members.reduce(
      (sum, member) => sum + (member.carbonOffsetKgTotal ?? 0),
      0
    );
    const footprintValues = members
      .map((member) => member.initialFootprintKg)
      .filter((value): value is number => typeof value === "number");
    const avgFootprint =
      footprintValues.length > 0
        ? footprintValues.reduce((sum, v) => sum + v, 0) /
          footprintValues.length
        : null;

    return {
      totalOffset,
      avgFootprint
    };
  }, [members]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
      </div>

      <motion.div
        className="pointer-events-none absolute left-6 top-24 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl"
        animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-4xl"
        >
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AppLogo
                    size={44}
                    imageClassName="drop-shadow-[0_16px_28px_rgba(16,185,129,0.24)]"
                  />
                  <div>
                    <CardTitle className="text-2xl tracking-tight">
                      {name || "Community"}
                    </CardTitle>
                    <CardDescription className="text-zinc-300">
                      {members.length} members · Community impact overview
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

              {loading ? <p className="text-zinc-300">Loading community...</p> : null}

              {!loading ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Members</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {members.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Total Offset</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {totals.totalOffset.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Avg Footprint</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {totals.avgFootprint !== null
                        ? `${totals.avgFootprint.toFixed(1)} kg`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              ) : null}

              {!loading ? (
                <div>
                  <p className="text-sm font-semibold text-white">Members</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {members.map((member) => (
                      <div
                        key={member.uid}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <p className="text-sm font-semibold text-white">
                          {member.username || member.email || member.uid}
                        </p>
                        <p className="text-xs text-zinc-400">{member.email}</p>
                        <div className="mt-2 text-xs text-zinc-400">
                          Offset: {Number(member.carbonOffsetKgTotal ?? 0).toFixed(1)} kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!loading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">
                    Recent Completed Tasks
                  </p>
                  <div className="mt-4">
                    <CompletedTaskList
                      tasks={recentCompleted as any}
                      emptyLabel="No completed tasks yet."
                    />
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
