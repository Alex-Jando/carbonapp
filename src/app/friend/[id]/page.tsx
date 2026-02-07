"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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

  useEffect(() => {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const res = await fetch(`/api/social/user?uid=${encodeURIComponent(uid)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load friend.");
        return;
      }

      setProfile({
        uid: data.uid,
        username: data.username ?? "",
        email: data.email ?? "",
        city: data.city ?? "",
        initialFootprintKg: data.initialFootprintKg ?? null,
        carbonOffsetKgTotal: data.carbonOffsetKgTotal ?? 0
      });
    };

    if (uid) {
      void load();
    }
  }, [router, uid]);

  return (
    <main>
      <h1>Friend</h1>
      {error ? <p>{error}</p> : null}
      {profile ? (
        <div>
          <p>Username: {profile.username || "N/A"}</p>
          <p>Email: {profile.email || "N/A"}</p>
          <p>City: {profile.city || "N/A"}</p>
          <p>Initial Footprint: {profile.initialFootprintKg ?? "N/A"}</p>
          <p>Carbon Offset Total: {profile.carbonOffsetKgTotal ?? 0}</p>
        </div>
      ) : null}
    </main>
  );
}
