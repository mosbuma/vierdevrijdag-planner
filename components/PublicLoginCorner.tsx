import Link from "next/link";

/** Fixed top-right login; high contrast so it stays visible on posters and dark backgrounds. */
export function PublicLoginCorner() {
  return (
    <Link
      href="/login"
      className="fixed right-3 top-3 z-[100] inline-flex items-center rounded-md border-2 border-white/70 bg-slate-950 px-3 py-2 text-sm font-semibold !text-white shadow-lg ring-2 ring-black/40 hover:!bg-teal-600 hover:!text-white hover:!no-underline"
      style={{ color: "#ffffff" }}
    >
      Inloggen
    </Link>
  );
}
