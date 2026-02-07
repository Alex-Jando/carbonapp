"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Community = {
  id: string;
  name: string;
  members: string[];
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const meRes = await fetch("/api/social/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      if (!meRes.ok) {
        setError(meData.error ?? "Failed to load profile.");
        return;
      }

      const ids = Array.isArray(meData.communities) ? meData.communities : [];
      const results: Community[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/social/community?communityId=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          results.push({
            id: data.id,
            name: data.name,
            members: Array.isArray(data.members) ? data.members : []
          });
        }
      }
      setCommunities(results);
    };

    void load();
  }, [router]);

  return (
    <main>
      <h1>Your Communities</h1>
      {error ? <p>{error}</p> : null}
      {communities.length === 0 ? <p>No communities joined yet.</p> : null}
      {communities.map((community) => (
        <div key={community.id}>
          <p>{community.name}</p>
          <p>Members: {community.members.length}</p>
          <a href={`/community/${community.id}`}>View</a>
        </div>
      ))}
    </main>
  );
}
