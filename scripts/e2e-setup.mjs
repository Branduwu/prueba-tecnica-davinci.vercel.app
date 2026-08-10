import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const cliBase = ['--yes', 'supabase@latest']

function supabase(args) {
  const command = [...cliBase, ...args]
  if (process.platform === 'win32') {
    return execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', ['npx.cmd', ...command].join(' ')], { cwd: process.cwd(), encoding: 'utf8' })
  }
  return execFileSync('npx', command, { cwd: process.cwd(), encoding: 'utf8' })
}

function parseStatus(output) {
  const json = output.match(/\{[\s\S]*\}/)?.[0]
  if (json) return JSON.parse(json)
  return Object.fromEntries(output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)=(?:"([\s\S]*)"|(.*))$/)
    return match ? [[match[1], match[2] ?? match[3]]] : []
  }))
}

function localPassword() {
  return `E2e-${randomBytes(18).toString('base64url')}`
}

async function createDemoUser(client, email, password, fullName, role) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !data.user) throw error ?? new Error(`No se pudo crear ${email}`)
  const { error: profileError } = await client.from('profiles').update({ full_name: fullName, role }).eq('id', data.user.id)
  if (profileError) throw profileError
}

supabase(['start'])
supabase(['db', 'reset', '--local', '--no-seed'])
const status = parseStatus(supabase(['status', '-o', 'env']))
const adminPassword = localPassword()
const cashierPassword = localPassword()
const twilioToken = randomBytes(24).toString('base64url')
const env = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  E2E_BASE_URL: 'http://127.0.0.1:3000',
  E2E_LOCAL_MODE: 'true',
  E2E_SUPABASE_URL: status.API_URL,
  E2E_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  E2E_ADMIN_EMAIL: 'admin@supermercado.demo',
  E2E_ADMIN_PASSWORD: adminPassword,
  E2E_CASHIER_EMAIL: 'cajero@supermercado.demo',
  E2E_CASHIER_PASSWORD: cashierPassword,
  E2E_EXTERNAL_PROVIDERS: 'true',
  TWILIO_AUTH_TOKEN: twilioToken,
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase Local no devolvió las credenciales necesarias.')
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
await createDemoUser(admin, env.E2E_ADMIN_EMAIL, adminPassword, 'Administrador Demo', 'admin')
await createDemoUser(admin, env.E2E_CASHIER_EMAIL, cashierPassword, 'Cajero Demo', 'cashier')
await writeFile('.env.e2e.local', `${Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n')}\n`, { mode: 0o600 })
console.log('Supabase Local reiniciado, migraciones aplicadas y usuarios demo creados. Configuración local escrita en .env.e2e.local.')
