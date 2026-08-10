import { execFileSync } from 'node:child_process'

const command = ['--yes', 'supabase@latest', 'stop']
if (process.platform === 'win32') {
  execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', ['npx.cmd', ...command].join(' ')], { cwd: process.cwd(), stdio: 'inherit' })
} else {
  execFileSync('npx', command, { cwd: process.cwd(), stdio: 'inherit' })
}
