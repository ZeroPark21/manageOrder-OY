import { createClient } from "@supabase/supabase-js"

/**
 * Call **only from Client Components**.
 * Creates (or re-uses) a browser Supabase client that relies on the public env vars.
 */
let browserClient: ReturnType<typeof createClient> | null = null
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error(
      "Supabase public env vars are missing. Did you set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY?",
    )
  }

  browserClient = createClient(url, anon)
  return browserClient
}

/**
 * Call **only on the server** (e.g. Route Handlers, Server Actions).
 * Falls back to the anon key if the Service Role key is not provided.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase env vars are missing. Please set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    )
  }

  return createClient(url, serviceKey)
}
