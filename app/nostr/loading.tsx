import { NostrLoadingSpinner } from "@/components/NostrLoadingSpinner";

export default function NostrLoading() {
  return (
    <main>
      <h1 className="text-2xl font-bold text-white">Nostr-events</h1>
      <p className="mt-2 text-sm text-slate-400">Events laden…</p>
      <NostrLoadingSpinner />
    </main>
  );
}
