import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  if (!isSupabaseConfigured()) {
    if (!request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({name,value,options}) => response.cookies.set(name,value,options)) } } })
  await supabase.auth.getUser()
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
