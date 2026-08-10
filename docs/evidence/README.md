# Evidencia E2E

La demostración visual se genera con Playwright en Chromium, video habilitado, screenshots en error y trace en error.

## Ejecución

1. Configura localmente `E2E_BASE_URL`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_CASHIER_EMAIL` y `E2E_CASHIER_PASSWORD`.
2. Instala Chromium: `npx playwright install chromium`.
3. Ejecuta `npm run test:e2e:demo`. Al pasar, recopila el video en `videos/erp-e2e-demo.webm` y crea `videos/erp-e2e-demo.srt`.
4. Consulta el reporte con `npm run test:e2e:report`.

## Resultado de la última ejecución

Pendiente de ejecución con Supabase real y usuarios demo. No se incluyen videos, screenshots ni subtítulos falsos.

| Escenario | Resultado | Evidencia |
|---|---|---|
| Login admin | Pendiente | Video + `01-login.png` |
| POS por peso | Pendiente | Video + `04-pos-cart.png` |
| Ticket y stock | Pendiente | Video + `05-ticket.png` + `06-inventory-movement.png` |
| Finanzas | Pendiente | Video + `07-finance.png` |
| Roles cajero | Pendiente | Video + `08-cashier-permissions.png` |
| Agente IA | Pendiente | Video + `09-ai.png` |
| WhatsApp | Requiere Sandbox externo | Validación manual de Twilio |
