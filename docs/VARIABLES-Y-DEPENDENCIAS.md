# Variables de entorno, tablas y lo que no viene

## Variables de entorno (solo nombres; los valores nunca se comparten)
| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | base de datos (servidor) |
| `META_SYSTEM_USER_TOKEN` | token de usuario de sistema de Meta (lectura de insights y envío de CAPI al dataset) |
| `EJEMPLO_CAPI_TOKEN`, `EJEMPLO_CAPI_TEST_CODE` | token del dataset y código de «Probar eventos»; sus nombres salen de `clients-config.ts`, uno por cliente |
| `CAPI_WEBHOOK_SECRET` | secreto con el que el CRM llama a `/api/capi/*` |
| `CLIENTE_CAPI_LIVE` | `true` prende el envío real a Meta |
| `CLIENTE_CAPI_PING`, `CAPI_PING_CHAT_ID` | aviso por cada envío (`off` lo apaga) y su destino |
| `CLIENTE_META_AD_ACCOUNT_ID`, `CLIENTE_GHL_LOCATION_ID` | cuenta de Meta y ubicación del CRM |
| `CLIENTE_GHL_PIT`, `EJEMPLO_GHL_PIT` | clave privada del CRM (nombres que usan los `config.ts`) |
| `CLIENTE_PANEL_KEY` | llave del panel de ese cliente (va en `?k=`) |
| `FATHOM_WEBHOOK_SECRET`, `FATHOM_API_KEY` | firma del webhook y descarga de transcripción |
| `INTERNAL_JOB_SECRET` o `CRON_SECRET` | proteger la ruta interna `/api/fathom/process` |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL` | URL base de tu app |

## Tablas (migraciones incluidas en `codigo/supabase/migrations/`)
`ctwa_attribution` (037), `capi_send_log` (040), `client_closers` y `fathom_calls` (059; sin los closers reales).

## Tablas que el código usa y NO vienen
`clients` (con columna `fathom_config` jsonb y `slug`), `profiles` (rol de administrador) y `ghl_accounts` (clave y ubicación del CRM por cliente). Créalas a tu manera o reemplaza esas lecturas por variables de entorno.

## Módulos importados que NO vienen (reemplázalos por los tuyos)
- `@/lib/openrouter` y `@/lib/llm/modelos`: llamada al modelo de IA.
- `@/lib/telegram`: aviso por mensaje.
- `@/lib/ghl`: cliente de la API del CRM.
- `@/lib/supabase/server`, `@/lib/auth/sesion`, `@/lib/auth/safe-next`: sesión del equipo.
- `@/shared/components/estado-meta`: componente visual del estado del anuncio.

## Lo que el código supone y no trae
- La tabla `ctwa_attribution` la llena un receptor de mensajes de WhatsApp que captura el `ctwa_clid` del primer mensaje (`/api/whatsapp-webhook` en el original). No viene en el kit: sin él, los eventos salen sin el anuncio exacto.
- `OPENROUTER_API_KEY` (o la clave de tu proveedor de IA) para el asistente del panel y el puntaje de llamadas.

## Cómo se prueba
`codigo/src/features/agente-meta/graph.test.ts` corre con Vitest y datos falsos; no toca Meta. (El cruce con el CRM, `crm.ts`, recibe tu propio mapeo de etapas y no trae test.)
