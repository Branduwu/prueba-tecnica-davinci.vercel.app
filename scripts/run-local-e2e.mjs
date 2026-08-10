import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { config as loadEnvironment } from 'dotenv'

if (!existsSync('.env.e2e.local')) throw new Error('Falta .env.e2e.local. Ejecuta primero: npm run e2e:setup')
loadEnvironment({ path: '.env.e2e.local', override: true, quiet: true })
process.env.E2E_LOCAL_MODE = 'true'
const baseURL = process.env.E2E_BASE_URL
const target = new URL(baseURL)
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', target.port || '3000', '-H', target.hostname], { env: process.env, stdio: 'ignore' })

async function waitForServer() {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/login`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Next.js no inició en ${baseURL}`)
}

try {
  await waitForServer()
  const testEnvironment = { ...process.env, E2E_LOCAL_MODE: 'false' }
  const test = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/local-erp-demo.spec.ts', '--project=chromium'], { stdio: 'inherit', env: testEnvironment })
  if (test.status !== 0) process.exitCode = test.status ?? 1
  else {
    const evidence = spawnSync(process.execPath, ['scripts/collect-e2e-evidence.mjs'], { stdio: 'inherit', env: process.env })
    process.exitCode = evidence.status ?? 1
  }
} finally {
  server.kill('SIGTERM')
}
