import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function findVideo(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      const video = await findVideo(path)
      if (video) return video
    }
    if (entry.isFile() && entry.name === 'video.webm') return path
  }
  return undefined
}

const video = await findVideo('test-results')
if (!video) {
  console.log('E2E omitido o sin video: no se generó evidencia para recopilar.')
  process.exit(0)
}

await mkdir('docs/evidence/videos', { recursive: true })
await copyFile(video, 'docs/evidence/videos/erp-e2e-demo.webm')

const captions = [
  ['00:00:00,000', '00:00:04,000', 'ERP SUPERMERCADO — validación E2E en entorno local'],
  ['00:00:04,000', '00:00:10,000', 'Next.js + Supabase Local + PostgreSQL: autenticación de administrador'],
  ['00:00:10,000', '00:00:19,000', 'Dashboard e inventario: catálogo real de 100 productos y ajuste transaccional'],
  ['00:00:19,000', '00:00:30,000', 'POS: venta por peso, cobro, cambio y ticket'],
  ['00:00:30,000', '00:00:37,000', 'PostgreSQL: venta, descuento de stock e inventory movements'],
  ['00:00:37,000', '00:00:44,000', 'Finanzas: ingresos, gasto, flujo neto y productos más vendidos'],
  ['00:00:44,000', '00:00:48,000', 'Roles y RLS: cajero sin acceso a Finanzas ni ajustes'],
  ['00:00:48,000', '00:00:52,000', 'Agente IA: proveedor local E2E con herramientas y datos reales'],
  ['00:00:52,000', '00:00:54,000', 'WhatsApp: webhook firmado y proveedor externo simulado en E2E local'],
  ['00:00:54,000', '00:00:55,500', 'Validación E2E completada: Supabase Local real; IA y Twilio simulados'],
]

const srt = captions.map(([from, to, text], index) => `${index + 1}\n${from} --> ${to}\n${text}\n`).join('\n')
await writeFile('docs/evidence/videos/erp-e2e-demo.srt', srt)
