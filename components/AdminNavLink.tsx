"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  showPendingSpinner?: boolean;
};

function LinkLabel({ children, showPendingSpinner }: Pick<Props, "children" | "showPendingSpinner">) {
  const { pending } = useLinkStatus();

  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      {showPendingSpinner && pending ? (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-teal-400"
          aria-hidden
        />
      ) : null}
      {pending ? <span className="sr-only"> (laden…)</span> : null}
    </span>
  );
}

export function AdminNavLink({ href, children, className, showPendingSpinner }: Props) {
  return (
    <Link href={href} className={className}>
      <LinkLabel showPendingSpinner={showPendingSpinner}>{children}</LinkLabel>
    </Link>
  );
}
