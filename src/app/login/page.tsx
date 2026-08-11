'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateDemo, saveDemoSession } from '@/lib/demo/client'
import { createClient } from '@/lib/supabase/client'
import { isDemoMode, isSupabaseConfigured } from '@/lib/supabase/config'

export default function LoginPage() {
  const router = useRouter()
  const demo = isDemoMode()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!demo && !isSupabaseConfigured()) return <main className="login"><section><p className="eyebrow">MERCADO CENTRAL</p><h1>Tu operación, en orden.</h1><p>La aplicación está desplegada, pero requiere una configuración de Supabase para operar.</p></section><section className="card login-card"><h2>Entorno de demostración no configurado</h2><p>Configura Supabase en las variables de entorno del proyecto para habilitar el inicio de sesión y los módulos del ERP.</p></section></main>

  function fillDemo(role: 'admin' | 'cashier') {
    if (role === 'admin') {
      setEmail('admin@supermercado.demo')
      setPassword('AdminDemo2026!')
      return
    }
    setEmail('cajero@supermercado.demo')
    setPassword('CajeroDemo2026!')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (demo) {
      const user = authenticateDemo(email, password)
      if (!user) {
        setError('Correo o contraseña demo incorrectos.')
        setLoading(false)
        return
      }
      saveDemoSession(user)
      router.replace(user.role === 'admin' ? '/dashboard' : '/pos')
      router.refresh()
      return
    }
    const db = createClient()
    const { data, error: authError } = await db.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError(authError?.message ?? 'No fue posible iniciar sesión')
      setLoading(false)
      return
    }
    const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).single()
    router.replace(profile?.role === 'admin' ? '/dashboard' : '/pos')
    router.refresh()
  }

  return <main className="login"><section><p className="eyebrow">MERCADO CENTRAL</p><h1>Tu operación, en orden.</h1><p>{demo ? 'Evalúa el ERP sin servicios externos. Los datos del modo demo se guardan en este navegador.' : 'Accede al punto de venta y controla cada movimiento del negocio.'}</p></section><form onSubmit={submit} className="card login-card"><h2>Iniciar sesión</h2>{demo && <><p className="demo-label">MODO DEMO</p><section className="demo-access" aria-label="Acceso de demostración"><h3>Accesos para evaluación</h3><p className="muted">Credenciales exclusivas del entorno de evaluación.</p><div className="demo-actions"><button type="button" aria-label="Usar administrador demo" className="secondary" onClick={() => fillDemo('admin')}><span>Administrador demo</span><small>Control completo del ERP</small></button><button type="button" aria-label="Usar cajero demo" className="secondary" onClick={() => fillDemo('cashier')}><span>Cajero demo</span><small>Punto de venta e inventario</small></button></div></section></>}<label>Correo<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@supermercado.com" /></label><label>Contraseña<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error">{error}</p>}<button disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}</button></form></main>
}
