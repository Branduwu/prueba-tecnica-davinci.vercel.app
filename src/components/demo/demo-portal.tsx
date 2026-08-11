'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Shell from '@/components/shell'
import { readDemoSession } from '@/lib/demo/client'
import type { DemoUser } from '@/lib/demo/types'
import { DemoDataProvider, useDemoData } from '@/components/demo/demo-data-provider'

export default function DemoPortal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<DemoUser | null | undefined>(undefined)

  useEffect(() => {
    const timeout = window.setTimeout(() => setUser(readDemoSession()), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (user === null) router.replace('/login')
    if (user?.role === 'cashier' && (pathname === '/dashboard' || pathname === '/finanzas')) router.replace('/pos')
  }, [pathname, router, user])

  if (user === undefined || user === null || (user.role === 'cashier' && (pathname === '/dashboard' || pathname === '/finanzas'))) {
    return <main className="demo-loading">Cargando entorno de demostración…</main>
  }

  return <DemoDataProvider user={user}><DemoShell>{children}</DemoShell></DemoDataProvider>
}

function DemoShell({ children }: { children: React.ReactNode }) {
  const { user, reset } = useDemoData()

  function resetWithConfirmation() {
    if (window.confirm('¿Restablecer productos, ventas, movimientos y gastos del modo demo?')) void reset()
  }

  return <Shell profile={user} demo onResetDemo={resetWithConfirmation}>{children}</Shell>
}
