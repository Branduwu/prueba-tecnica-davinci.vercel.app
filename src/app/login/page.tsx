'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/config'
export default function LoginPage() {
  const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  if (!isSupabaseConfigured()) return <main className="login"><section><p className="eyebrow">MERCADO CENTRAL</p><h1>Tu operación, en orden.</h1><p>La aplicación está desplegada, pero requiere una configuración de Supabase para operar.</p></section><section className="card login-card"><h2>Entorno de demostración no configurado</h2><p>Configura Supabase en las variables de entorno del proyecto para habilitar el inicio de sesión y los módulos del ERP.</p></section></main>
  async function submit(e:React.FormEvent) { e.preventDefault(); setLoading(true); setError(''); const db=createClient(); const {data,error}=await db.auth.signInWithPassword({email,password}); if(error||!data.user){setError(error?.message??'No fue posible iniciar sesión');setLoading(false);return}; const {data:profile}=await db.from('profiles').select('role').eq('id',data.user.id).single(); router.replace(profile?.role==='admin'?'/dashboard':'/pos'); router.refresh() }
  return <main className="login"><section><p className="eyebrow">MERCADO CENTRAL</p><h1>Tu operación, en orden.</h1><p>Accede al punto de venta y controla cada movimiento del negocio.</p></section><form onSubmit={submit} className="card login-card"><h2>Iniciar sesión</h2><label>Correo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nombre@supermercado.com" /></label><label>Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>{error&&<p className="error">{error}</p>}<button disabled={loading}>{loading?'Ingresando…':'Entrar al sistema'}</button></form></main>
}
