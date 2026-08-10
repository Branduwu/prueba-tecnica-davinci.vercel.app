import { createHmac, timingSafeEqual } from 'crypto'
import { answerBusinessQuestion } from '@/lib/ai/tools'
import { TwilioProvider } from '@/lib/whatsapp/provider'

function validTwilioRequest(request:Request, form:FormData){
  const token=process.env.TWILIO_AUTH_TOKEN
  const signature=request.headers.get('x-twilio-signature')
  if(!token||!signature)return false
  const url=new URL(request.url)
  const externalUrl=`${url.protocol}//${request.headers.get('host')}${url.pathname}${url.search}`
  const values=[...form.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}${value}`).join('')
  const expected=createHmac('sha1',token).update(externalUrl+values).digest('base64')
  return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))
}
export async function POST(request:Request){const form=await request.formData();if(!validTwilioRequest(request,form))return new Response('No autorizado',{status:401});const text=String(form.get('Body')??'');const from=String(form.get('From')??'');if(!text||!from)return new Response('Solicitud inválida',{status:400});try{const answer=await answerBusinessQuestion(text);await new TwilioProvider().send(from,answer);return new Response('<Response/>',{headers:{'Content-Type':'text/xml'}})}catch{return new Response('Error interno',{status:500})}}
