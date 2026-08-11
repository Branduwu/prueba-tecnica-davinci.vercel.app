export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}

export function isDemoMode() {
  return !isSupabaseConfigured() && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
