'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearDemoSession } from '@/lib/demo/client'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types/database'

const links = [['/dashboard', 'Dashboard', 'admin'], ['/pos', 'Punto de venta', 'all'], ['/inventario', 'Inventario', 'all'], ['/finanzas', 'Finanzas', 'admin']]

export default function Shell({ children, profile, demo, onResetDemo }: { children: React.ReactNode; profile: { full_name: string; role: Role }; demo?: boolean; onResetDemo?: () => void }) {
  const path = usePathname()
  const router = useRouter()

  async function out() {
    if (demo) {
      clearDemoSession()
      router.replace('/login')
      router.refresh()
      return
    }
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return <div className="shell"><aside><Link href="/pos" className="brand">mercado<span>ERP</span></Link><nav>{links.filter((link) => link[2] === 'all' || profile.role === 'admin').map(([href, label]) => <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>)}</nav><div className="account"><strong>{profile.full_name}</strong><small>{profile.role === 'admin' ? 'Administrador' : 'Cajero'}</small>{demo && <button className="link-button" onClick={onResetDemo}>Restablecer datos demo</button>}<button className="link-button" onClick={out}>Cerrar sesión</button></div></aside><main className="content"><header><div><p className="eyebrow">MERCADO CENTRAL</p><h2>{links.find((link) => link[0] === path)?.[1] ?? 'Mercado ERP'}</h2></div><span className="status" title={demo ? 'Modo de demostración' : undefined}>{demo ? 'DEMO' : 'Sucursal Centro · En línea'}</span></header>{children}</main></div>
}
