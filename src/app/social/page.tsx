"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { Badge } from "@/src/app/components/ui/badge";

type CommunitySummary = {
  id: string;
  name: string;
  membersCount: number;
};

type FriendSummary = {
  uid: string;
  username: string;
  email: string;
};

export default function SocialPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [joinCommunityId, setJoinCommunityId] = useState("");
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [myCommunityIds, setMyCommunityIds] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function loadMe(token: string) {
    const meRes = await fetch("/api/social/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meRes.status === 401) {
      handleAuthFailure();
      return;
    }
    const meData = await meRes.json();
    if (meRes.ok) {
      setMyCommunityIds(Array.isArray(meData.communities) ? meData.communities : []);
      const friendIds = Array.isArray(meData.friends) ? meData.friends : [];
      const friendResults: FriendSummary[] = [];
      for (const id of friendIds) {
        const res = await fetch(`/api/social/user?uid=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          handleAuthFailure();
          return;
        }
        const data = await res.json();
        if (res.ok) {
          friendResults.push({
            uid: data.uid,
            username: data.username ?? "",
            email: data.email ?? "",
          });
        }
      }
      setFriends(friendResults);
    }
  }

  async function loadCommunities(token: string) {
    const res = await fetch("/api/social/all-communities", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handleAuthFailure();
      return;
    }

    const data = await res.json();
    if (res.ok && Array.isArray(data.communities)) {
      setCommunities(data.communities);
    }
  }

  async function refreshSocialData() {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    await loadMe(token);
    await loadCommunities(token);
  }

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

    void loadMe(token).then(() => loadCommunities(token));
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      handleAuthFailure();
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Request failed.");
      return null;
    }

    setStatus("Success.");
    return data;
  }

  async function handleAddFriend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const data = await postJson("/api/social/add-friend", { email });
    if (data) {
      setEmail("");
      await refreshSocialData();
    }
  }

  async function handleCreateCommunity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const data = await postJson("/api/social/create-community", {
      name: communityName,
    });

    if (data) {
      setCommunityName("");
      await refreshSocialData();
    }
  }

  async function handleJoinCommunity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const data = await postJson("/api/social/join-community", {
      communityId: joinCommunityId,
    });
    if (data) {
      setJoinCommunityId("");
      await refreshSocialData();
    }
  }

  async function handleJoinCommunityByList(id: string) {
    setStatus(null);
    const data = await postJson("/api/social/join-community", { communityId: id });
    if (data) {
      await refreshSocialData();
    }
  }

  const myCommunities = useMemo(
    () => communities.filter((c) => myCommunityIds.includes(c.id)),
    [communities, myCommunityIds],
  );

  return (
    <main className="relative min-h-dvh bg-zinc-950 text-zinc-50">
      {/* 🔥 Stronger green background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.18),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-3xl font-semibold tracking-tight"
        >
          Social
        </motion.h1>

        {status ? (
          <Alert className="mb-6 border-emerald-400/40 bg-emerald-500/15 text-white">
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Add Friend */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Add Friend</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFriend} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-200">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@email.com"
                    required
                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-400 focus-visible:ring-emerald-400/60"
                  />
                </div>
                <Button className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-400/80 text-white shadow-[0_12px_35px_rgba(16,185,129,0.18)] hover:brightness-100 hover:ring-1 hover:ring-emerald-200/40">
                  Add Friend
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Create Community */}
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Create Community</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCommunity} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-200">Community Name</Label>
                  <Input
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="Eco Warriors"
                    required
                    className="border-white/10 bg-black/30 text-white placeholder:text-zinc-400 focus-visible:ring-emerald-400/60"
                  />
                </div>
                <Button className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-400/80 text-white shadow-[0_12px_35px_rgba(16,185,129,0.18)] hover:brightness-100 hover:ring-1 hover:ring-emerald-200/40">
                  Create
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.06] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">My Communities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myCommunities.length === 0 ? (
                <p className="text-sm text-zinc-400">No communities joined yet.</p>
              ) : (
                myCommunities.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{c.name}</p>
                      <Badge className="mt-1 bg-white/10 text-zinc-200">
                        {c.membersCount} members
                      </Badge>
                    </div>
                    <a
                      href={`/community/${c.id}`}
                      className="text-xs text-emerald-200 hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.06] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Friends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {friends.length === 0 ? (
                <p className="text-sm text-zinc-400">No friends yet.</p>
              ) : (
                friends.map((friend) => (
                  <a
                    key={friend.uid}
                    href={`/friend/${friend.uid}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {friend.username || friend.email || friend.uid}
                      </p>
                      <p className="text-xs text-zinc-400">{friend.email}</p>
                    </div>
                    <span className="text-xs text-emerald-200">View</span>
                  </a>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-white/10 bg-white/[0.06] backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">All Communities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {communities.length === 0 ? (
              <p className="text-sm text-zinc-400">No communities yet.</p>
            ) : (
                communities.map((c) => {
                  const isMember = myCommunityIds.includes(c.id);
                  return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{c.name}</p>
                      <Badge className="mt-1 bg-white/10 text-zinc-200">
                        {c.membersCount} members
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/community/${c.id}`}
                        className="text-xs text-emerald-200 hover:underline"
                      >
                        View
                      </a>
                      {isMember ? (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                          Joined
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleJoinCommunityByList(c.id)}
                          className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-400/80 text-white shadow-[0_12px_35px_rgba(16,185,129,0.18)] hover:brightness-100 hover:ring-1 hover:ring-emerald-200/40"
                        >
                          Join
                        </Button>
                      )}
                    </div>
                  </div>
                )})
              )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-white/10 bg-white/[0.06] backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Join Community by ID</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleJoinCommunity}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Input
                value={joinCommunityId}
                onChange={(e) => setJoinCommunityId(e.target.value)}
                placeholder="Community ID"
                required
                className="border-white/10 bg-black/30 text-white placeholder:text-zinc-400 focus-visible:ring-emerald-400/60"
              />
              <Button className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-400/80 text-white shadow-[0_12px_35px_rgba(16,185,129,0.18)] hover:brightness-100 hover:ring-1 hover:ring-emerald-200/40">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
