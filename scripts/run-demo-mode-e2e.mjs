import { spawn } from 'node:child_process'

const localURL = 'http://127.0.0.1:3101'
const configuredURL = process.env.E2E_BASE_URL
const isExternalURL = configuredURL && !/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configuredURL)
const baseURL = isExternalURL ? configuredURL : localURL
let server

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', env })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function waitForServer() {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/login`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error('El servidor local del modo demo no estuvo disponible a tiempo.')
}

try {
  if (!isExternalURL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', '3101', '-H', '127.0.0.1'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_PUBLIC_DEMO_MODE: 'true',
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
    })
    await waitForServer()
  }

  const testCode = await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/demo-mode.spec.ts', '--project=chromium'], {
    ...process.env,
    E2E_MODE: 'demo',
    E2E_BASE_URL: baseURL,
    E2E_DEMO_SERVER_MANAGED: 'true',
  })
  if (testCode !== 0) process.exitCode = testCode
} finally {
  if (server && !server.killed) {
    server.kill()
    await new Promise((resolve) => server.once('close', resolve))
  }
}

if (process.exitCode) process.exit(process.exitCode)
const collectCode = await run(process.execPath, ['scripts/collect-demo-mode-evidence.mjs'], process.env)
process.exit(collectCode)
