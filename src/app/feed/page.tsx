"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlobalStats } from "@/src/components/feed/GlobalStats";
import { CompletedTaskList } from "@/src/components/feed/CompletedTaskList";

type CompletedTask = {
  id: string;
  title: string;
  carbonOffsetKg: number;
  completedAt?: string;
  username?: string;
  userEmail?: string | null;
  imageUrl?: string | null;
};

type DailyStat = {
  dateKey: string;
  tasksCompleted: number;
  carbonOffsetKg: number;
};

export default function FeedPage() {
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<{ totals: { tasksCompleted: number; carbonOffsetKg: number }; dailyStats: DailyStat[] }>({
    totals: { tasksCompleted: 0, carbonOffsetKg: 0 },
    dailyStats: []
  });

  async function loadFeed(cursor?: string | null) {
    const params = new URLSearchParams();
    params.set("limit", "15");
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/feed?${params.toString()}`);
    const data = await res.json();
    if (res.ok) {
      if (cursor) {
        setTasks((prev) => [...prev, ...(data.items ?? [])]);
      } else {
        setTasks(data.items ?? []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
      setNextCursor(data.nextCursor ?? null);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadFeed().finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative min-h-dvh bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.10),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-semibold">Community Feed</h1>
          <p className="text-sm text-zinc-400">
            See recent sustainability wins from everyone.
          </p>
        </motion.div>

        <GlobalStats totals={stats.totals} dailyStats={stats.dailyStats} />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Completed Tasks</h2>
            <span className="text-xs text-zinc-400">Newest first</span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-400">Loading feed...</p>
          ) : (
            <div className="mt-6">
              <CompletedTaskList tasks={tasks} emptyLabel="No activity yet." />
            </div>
          )}

          <div className="mt-6 flex justify-center">
            {nextCursor ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={async () => {
                  setLoadingMore(true);
                  await loadFeed(nextCursor);
                  setLoadingMore(false);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-400/40"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            ) : (
              <span className="text-xs text-zinc-500">No more results</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
