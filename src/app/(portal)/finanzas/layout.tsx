import { requireAdmin } from '@/lib/auth'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
