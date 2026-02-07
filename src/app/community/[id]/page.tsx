"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Member = {
  uid: string;
  username: string;
  email: string;
};

export default function CommunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = String(params?.id ?? "");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_id_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const res = await fetch(`/api/social/community?communityId=${encodeURIComponent(communityId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load community.");
        return;
      }

      setName(data.name ?? "Community");
      const memberIds = Array.isArray(data.members) ? data.members : [];
      const memberResults: Member[] = [];
      for (const id of memberIds) {
        const memberRes = await fetch(`/api/social/user?uid=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const memberData = await memberRes.json();
        if (memberRes.ok) {
          memberResults.push({
            uid: memberData.uid,
            username: memberData.username ?? "",
            email: memberData.email ?? ""
          });
        }
      }
      setMembers(memberResults);
    };

    if (communityId) {
      void load();
    }
  }, [communityId, router]);

  return (
    <main>
      <h1>{name || "Community"}</h1>
      {error ? <p>{error}</p> : null}
      <p>Members: {members.length}</p>
      {members.map((member) => (
        <div key={member.uid}>
          <p>{member.username || member.email || member.uid}</p>
        </div>
      ))}
    </main>
  );
}
