"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type U = { id: number; username: string; role: string; created_at: Date };

export function UsersClient({ initialUsers }: { initialUsers: U[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [msg, setMsg] = useState<string | null>(null);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Mislukt");
      return;
    }
    setUsers((u) => [...u, data]);
    setUsername("");
    setPassword("");
    setRole("USER");
    router.refresh();
  }

  async function patchUser(id: number, patch: { password?: string; role?: "USER" | "ADMIN" }) {
    setMsg(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Mislukt");
      return;
    }
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role: data.role ?? u.role } : u)));
    router.refresh();
  }

  return (
    <div className="mt-8">
      {msg && <p className="mb-4 text-sm text-red-400">{msg}</p>}
      <form onSubmit={createUser} className="mb-10 max-w-md space-y-3 rounded border border-slate-700 p-4">
        <h2 className="font-semibold text-white">Nieuwe gebruiker</h2>
        <div>
          <label>Gebruikersnaam</label>
          <input className="mt-1 w-full" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Wachtwoord</label>
          <input type="password" className="mt-1 w-full" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label>Rol</label>
          <select className="mt-1 w-full" value={role} onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}>
            <option value="USER">User (meetings CRU)</option>
            <option value="ADMIN">Admin (alles)</option>
          </select>
        </div>
        <button type="submit">Aanmaken</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Naam</th>
            <th>Rol</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td className="space-x-2">
                <button
                  type="button"
                  className="bg-slate-600 text-xs"
                  onClick={() => {
                    const pw = prompt("Nieuw wachtwoord (min 6 tekens)?");
                    if (pw && pw.length >= 6) void patchUser(u.id, { password: pw });
                  }}
                >
                  Wachtwoord
                </button>
                <button
                  type="button"
                  className="bg-slate-600 text-xs"
                  onClick={() => void patchUser(u.id, { role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                >
                  Toggle rol
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
