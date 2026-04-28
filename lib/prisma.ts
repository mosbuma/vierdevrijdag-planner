import { PrismaClient } from "@prisma/client";
import { withDefaultMysqlUrlParams } from "@/lib/db-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const databaseUrl = withDefaultMysqlUrlParams(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl && { datasources: { db: { url: databaseUrl } } }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
