"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button type="button" className="bg-slate-700 text-sm hover:bg-slate-600" onClick={() => signOut({ callbackUrl: "/" })}>
      Uitloggen
    </button>
  );
}
