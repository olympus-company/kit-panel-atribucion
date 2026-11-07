// Bitácora de envíos CAPI → Meta. La llaman los helpers por-cliente (uno por cliente) justo después de
// sendCapiEvents(), para que en una página interna se vea cada conversión que sale a Meta: con qué atribución
// (business_messaging vs system_generated), a qué anuncio (source_id/ctwa_clid), status, y si fue Test Events
// (test_mode = llevó test_event_code → no cuenta) o LIVE. Best-effort: NUNCA rompe el envío del evento.
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

// MONITOREO DURABLE: la causa de un incidente fue que un cliente con *_CAPI_LIVE=true pero SIN token
// (vacío/mal-permisado) hacía `return` en silencio → Meta no recibía conversiones y nadie se enteraba. Esto
// convierte ese return mudo en una ALERTA a Telegram (rate-limited a 1/hora por cliente para no spamear).
const lastCapiWarn = new Map<string, number>()
export async function warnCapiMisconfig(slug: string, reason: string): Promise<void> {
  try {
    const now = Date.now()
    if (now - (lastCapiWarn.get(slug) ?? 0) < 3_600_000) return // máx 1 aviso/hora por cliente
    lastCapiWarn.set(slug, now)
    await sendTelegramMessage(
      process.env.CAPI_PING_CHAT_ID ?? '',
      `⚠️ *CAPI mal configurado* · ${slug}\nEl gate está LIVE pero ${reason}. Meta NO está recibiendo las conversiones de este cliente — revisar el token en Vercel.`,
      { parseMode: 'Markdown' },
    ).catch(() => {})
  } catch {
    /* best-effort: el monitor nunca rompe el flujo */
  }
}

export async function logCapiSend(row: {
  slug: string
  location_id?: string | null
  event_name: string
  event_id: string
  source_id?: string | null
  ctwa_clid?: string | null
  action_source: string
  test_mode: boolean
  status: number
  ok: boolean
  events_received: number
  value?: number | null
}): Promise<void> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await sb.from('capi_send_log').insert({
      slug: row.slug,
      location_id: row.location_id ?? null,
      event_name: row.event_name,
      event_id: row.event_id,
      source_id: row.source_id ?? null,
      ctwa_clid: row.ctwa_clid ?? null,
      action_source: row.action_source,
      test_mode: row.test_mode,
      status: row.status,
      ok: row.ok,
      events_received: row.events_received,
      value: row.value ?? null,
    })
  } catch {
    /* best-effort: el log NUNCA rompe el envío CAPI */
  }
}
