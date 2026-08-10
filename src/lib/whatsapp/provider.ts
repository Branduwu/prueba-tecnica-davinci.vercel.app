import 'server-only'

export interface WhatsAppProvider { send(to:string, body:string):Promise<void> }
export class TwilioProvider implements WhatsAppProvider { async send(to:string,body:string){const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,from=process.env.TWILIO_WHATSAPP_FROM;if(!sid||!token||!from)throw new Error('Falta configuración de Twilio en el servidor');const payload=new URLSearchParams({To:to,From:from,Body:body});const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:payload});if(!res.ok)throw new Error('Twilio no pudo enviar el mensaje')} }
