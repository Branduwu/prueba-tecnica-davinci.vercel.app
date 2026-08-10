import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Shell from '@/components/shell'
export default async function PortalLayout({children}:{children:React.ReactNode}) { const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) redirect('/login'); const {data:profile}=await db.from('profiles').select('full_name,role').eq('id',user.id).single(); if(!profile) redirect('/login'); return <Shell profile={profile}>{children}</Shell> }
