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
if (!video) throw new Error('La prueba demo termin\u00f3 sin generar video de evidencia.')

await mkdir('docs/evidence/videos', { recursive: true })
await copyFile(video, 'docs/evidence/videos/erp-demo-mode-e2e.webm')

const captions = [
  ['00:00:00,000', '00:00:05,000', 'Entorno Demo: ERP autocontenido, sin servicios externos'],
  ['00:00:05,000', '00:00:15,000', 'Administrador Demo: dashboard e inventario con cat\u00e1logo oficial'],
  ['00:00:15,000', '00:00:29,000', 'POS Demo: venta por peso, cobro, cambio y ticket'],
  ['00:00:29,000', '00:00:39,000', 'Inventario y finanzas: estado local persistente y m\u00e9tricas calculadas'],
  ['00:00:39,000', '00:00:48,000', 'Agente de negocio \u2014 modo demo: respuestas desde los datos del ERP'],
  ['00:00:48,000', '00:00:55,000', 'WhatsApp \u2014 simulaci\u00f3n de integraci\u00f3n, sin Twilio externo'],
  ['00:00:55,000', '00:01:06,000', 'Cajero Demo: POS e inventario de consulta, sin permisos administrativos'],
]
const srt = captions.map(([from, to, text], index) => `${index + 1}\n${from} --> ${to}\n${text}\n`).join('\n')
await writeFile('docs/evidence/videos/erp-demo-mode-e2e.srt', srt)
