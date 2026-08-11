import { redirect } from 'next/navigation'
import DemoPortal from '@/components/demo/demo-portal'
import Shell from '@/components/shell'
import { isDemoMode } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (isDemoMode()) return <DemoPortal>{children}</DemoPortal>

  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await db.from('profiles').select('full_name,role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  return <Shell profile={profile}>{children}</Shell>
}
