# Evidencia E2E

## Recorrido visual del modo demo

Ejecuta `npm run test:e2e:demo` para validar el ERP autocontenido sin Supabase Cloud, Twilio ni un proveedor de IA externo. El comando inicia Next.js con `NEXT_PUBLIC_DEMO_MODE=true`, ejecuta el recorrido de administrador y cajero, comprueba la integridad visual en siete resoluciones y recopila:

- `videos/erp-demo-mode-e2e.webm`
- `videos/erp-demo-mode-e2e.srt`
- `screenshots/final/01-login.png` a `screenshots/final/12-cashier-restricted.png`
- `visual-audit.md`

La evidencia cubre login, roles, dashboard, catálogo de 100 productos, POS por peso, cambio, ticket, movimientos, finanzas, agente de negocio y la simulación de WhatsApp. No afirma integración con servicios externos.

## Requisitos locales

1. Instala dependencias con `npm install`.
2. Instala Chromium una vez con `npx playwright install chromium`.
3. Ejecuta `npm run test:e2e:demo`.

No se requieren secretos ni Docker para el recorrido demo. Los datos se conservan sólo durante la demostración en el navegador.

## Alcance de la evidencia

| Escenario | Resultado esperado | Evidencia |
|---|---|---|
| Administrador | Dashboard, POS, inventario y finanzas | `screenshots/final/02-dashboard.png` a `08-finance.png` |
| POS por peso | Tomate 0.750 kg, total $21.38 y cambio $28.62 | `screenshots/final/04-pos-weight.png` y `05-ticket.png` |
| Inventario | Stock descontado y movimiento de venta | `screenshots/final/06-inventory.png` y `07-movements.png` |
| Consultas | Asistente y simulación de WhatsApp | `screenshots/final/09-agent.png` y `10-whatsapp-demo.png` |
| Cajero | Inventario de consulta y restricción administrativa | `screenshots/final/11-cashier.png` y `12-cashier-restricted.png` |

La auditoría de overflow, controles y modales queda documentada en [visual-audit.md](visual-audit.md). Para una validación con Supabase Local, se mantienen disponibles los comandos `npm run e2e:setup`, `npm run e2e:demo` y `npm run e2e:teardown`.
