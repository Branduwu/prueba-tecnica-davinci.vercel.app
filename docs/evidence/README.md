# Evidencia E2E local

Esta evidencia se genera automáticamente contra el entorno local reproducible del proyecto. No utiliza Supabase Cloud, Vercel, Twilio Sandbox ni una API externa de IA.

## Ejecución

1. Instala Docker Desktop y asegúrate de que esté en ejecución.
2. Instala Chromium una vez: `npx playwright install chromium`.
3. Ejecuta `npm run e2e:setup`. Inicia Supabase Local, reinicia la base de datos, aplica las migraciones y crea usuarios de demostración locales en un archivo ignorado por Git.
4. Ejecuta `npm run e2e:demo`. Levanta Next.js, ejecuta Playwright y recopila video, subtítulos y capturas.
5. Opcionalmente, ejecuta `npm run e2e:teardown` para detener sólo el stack local de Supabase de este proyecto.

Las contraseñas, claves y configuración local se generan en `.env.e2e.local`, que está ignorado por Git. Nunca se deben reutilizar en producción.

## Resultado de la última ejecución

| Escenario | Resultado | Evidencia |
|---|---|---|
| Login y dashboard de administrador | Passed | `screenshots/01-login.png`, `02-dashboard.png` |
| Catálogo CSV, ajuste y movimientos | Passed | `03-inventory.png`, `04-adjustment-movements.png` |
| POS por peso, cobro y ticket | Passed | `05-pos-weighted-cart.png`, `06-ticket.png` |
| Descuento de stock y movimiento de venta | Passed | `07-stock-and-sale-movement.png` |
| Finanzas y gasto | Passed | `08-finance.png` |
| Restricciones del cajero | Passed | `09-cashier-permissions.png` |
| Agente con herramientas de negocio | Passed | `10-agent.png` |
| Webhook de WhatsApp firmado | Passed (modo local) | `11-whatsapp-e2e.png` |

El recorrido completo queda en `videos/erp-e2e-demo.webm` y sus subtítulos en `videos/erp-e2e-demo.srt`.

## Servicios ejecutados realmente en local

- Next.js.
- PostgreSQL y Supabase Local.
- Supabase Auth, RLS, políticas y RPCs.
- Importación CSV, inventario, ventas, movimientos y finanzas.

## Servicios simulados explícitamente para E2E

- Proveedor de interpretación del agente IA: el agente usa herramientas controladas y consultas reales a PostgreSQL Local; no se invoca un modelo externo.
- Adaptador Twilio/WhatsApp: el webhook HTTP usa una firma HMAC válida con un token local generado y devuelve TWiML local; no se conecta a Twilio.

Por tanto, esta evidencia no afirma validación de Supabase Cloud, Vercel, Twilio Sandbox real ni un proveedor externo de IA.
