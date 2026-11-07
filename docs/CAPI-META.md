# CAPI de Meta · la escalera de eventos

## Idea
No se cambia el objetivo de optimización de las campañas. Se **alimenta a Meta con las conversiones reales de abajo del embudo** para que aprenda qué perfil califica, agenda y paga. Sin esto Meta solo ve «leads» y optimiza a leads baratos.

## Escalera (un evento por escalón)
| Escalón en el CRM | Evento a Meta | Cuándo se dispara |
|---|---|---|
| Lead calificado | `CompleteRegistration` | etiqueta «calificada» o etapa «Calificado · no agendó» |
| Llamada agendada | `Schedule` | etiqueta «llamada agendada» o etapa «Agendó cita» |
| Venta | `Purchase` con `value` y moneda | etapas de acceso al plan / «Negocio cerrado» |

Cada escalón es **un workflow del CRM** con la acción «Webhook (POST)» hacia `/api/capi/cliente` (ruta del ejemplo; la ruta genérica `/api/capi/<slug>` espera otro cuerpo: `{event_name, event_id, user_data}`) con el encabezado `Authorization: Bearer <CAPI_WEBHOOK_SECRET>` y un JSON `{event, contactId, phone, email, value?}`. Ver `codigo/src/app/api/capi/cliente/route.ts` (el comentario del encabezado trae el cableado exacto).

## Reglas que hacen que funcione
1. **`event_id` estable** por persona y etapa (`<cliente>-<evento>-<contactId>`): si el workflow dispara dos veces, Meta cuenta una.
2. **Datos de la persona hasheados** (SHA-256, minúsculas, teléfono solo dígitos): `codigo/src/lib/capi/hash-user-data.ts`. El `ctwa_clid`, `fbc` y `fbp` van sin hashear.
3. **Atribución al anuncio exacto.** Con email o teléfono Meta sabe QUIÉN es; con un click-id sabe DE QUÉ ANUNCIO vino. Hay un click-id por tipo de entrada: `fbclid` (web), ID de lead (formulario de Meta), `ctwa_clid` (Click-to-WhatsApp).
4. **Click-to-WhatsApp.** El `ctwa_clid` viene solo en el `referral` del primer mensaje. Si se captura, el evento va con `action_source: business_messaging` + `messaging_channel: whatsapp` + `page_id` dentro de `user_data`; Meta además exige nombres de evento propios de mensajería (`CompleteRegistration → QualifiedLead`, `AddPaymentInfo → InitiateCheckout`; `meta-capi.ts` los remapea). Si no hay `ctwa_clid`, el evento sale `system_generated` (igual lleva valor y moneda, solo pierde el anuncio exacto).
5. **Limitación conocida:** HighLevel (el CRM que usamos) elimina el `ctwa_clid` en el webhook, en el contacto y en su API. Solo se conserva si el número de WhatsApp entra por un proveedor que lo deje pasar. Tabla donde se guarda al capturarlo: `ctwa_attribution` (`supabase/migrations/037_ctwa_attribution.sql`).
6. **Todo hecho a mano no existe para Meta.** Una venta o cita que no pasa por una etiqueta o cambio de etapa del CRM no dispara el workflow. Toda conversión que quieras atribuir debe pasar por el CRM.
7. **Apagado por defecto y con bitácora.** `CLIENTE_CAPI_LIVE=true` prende el envío; `capi_send_log` (migración 040) guarda cada envío con su estado; si el interruptor está prendido pero falta el token, se avisa (no se calla). Verifica primero en «Probar eventos» con el código que lee `clients-config.ts` (`EJEMPLO_CAPI_TEST_CODE` en la plantilla).
8. **Un solo dueño por evento.** Si el CRM (acción nativa de Meta) y tu código mandan el mismo evento, se duplica. Elige uno.

## Cómo verificar (en este orden)
1. `GET /api/capi/<slug>` (ruta genérica `[client]`) responde `ready: true` cuando el token y el secreto están configurados. `GET /api/capi/cliente` responde `live` y `secret_configured`.
2. Enviar un evento de prueba con el código de «Probar eventos» y ver `events_received: 1`.
3. Mover un contacto de prueba por las etapas y revisar que `capi_send_log` registre cada envío.
4. Solo entonces apagar el código de prueba y activar `…_CAPI_LIVE`.
