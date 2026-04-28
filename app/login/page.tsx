"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Ongeldige gebruikersnaam of wachtwoord.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold text-white">VierDeVrijdag</h1>
      <p className="mb-6 text-slate-400">Log in om het programma te beheren.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <div>
          <label htmlFor="username">Gebruikersnaam</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            className="mt-1 w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Wachtwoord</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Bezig…" : "Inloggen"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <a href="/event?meet=latest">Publieke eventpagina</a>
      </p>
    </main>
  );
}
