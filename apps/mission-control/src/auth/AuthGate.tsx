import { FormEvent, useEffect, useState } from "react";

import { api } from "@/services/api";

interface User {
  id: string;
  email: string;
  name: string;
  memberships: Array<{
    companyId: string;
    role: string;
    company: { id: string; name: string };
  }>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const nextUser = await api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(nextUser);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-[#05060A] text-white flex items-center justify-center">Authenticating…</div>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#05060A] text-white flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Luuku AI</p>
            <h1 className="mt-3 text-3xl font-semibold">Mission Control</h1>
            <p className="mt-2 text-sm text-white/50">Sign in to access your company workspace.</p>
          </div>
          <label className="block text-sm text-white/70">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" />
          </label>
          <label className="mt-4 block text-sm text-white/70">
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" />
          </label>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
