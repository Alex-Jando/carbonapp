"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("auth_local_id");
    if (!storedId) {
      router.replace("/login");
      return;
    }
    setLocalId(storedId);
  }, [router]);

  if (!localId) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  return (
    <main>
      <h1>Home</h1>
      <p>User ID: {localId}</p>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </main>
  );
}
