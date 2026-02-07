"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthResponse = {
  localId?: string;
  idToken?: string;
  error?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as AuthResponse;
      if (!res.ok || !data.localId) {
        setError(data.error ?? "Signup failed.");
        return;
      }

      if (data.idToken) {
        localStorage.setItem("auth_id_token", data.idToken);
      }
      localStorage.setItem("auth_local_id", data.localId);
      router.push("/home");
    } catch {
      setError("Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      {error ? <p>{error}</p> : null}
    </main>
  );
}
