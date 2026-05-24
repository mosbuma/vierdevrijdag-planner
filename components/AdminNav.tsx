import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-4">
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin" className="text-teal-400 no-underline hover:underline">
          Meetups
        </Link>
        <Link href="/admin/posters" className="text-teal-400 no-underline hover:underline">
          Posters
        </Link>
        {isAdmin && (
          <>
            <Link href="/admin/users" className="text-teal-400 no-underline hover:underline">
              Gebruikers
            </Link>
            <Link href="/admin/audit" className="text-teal-400 no-underline hover:underline">
              Auditlog
            </Link>
          </>
        )}
        <Link href="/event?meet=latest" className="text-slate-400 no-underline hover:underline">
          Publieke pagina
        </Link>
        <Link href="/nostr" className="text-slate-400 no-underline hover:underline">
          Nostr
        </Link>
      </nav>
      <SignOutButton />
    </header>
  );
}
