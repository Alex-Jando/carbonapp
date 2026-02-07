"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";

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

    void loadProfile().then(() => loadTasks());
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
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  return (
    <main>
      <h1>Home</h1>
      <p>User ID: {localId}</p>
      <p>Initial Footprint (kg/year): {initialFootprintKg}</p>
      <p>Daily tasks remaining: {remainingTasks}</p>
      {error ? <p>{error}</p> : null}
      {loadingTasks ? <p>Loading tasks...</p> : null}
      <section>
        <h2>Daily Tasks</h2>
        {tasks.length === 0 && !loadingTasks ? <p>No tasks found.</p> : null}
        {tasks.map((task) => (
          <div key={String(task.id)}>
            <h3>{String(task.title ?? "Untitled task")}</h3>
            <p>Carbon Offset (kg): {Number(task.carbonOffsetKg ?? 0)}</p>
            {task.difficulty ? <p>Difficulty: {String(task.difficulty)}</p> : null}
            {task.reason ? <p>Reason: {String(task.reason)}</p> : null}
            <label>
              Upload proof (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setFilesByTask((prev) => ({ ...prev, [String(task.id)]: file }));
                }}
              />
            </label>
            <button type="button" onClick={() => handleCompleteTask(String(task.id))}>
              Complete
            </button>
          </div>
        ))}
      </section>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </main>
  );
}
