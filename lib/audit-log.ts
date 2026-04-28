import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function toAuditJson(data: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (v instanceof Date ? v.toISOString() : v)),
  ) as Prisma.InputJsonValue;
}

export function redactPasswordFields(body: Record<string, unknown>): Record<string, unknown> {
  const o = { ...body };
  if ("password" in o) o.password = "[redacted]";
  if ("password_hash" in o) o.password_hash = "[redacted]";
  return o;
}

export async function writeAuditLog(input: {
  username: string;
  action: string;
  subject?: string | null;
  changes?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        username: input.username || "(unknown)",
        action: input.action,
        subject: input.subject ?? null,
        changes:
          input.changes === undefined || input.changes === null
            ? undefined
            : toAuditJson(input.changes),
      },
    });
  } catch (err) {
    console.error("[audit-log]", err);
  }
}
