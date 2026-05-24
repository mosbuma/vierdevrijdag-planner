type Props = {
  label?: string;
};

export function NostrLoadingSpinner({ label = "Events laden van relays…" }: Props) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400"
        aria-hidden
      />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
