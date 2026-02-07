"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);
  const [initialFootprintKg, setInitialFootprintKg] = useState<number | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("auth_local_id");
    const idToken = localStorage.getItem("auth_id_token");
    if (!storedId || !idToken) {
      router.replace("/login");
      return;
    }
    setLocalId(storedId);

    const loadProfile = async () => {
      const res = await fetch(`/api/profile?localId=${encodeURIComponent(storedId)}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
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

    void loadProfile();
  }, [router]);

  if (!localId || initialFootprintKg === null) {
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
      <p>Initial Footprint (kg/year): {initialFootprintKg}</p>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </main>
  );
}
