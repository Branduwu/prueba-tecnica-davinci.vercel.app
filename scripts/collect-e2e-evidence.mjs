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
  ['00:00:00,000', '00:00:03,000', 'ERP SUPERMERCADO — Validación automatizada End-to-End'],
  ['00:00:03,000', '00:00:10,000', 'Autenticación y dashboard de administrador'],
  ['00:00:10,000', '00:00:22,000', 'Inventario: búsqueda, edición y ajuste controlado'],
  ['00:00:22,000', '00:00:38,000', 'POS: venta por peso, cobro y ticket'],
  ['00:00:38,000', '00:00:50,000', 'Inventario: movimiento y descuento automático'],
  ['00:00:50,000', '00:01:04,000', 'Finanzas: indicadores, gasto y top productos'],
  ['00:01:04,000', '00:01:16,000', 'Roles: restricciones de cajero'],
  ['00:01:16,000', '00:01:28,000', 'Agente IA: consulta con datos reales'],
  ['00:01:28,000', '00:01:32,000', 'Validación E2E completada — WhatsApp requiere Sandbox externo'],
]
const srt = captions.map(([from, to, text], index) => `${index + 1}\n${from} --> ${to}\n${text}\n`).join('\n')
await writeFile('docs/evidence/videos/erp-e2e-demo.srt', srt)
