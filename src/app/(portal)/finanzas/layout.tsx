import { requireAdmin } from '@/lib/auth'
import { isDemoMode } from '@/lib/supabase/config'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoMode()) await requireAdmin()
  return children
}
