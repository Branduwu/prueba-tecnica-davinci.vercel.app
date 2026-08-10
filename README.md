# ERP Supermercado

Aplicación full-stack para operar un supermercado de barrio: punto de venta, inventario, finanzas, control de roles y consultas de negocio por WhatsApp. Construida para una sucursal, dos cajas y un catálogo inicial de 100 productos.

## Demo

- App: **[PENDIENTE: URL pública de Vercel]**
- Video: **PENDIENTE**
- PDF ejecutivo: **PENDIENTE**

## Stack

- Next.js 16 con App Router y TypeScript
- Supabase: PostgreSQL, Auth y Row Level Security
- Tailwind CSS y componentes ligeros propios
- Twilio WhatsApp Sandbox
- Vercel y GitHub

## Funcionalidades

- Login por correo y contraseña con roles `admin` y `cashier`.
- POS con búsqueda por nombre/SKU, productos por peso, efectivo, cambio y ticket imprimible.
- Venta transaccional: crea venta, partidas, movimiento y descuento de stock de forma atómica.
- Inventario con edición de catálogo, ajustes, alertas de stock bajo e historial de movimientos.
- Importador robusto de CSV con Papa Parse y upsert por SKU.
- Finanzas: ventas por periodo, gastos, flujo neto y top productos.
- Agente de negocio con consultas controladas de Supabase, expuesto por API y WhatsApp.

## Arquitectura

```mermaid
flowchart TD
  U[Administrador o cajero] --> N[Next.js App Router]
  N --> A[Supabase Auth]
  N --> DB[(Supabase PostgreSQL)]
  W[WhatsApp] --> T[Twilio Sandbox]
  T --> H[/api/whatsapp]
  H --> Tools[Herramientas controladas]
  Tools --> DB
  DB --> Tools --> T
```

## Supabase

1. Crea un proyecto Supabase.
2. Copia Project URL y Publishable Key desde **Project Settings → API**.
3. Ejecuta las migraciones en orden desde SQL Editor.
4. Crea los usuarios demo en **Authentication → Users**.
5. Añade la URL de Vercel a las URL permitidas de Auth antes de desplegar.

## Esquema de datos

Las tablas principales son `profiles`, `products`, `sales`, `sale_items`, `inventory_movements` y `expenses`.

Los campos monetarios y de stock usan `numeric`; stock admite tres decimales y el cobro se redondea a dos decimales por línea. La RPC `complete_sale` bloquea el producto, valida stock y registra toda la venta en una única transacción.

## RLS

- Todos los datos de negocio tienen RLS activado.
- Cualquier usuario autenticado puede consultar productos y movimientos.
- Sólo administradores escriben productos, gastos y ajustes.
- Un cajero sólo consulta sus ventas; un administrador consulta todas.
- Las funciones SQL críticas validan autenticación y permisos.

## POS

Busca por nombre o SKU, agrega al carrito, acepta cantidades decimales sólo para `kg` y bloquea cantidades inválidas, fracciones de pieza y stock insuficiente. Ejemplo: `0.750 kg × $28.50` se cobra visualmente como `$21.38`.

## Inventarios

El administrador puede editar nombre, categoría, unidad, precio, umbral y estado de producto. Puede registrar entradas y salidas en un modal con motivo. La pestaña Movimientos muestra fecha, producto, tipo, cantidades, stock anterior/nuevo, motivo y usuario.

## Finanzas

Muestra ventas de hoy, semana y mes; ingresos, egresos y flujo neto mensual. Incluye registro/historial de gastos y top 5 productos para hoy, semana o mes.

## Roles

- **Administrador:** dashboard, POS, inventario, ajustes y finanzas.
- **Cajero:** POS y consulta de inventario.

El trigger `on_auth_user_created` crea automáticamente el perfil con rol `cashier`. Una venta siempre guarda `cashier_id`.

## Agente IA

`POST /api/ai` requiere Bearer JWT de administrador. Responde únicamente con datos recuperados de Supabase: ventas, stock, inventario bajo, producto más vendido, gastos y flujo de caja. No acepta SQL del usuario ni genera cifras cuando no hay datos: responde `No encontré datos para esa consulta.`

La clasificación actual es determinista para estas preguntas de negocio. `AI_PROVIDER_API_KEY` y `AI_PROVIDER_URL` están reservadas si se integra un proveedor LLM posteriormente; no se exponen al navegador.

## WhatsApp

`POST /api/whatsapp` recibe mensajes Twilio, valida `X-Twilio-Signature`, consulta el agente y responde al remitente. Configura el webhook POST en:

```text
https://TU_DOMINIO_DE_VERCEL/api/whatsapp
```

## Instalación local

```bash
npm install
copy .env.example .env.local
npm run dev
```

## Variables de entorno

Consulta `.env.example`. Las variables de Supabase necesarias son:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Para Twilio se requieren `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` y `TWILIO_WHATSAPP_TO`. Mantén todas las credenciales fuera de Git; `.env.local` está ignorado.

## Migraciones

Ejecuta en este orden:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_and_profile_fixes.sql`
3. `supabase/migrations/003_inventory_adjustment_validation.sql`

Después puedes ejecutar `supabase/seed.sql` para datos mínimos de desarrollo.

## Carga CSV

El catálogo completo está en `data/productos_supermercado.csv` y contiene 100 registros. En Inventario, como administrador, selecciona el archivo. El importador exige exactamente:

```text
sku,producto,categoria,unidad,precio,stock
```

Usa Papa Parse, valida datos, detecta SKU duplicados del archivo y hace upsert por SKU. Una segunda importación actualiza el catálogo sin crear duplicados.

## Deploy Vercel

1. Importa el repositorio GitHub en Vercel con preset **Next.js**.
2. Agrega las variables de `.env.example` en Production; no copies `.env.local`.
3. Despliega y usa el dominio resultante para Supabase Auth y el webhook Twilio.
4. Verifica `npm run lint` y `npm run build` antes de cada despliegue.

## Credenciales de demostración

Los correos demo previstos son:

```text
admin@supermercado.demo
cajero@supermercado.demo
```

Las contraseñas se deben crear exclusivamente en el proyecto Supabase demo. No se publican en este repositorio hasta que exista ese entorno aislado.

## Decisiones técnicas

- PostgreSQL concentra la transacción de venta para evitar inventario inconsistente.
- RLS protege el acceso por rol y el cliente no conoce la Service Role.
- Papa Parse evita el parseo manual incorrecto de CSV con valores entrecomillados.
- El agente sólo invoca consultas conocidas, no SQL arbitrario.
- La UI prioriza un flujo directo para cajero y no incorpora librerías de componentes pesadas.

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY`, Twilio Auth Token y claves IA son sólo de servidor.
- `.env.local`, `.next` y `node_modules` están ignorados por Git.
- `/api/ai` exige JWT de administrador.
- `/api/whatsapp` valida la firma de Twilio.

## Limitaciones

- La integración real de Supabase, Twilio y Vercel requiere configurar cuentas externas.
- No incluye facturación fiscal, impresora física dedicada ni corte de caja.
- El proveedor LLM externo está reservado; las preguntas de negocio actuales usan enrutamiento determinista y seguro.

## Mejoras futuras

- Corte y cierre de caja por turno.
- Compras, proveedores, mermas y caducidades.
- Promociones, descuentos y reportes gráficos.
- Integración LLM configurable para consultas de lenguaje más abierto.

## Prueba rápida

1. Inicia sesión como administrador e importa el CSV.
2. Vende `0.750 kg` de Tomate saladet y confirma ticket, stock y movimiento.
3. Registra un gasto y revisa flujo/top productos.
4. Inicia como cajero y confirma que `/finanzas` redirige a POS.
5. Configura Twilio y consulta ventas o stock por WhatsApp.
