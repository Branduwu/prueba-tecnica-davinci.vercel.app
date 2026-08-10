import { createHmac, timingSafeEqual } from 'crypto'
import { answerBusinessQuestion } from '@/lib/ai/tools'
import { TwilioProvider } from '@/lib/whatsapp/provider'

function validTwilioRequest(request: Request, form: FormData) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get('x-twilio-signature')
  if (!token || !signature) return false
  const values = [...form.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}${value}`).join('')
  const expected = createHmac('sha1', token).update(request.url + values).digest('base64')
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

function e2eExternalProvidersEnabled() {
  return process.env.E2E_EXTERNAL_PROVIDERS === 'true' && process.env.NODE_ENV !== 'production'
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!)
}

export async function POST(request: Request) {
  const form = await request.formData()
  if (!validTwilioRequest(request, form)) {
    const response = new Response('No autorizado', { status: 401 })
    if (e2eExternalProvidersEnabled()) response.headers.set('x-e2e-signature-url', request.url)
    return response
  }
  const text = String(form.get('Body') ?? '')
  const from = String(form.get('From') ?? '')
  if (!text || !from) return new Response('Solicitud inválida', { status: 400 })
  try {
    const answer = await answerBusinessQuestion(text)
    if (e2eExternalProvidersEnabled()) {
      return new Response(`<Response><Message>${escapeXml(answer)}</Message></Response>`, { headers: { 'Content-Type': 'text/xml' } })
    }
    await new TwilioProvider().send(from, answer)
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
  } catch {
    return new Response('Error interno', { status: 500 })
  }
}
