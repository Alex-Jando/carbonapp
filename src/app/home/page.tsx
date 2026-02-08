"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { WelcomeHeader } from "@/src/components/home/WelcomeHeader";
import { DailyTasksCard } from "@/src/components/home/DailyTasksCard";
import { StatsOverview } from "@/src/components/home/StatsOverview";
import { CompletedTaskList } from "@/src/components/feed/CompletedTaskList";

function getFirebaseStorage() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getStorage(app);
}

export default function HomePage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);
  const [initialFootprintKg, setInitialFootprintKg] = useState<number | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesByTask, setFilesByTask] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [username, setUsername] = useState<string>("there");
  const [statsLoading, setStatsLoading] = useState(false);
  const [tasksCompletedCount, setTasksCompletedCount] = useState(0);
  const [carbonOffsetKgTotal, setCarbonOffsetKgTotal] = useState(0);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [dailyStats, setDailyStats] = useState<
    Array<{ dateKey: string; tasksCompleted: number; carbonOffsetKg: number }>
  >([]);
  const [recentCompleted, setRecentCompleted] = useState<Array<Record<string, unknown>>>([]);

  function handleAuthFailure() {
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  async function refreshIdToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("auth_refresh_token");
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!refreshToken || !apiKey) {
      return null;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.id_token) {
      localStorage.setItem("auth_id_token", data.id_token);
    }
    if (data.refresh_token) {
      localStorage.setItem("auth_refresh_token", data.refresh_token);
    }
    return data.id_token ?? null;
  }

  async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
    const idToken = localStorage.getItem("auth_id_token");
    if (!idToken) {
      handleAuthFailure();
      return null;
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${idToken}`);
    const res = await fetch(input, { ...init, headers });

    if (res.status !== 401) {
      return res;
    }

    const refreshedToken = await refreshIdToken();
    if (!refreshedToken) {
      handleAuthFailure();
      return null;
    }

    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
    return await fetch(input, { ...init, headers: retryHeaders });
  }

  useEffect(() => {
    const storedId = localStorage.getItem("auth_local_id");
    const idToken = localStorage.getItem("auth_id_token");
    if (!storedId || !idToken) {
      router.replace("/login");
      return;
    }
    setLocalId(storedId);

    const loadProfile = async () => {
      const res = await fetchWithAuth(`/api/profile?localId=${encodeURIComponent(storedId)}`);
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        const footprint = typeof data.initialFootprintKg === "number" ? data.initialFootprintKg : null;
        if (!footprint || footprint <= 0) {
          router.replace("/questionnaire");
          return;
        }
        setInitialFootprintKg(footprint);
      }
    };

    const loadTasks = async () => {
      setLoadingTasks(true);
      setError(null);
      const res = await fetchWithAuth("/api/daily-tasks");
      if (!res) return;
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load daily tasks.");
      } else {
        setDateKey(data.dateKey ?? null);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      }
      setLoadingTasks(false);
    };

    const loadStats = async () => {
      setStatsLoading(true);
      const res = await fetchWithAuth("/api/home-stats");
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        setUsername(data.user?.username || "there");
        setTasksCompletedCount(Number(data.user?.tasksCompletedCount) || 0);
        setCarbonOffsetKgTotal(Number(data.user?.carbonOffsetKgTotal) || 0);
        setStreakCurrent(Number(data.user?.streakCurrent) || 0);
        setStreakBest(Number(data.user?.streakBest) || 0);
        setDailyStats(Array.isArray(data.dailyStats) ? data.dailyStats : []);
      }
      setStatsLoading(false);
    };

    const loadRecent = async () => {
      const res = await fetchWithAuth(
        `/api/completed-tasks?uid=${encodeURIComponent(storedId)}&limit=15`,
      );
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        setRecentCompleted(Array.isArray(data.items) ? data.items : []);
      }
    };

    void loadProfile().then(() => loadTasks()).then(() => loadStats()).then(() => loadRecent());
  }, [router]);

  const remainingTasks = useMemo(() => tasks.length, [tasks.length]);

  if (!localId || initialFootprintKg === null) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  async function compressImage(file: File): Promise<Blob> {
    const imageBitmap = await createImageBitmap(file);
    const size = 300;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    const scale = Math.max(size / imageBitmap.width, size / imageBitmap.height);
    const drawWidth = imageBitmap.width * scale;
    const drawHeight = imageBitmap.height * scale;
    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(imageBitmap, offsetX, offsetY, drawWidth, drawHeight);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        "image/jpeg",
        0.4
      );
    });
  }

  async function handleCompleteTask(taskId: string) {
    setError(null);
    const idToken = localStorage.getItem("auth_id_token");
    const uid = localStorage.getItem("auth_local_id");
    if (!idToken || !uid) {
      router.replace("/login");
      return;
    }

    let imageUrl: string | undefined;
    const file = filesByTask[taskId] ?? null;
    if (file && dateKey) {
      const storage = getFirebaseStorage();
      const compressed = await compressImage(file);
      const storageRef = ref(storage, `taskProof/${uid}/${dateKey}/${taskId}.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      imageUrl = await getDownloadURL(storageRef);
    }

    const res = await fetchWithAuth("/api/complete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyTaskId: taskId, imageUrl })
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to complete task.");
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setFilesByTask((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setPreviewUrls((prev) => {
      const next = { ...prev };
      const url = next[taskId];
      if (url) {
        URL.revokeObjectURL(url);
      }
      delete next[taskId];
      return next;
    });

    if (data.totals) {
      setCarbonOffsetKgTotal(Number(data.totals.carbonOffsetKgTotal) || carbonOffsetKgTotal);
      setTasksCompletedCount(Number(data.totals.tasksCompletedCount) || tasksCompletedCount);
      setStreakCurrent(Number(data.totals.streakCurrent) || streakCurrent);
      setStreakBest(Number(data.totals.streakBest) || streakBest);
    }

    if (data.todayStats) {
      setDailyStats((prev) => {
        const existing = prev.filter((stat) => stat.dateKey !== data.todayStats.dateKey);
        return [...existing, data.todayStats].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      });
    }

    const resRecent = await fetchWithAuth(
      `/api/completed-tasks?uid=${encodeURIComponent(uid)}&limit=15`,
    );
    if (resRecent) {
      const recentData = await resRecent.json();
      if (resRecent.ok) {
        setRecentCompleted(Array.isArray(recentData.items) ? recentData.items : []);
      }
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  async function handleRedoQuestionnaire() {
    const res = await fetchWithAuth("/api/questionnaire/reset", { method: "POST" });
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to reset questionnaire.");
      return;
    }
    setInitialFootprintKg(null);
    router.push("/questionnaire");
  }

  const todayLabel = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <WelcomeHeader username={username} todayLabel={todayLabel} />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <DailyTasksCard
            tasks={tasks.map((task) => ({
              id: String(task.id),
              title: String(task.title ?? "Untitled task"),
              carbonOffsetKg: Number(task.carbonOffsetKg ?? 0),
              difficulty: task.difficulty ? String(task.difficulty) : undefined,
              reason: task.reason ? String(task.reason) : undefined
            }))}
            loading={loadingTasks}
            error={error}
            onComplete={handleCompleteTask}
            onFileChange={(taskId, file) => {
              setFilesByTask((prev) => ({ ...prev, [taskId]: file }));
              setPreviewUrls((prev) => {
                const next = { ...prev };
                const existing = next[taskId];
                if (existing) {
                  URL.revokeObjectURL(existing);
                }
                if (file) {
                  next[taskId] = URL.createObjectURL(file);
                } else {
                  delete next[taskId];
                }
                return next;
              });
            }}
            previewUrls={previewUrls}
          />

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
                Today
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {remainingTasks} tasks left
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Keep your momentum going. Every small action adds up.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-zinc-200 hover:border-emerald-400/40"
              >
                Logout
              </button>
            </div>

            {statsLoading ? (
              <div className="h-40 animate-pulse rounded-3xl bg-white/5" />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/10 via-white/5 to-transparent p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
                  Impact
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {carbonOffsetKgTotal.toFixed(1)} kg
                </p>
                <p className="text-sm text-zinc-400">
                  Total carbon offset so far.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
                Estimated Footprint
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {initialFootprintKg.toFixed(0)} kg/year
              </p>
              <p className="text-sm text-zinc-400">
                Estimated from your questionnaire responses.
              </p>
              <button
                type="button"
                onClick={handleRedoQuestionnaire}
                className="mt-4 w-full rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-400/15"
              >
                Redo questionnaire
              </button>
            </div>
          </div>
        </div>

        <StatsOverview
          streakCurrent={streakCurrent}
          streakBest={streakBest}
          tasksCompletedCount={tasksCompletedCount}
          carbonOffsetKgTotal={carbonOffsetKgTotal}
          dailyStats={dailyStats}
        />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Completed</h2>
            <span className="text-xs text-zinc-400">Last 15</span>
          </div>
          <div className="mt-6">
            <CompletedTaskList tasks={recentCompleted as any} emptyLabel="No completed tasks yet." />
          </div>
        </section>
      </div>
    </main>
  );
}
