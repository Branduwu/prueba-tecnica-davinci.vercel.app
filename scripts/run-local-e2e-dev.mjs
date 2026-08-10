import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { config as loadEnvironment } from 'dotenv'

if (!existsSync('.env.e2e.local')) {
  throw new Error('Falta .env.e2e.local. Ejecuta primero: npm run e2e:setup')
}

loadEnvironment({ path: '.env.e2e.local', override: true, quiet: true })
process.env.E2E_LOCAL_MODE = 'true'
const target = new URL(process.env.E2E_BASE_URL)

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', target.port || '3000', '-H', target.hostname], {
  env: process.env,
  stdio: 'inherit',
})

server.once('exit', (code) => process.exit(code ?? 1))
