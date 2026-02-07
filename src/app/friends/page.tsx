"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Friend = {
  uid: string;
  username: string;
  email: string;
};

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
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

      const ids = Array.isArray(meData.friends) ? meData.friends : [];
      const results: Friend[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/social/user?uid=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          results.push({
            uid: data.uid,
            username: data.username ?? "",
            email: data.email ?? ""
          });
        }
      }
      setFriends(results);
    };

    void load();
  }, [router]);

  return (
    <main>
      <h1>Your Friends</h1>
      {error ? <p>{error}</p> : null}
      {friends.length === 0 ? <p>No friends yet.</p> : null}
      {friends.map((friend) => (
        <div key={friend.uid}>
          <p>{friend.username || friend.email || friend.uid}</p>
          <a href={`/friend/${friend.uid}`}>View</a>
        </div>
      ))}
    </main>
  );
}
