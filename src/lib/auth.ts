import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export async function requireAdmin(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const {data}=await db.from('profiles').select('role').eq('id',user.id).single();if(data?.role!=='admin')redirect('/pos');return db}
