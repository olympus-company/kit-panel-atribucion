// Señal de conversión de Cliente Ejemplo (el cliente) hacia Meta (Conversions API).
// Misma escalera de eventos y misma infra CAPI (clients-config + hash-user-data + meta-capi).
//
// ESTRATEGIA (escalera de eventos): NO cambiamos el objetivo de optimización de las campañas. ALIMENTAMOS a Meta
// con las conversiones reales de abajo del embudo (lead CALIFICADO → agenda → Purchase con valor) para que el
// algoritmo aprenda qué perfil sí califica/agenda/paga. Si Meta ve 0 ventas marcadas "ganado" →
// optimiza a leads baratos. Esto cierra el circuito de datos. El envío se dispara desde workflows del CRM
// (webhook → /api/capi/cliente). Gated por CLIENTE_CAPI_LIVE para verificar en Test Events antes de prender.
import { createClient } from '@supabase/supabase-js'
import { getClientConfig } from '@/lib/capi/clients-config'
import { hashUserData } from '@/lib/capi/hash-user-data'
import { sendCapiEvents, type CapiEventInput } from '@/lib/capi/meta-capi'
import { logCapiSend, warnCapiMisconfig } from '@/lib/capi/capi-log'
import { sendTelegramMessage } from '@/lib/telegram'

const CLIENTE_CAPI_SLUG = 'ejemplo' // clave en clients-config.ts
const CLIENTE_LOCATION = process.env.CLIENTE_GHL_LOCATION_ID ?? 'VALOR_LOCATION_ID_DEL_CRM'

// Busca el ctwa_clid capturado para este teléfono en ctwa_attribution (lo escribe el poll del bot al parsear el
// 1er mensaje). Si existe → business_messaging (atribución al anuncio EXACTO). Sin él → null → system_generated
// (value+currency igual llegan; solo pierde la atribución al ad exacto). El bot del dueño aún no está vivo,
// así que hoy todo cae a system_generated; queda listo para cuando arranque.
async function lookupCtwaAttr(phone?: string | null): Promise<{ ctwaClid: string | null; sourceId: string | null }> {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return { ctwaClid: null, sourceId: null }
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await sb
      .from('ctwa_attribution')
      .select('ctwa_clid, source_id')
      .eq('location_id', CLIENTE_LOCATION)
      .like('phone', `%${digits}`)
      .not('ctwa_clid', 'is', null)
      .limit(1)
    const row = data?.[0] as { ctwa_clid?: string; source_id?: string } | undefined
    return { ctwaClid: row?.ctwa_clid || null, sourceId: row?.source_id || null }
  } catch {
    return { ctwaClid: null, sourceId: null }
  }
}

export async function sendClienteCapiEvent(input: {
  eventName: CapiEventInput['event_name']
  eventId: string // estable por transacción → Meta deduplica
  email?: string | null
  phone?: string | null
  value?: number
  contentName?: string
}): Promise<void> {
  if (process.env.CLIENTE_CAPI_LIVE !== 'true') return
  const cfg = getClientConfig(CLIENTE_CAPI_SLUG)
  if (!cfg) return
  const token = process.env[cfg.capi_token_env]
  if (!token) {
    await warnCapiMisconfig(CLIENTE_CAPI_SLUG, `falta el token (${cfg.capi_token_env})`)
    return
  }
  if (!input.email && !input.phone) return // sin email ni teléfono no hay match posible

  const { ctwaClid, sourceId } = await lookupCtwaAttr(input.phone)

  const event: CapiEventInput = {
    event_name: input.eventName,
    event_id: input.eventId,
    action_source: ctwaClid ? 'business_messaging' : 'system_generated',
    ...(ctwaClid ? { messaging_channel: 'whatsapp' as const } : {}),
    user_data: hashUserData({ email: input.email, phone: input.phone, country: cfg.default_country, ctwa_clid: ctwaClid }),
    custom_data: {
      currency: cfg.default_currency,
      ...(input.value != null ? { value: input.value } : {}),
      ...(input.contentName ? { content_name: input.contentName } : {}),
    },
  }
  const testCode = process.env[cfg.test_event_code_env] || null
  try {
    const res = await sendCapiEvents({ pixel_id: cfg.pixel_id, capi_token: token, events: [event], test_event_code: testCode, page_id: cfg.page_id })
    await logCapiSend({
      slug: CLIENTE_CAPI_SLUG,
      location_id: CLIENTE_LOCATION,
      event_name: input.eventName,
      event_id: input.eventId,
      source_id: sourceId,
      ctwa_clid: ctwaClid,
      action_source: event.action_source ?? 'system_generated',
      test_mode: !!testCode,
      status: res.status,
      ok: res.ok,
      events_received: res.ok && 'events_received' in res.response ? res.response.events_received : 0,
      value: input.value ?? null,
    })
    if (process.env.CLIENTE_CAPI_PING !== 'off') {
      const recibidos = res.ok && 'events_received' in res.response ? res.response.events_received : 0
      const detalle = [input.contentName, input.value != null ? `$${input.value}` : null].filter(Boolean).join(' · ')
      const icon = res.ok ? '📡' : '⚠️'
      const attr = ctwaClid ? 'business_messaging 🎯' : 'system_generated'
      await sendTelegramMessage(
        process.env.CAPI_PING_CHAT_ID ?? '',
        `${icon} *CAPI Cliente → Meta* · ${input.eventName}${detalle ? ` (${detalle})` : ''}\nattr: ${attr} · recibidos: ${recibidos} · status ${res.status}`,
        { parseMode: 'Markdown' },
      ).catch(() => {})
    }
  } catch {
    /* best-effort: la señal CAPI NUNCA rompe el flujo del CRM */
  }
}

// Lead CALIFICADO (tag `calificada` / etapa "Calificado · no agendó"): perfil afín confirmado por el closer.
// Escalón del medio de la escalera. event_id estable por contacto → Meta lo cuenta una vez.
export async function sendClienteLead(p: { contactId: string; phone?: string | null; email?: string | null }): Promise<void> {
  await sendClienteCapiEvent({ eventName: 'CompleteRegistration', eventId: `cliente-lead-${p.contactId}`, phone: p.phone, email: p.email })
}

// Agenda (tag `llamada agendada` / etapa "Agendó cita"): reservó la llamada de diagnóstico.
export async function sendClienteSchedule(p: { contactId: string; phone?: string | null; email?: string | null }): Promise<void> {
  await sendClienteCapiEvent({ eventName: 'Schedule', eventId: `cliente-schedule-${p.contactId}`, phone: p.phone, email: p.email })
}

// Venta (etapa "Acceso PLAN X" / "Negocio cerrado"): pagó el plan. value en CLP (convención 1 USD = 1.000 CLP).
// Es la conversión que Meta debe optimizar. event_id estable por contacto → Meta lo cuenta una vez.
export async function sendClientePurchase(p: {
  contactId: string
  phone?: string | null
  email?: string | null
  amount?: number // CLP
}): Promise<void> {
  await sendClienteCapiEvent({
    eventName: 'Purchase',
    eventId: `cliente-purchase-${p.contactId}`,
    phone: p.phone,
    email: p.email,
    value: p.amount,
    contentName: 'Plan Cliente Ejemplo',
  })
}
