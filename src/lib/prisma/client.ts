/**
 * Server-only Prisma client. Never import this from a "use client" file —
 * the build will fail loudly if you try, because this file has no
 * "use client" directive and touches DATABASE_URL.
 *
 * CRITICAL (Notebook v2 §3-4): Prisma uses DATABASE_URL (pooled Supabase Postgres)
 * and BYPASSES Row Level Security. Authenticating with Supabase SSR
 * (createSupabaseServerClient().auth.getUser()) does NOT make the next
 * prisma.* call run as that user. All authorization must happen in the
 * service layer (workspace-service.ts) before calling the repository.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
