"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CommunitySummary = {
  id: string;
  name: string;
  membersCount: number;
};

export default function SocialPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [joinCommunityId, setJoinCommunityId] = useState("");
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const loadCommunities = async () => {
      const res = await fetch("/api/social/all-communities", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.communities)) {
        setCommunities(data.communities);
      }
    };

    void loadCommunities();
  }, [router]);

  async function postJson(url: string, body: Record<string, unknown>) {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return null;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Request failed.");
      return null;
    }
    setStatus("Success.");
    return data;
  }

  async function handleAddFriend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const data = await postJson("/api/social/add-friend", { email });
    if (data) {
      setEmail("");
    }
  }

  async function handleCreateCommunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const data = await postJson("/api/social/create-community", { name: communityName });
    if (data) {
      setCommunityName("");
      const token = localStorage.getItem("auth_id_token");
      if (token) {
        const res = await fetch("/api/social/all-communities", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();
        if (res.ok && Array.isArray(payload.communities)) {
          setCommunities(payload.communities);
        }
      }
    }
  }

  async function handleJoinCommunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const data = await postJson("/api/social/join-community", { communityId: joinCommunityId });
    if (data) {
      setJoinCommunityId("");
    }
  }

  async function handleJoinCommunityByList(id: string) {
    setStatus(null);
    await postJson("/api/social/join-community", { communityId: id });
  }

  return (
    <main>
      <h1>Social</h1>

      <section>
        <h2>Add Friend</h2>
        <form onSubmit={handleAddFriend}>
          <input
            type="email"
            placeholder="friend@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit">Add Friend</button>
        </form>
      </section>

      <section>
        <h2>Create Community</h2>
        <form onSubmit={handleCreateCommunity}>
          <input
            type="text"
            placeholder="Community name"
            value={communityName}
            onChange={(event) => setCommunityName(event.target.value)}
            required
          />
          <button type="submit">Create</button>
        </form>
      </section>

      <section>
        <h2>Join Community by ID</h2>
        <form onSubmit={handleJoinCommunity}>
          <input
            type="text"
            placeholder="Community ID"
            value={joinCommunityId}
            onChange={(event) => setJoinCommunityId(event.target.value)}
            required
          />
          <button type="submit">Join</button>
        </form>
      </section>

      <section>
        <h2>All Communities</h2>
        {communities.length === 0 ? <p>No communities yet.</p> : null}
        {communities.map((community) => (
          <div key={community.id}>
            <p>
              {community.name} (members: {community.membersCount})
            </p>
            <button type="button" onClick={() => handleJoinCommunityByList(community.id)}>
              Join
            </button>
          </div>
        ))}
      </section>

      {status ? <p>{status}</p> : null}
    </main>
  );
}
