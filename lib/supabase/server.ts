import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (err) {
            // The cookies API can throw when called in Server Components during rendering.
            // This is expected behavior in Next.js — we silently ignore this specific case.
            // All other errors would indicate a real problem.
            if (process.env.NODE_ENV === 'development') {
              console.error('[Supabase cookie set error]', err)
            }
          }
        },
      },
    }
  )
}

// Service role client — only for backend operations that need to bypass RLS
// NEVER import this in client-side code
export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}