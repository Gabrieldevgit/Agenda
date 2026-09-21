/**
 * Server-side Supabase client — reads the caller's session from cookies so
 * RLS policies apply exactly as they would for a direct client request.
 * Use this (not the service-role client) for anything acting "as the user".
 *
 * Architectural note (Notebook v2 §3-4): this authenticates the HTTP request,
 * but subsequent Prisma calls DO NOT inherit Supabase RLS. Prisma uses
 * DATABASE_URL (pooled) which bypasses RLS — service authorization is primary.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseAnonKey(): string {
  // Support both legacy ANON_KEY and current publishable-key naming (Notebook v2 §12).
  return (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "") as string;
}

function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!supabaseAnonKey();
}

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    // Return a mock that behaves as unauthenticated — lets demo-workspace bypass auth (see API routes).
    // Throwing here caused 500 on every /api/* when .env is empty.
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>;
  }
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: any) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

export function isDemoMode(): boolean {
  // If either Supabase or Postgres is not configured, treat demo-workspace as local mock.
  return !isSupabaseConfigured() || !process.env.DATABASE_URL;
}
