import type { HashedUserData } from './hash-user-data'

const META_GRAPH_VERSION = 'v21.0'

// Allowlist de nombres de evento que Meta acepta para action_source=business_messaging (CTWA). Los eventos
// de nuestra escalera (CompleteRegistration/AddPaymentInfo) NO son válidos ahí (Meta responde 400 subcode
// 2804066 "evento no soportado") → se remapean al equivalente de mensajería.
// VERIFICADO contra Meta 06-jul (test business_messaging): los nombres válidos que Meta
// CUENTA y optimiza para campañas de WhatsApp son QualifiedLead / InitiateCheckout / Purchase. 'LeadSubmitted'
// (usado antes) también se aceptaba pero NO es el que Meta optimiza como lead calificado → se cambió a
// QualifiedLead. Todos exigen ctwa_clid real en user_data o Meta responde 2804071/2804087.
const BUSINESS_MSG_EVENT_MAP: Record<string, string> = {
  CompleteRegistration: 'QualifiedLead',
  AddPaymentInfo: 'InitiateCheckout',
  Lead: 'QualifiedLead',
  Purchase: 'Purchase',
}

export interface CapiEventInput {
  event_name: 'Schedule' | 'Lead' | 'CompleteRegistration' | 'Purchase' | 'AddPaymentInfo' | 'Contact' | 'SubmitApplication'
  event_time?: number
  event_id: string
  event_source_url?: string
  action_source?: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'business_messaging' | 'other'
  // Para CTWA (Click-to-WhatsApp): action_source='business_messaging' + messaging_channel='whatsapp' +
  // user_data.ctwa_clid → así Meta atribuye la conversión al anuncio. Sin esto, queda sin atribuir.
  messaging_channel?: 'whatsapp' | 'messenger' | 'instagram'
  user_data: HashedUserData
  custom_data?: {
    currency?: string
    value?: number
    content_name?: string
    content_category?: string
    content_ids?: string[]
    [key: string]: unknown
  }
}

export interface CapiSendParams {
  pixel_id: string
  capi_token: string
  events: CapiEventInput[]
  test_event_code?: string | null
  // page_id de la Página FB del cliente. Se inyecta en user_data SOLO para eventos business_messaging (CTWA),
  // donde Meta lo exige.
  page_id?: string
}

export interface CapiResponse {
  events_received: number
  messages: string[]
  fbtrace_id?: string
}

export async function sendCapiEvents(params: CapiSendParams): Promise<{
  ok: boolean
  status: number
  response: CapiResponse | { error: unknown }
}> {
  const { pixel_id, capi_token, events, test_event_code, page_id } = params

  const normalized = events.map((e) => {
    // Invariante CTWA: si el evento trae messaging_channel (Click-to-WhatsApp), el action_source CORRECTO es
    // business_messaging → así Meta atribuye la conversión al anuncio. Forzarlo aquí evita que un evento de
    // WhatsApp quede mal atribuido en silencio si un caller olvida setearlo. Resto: respeta el del caller o
    // cae al fallback system_generated.
    const action_source = e.messaging_channel ? 'business_messaging' : (e.action_source ?? 'system_generated')
    const isBizMsg = action_source === 'business_messaging'
    return {
      event_time: Math.floor(Date.now() / 1000),
      ...e,
      action_source,
      // business_messaging exige (o Meta responde 400): (1) un event_name de su allowlist —
      // CompleteRegistration/AddPaymentInfo se remapean; (2) el page_id DENTRO de user_data.
      event_name: isBizMsg ? (BUSINESS_MSG_EVENT_MAP[e.event_name] ?? e.event_name) : e.event_name,
      user_data: isBizMsg && page_id ? { ...e.user_data, page_id } : e.user_data,
    }
  })

  const body: Record<string, unknown> = { data: normalized }
  if (test_event_code) body.test_event_code = test_event_code

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixel_id}/events?access_token=${encodeURIComponent(capi_token)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as CapiResponse
    return { ok: res.ok, status: res.status, response: json }
  } catch (err) {
    return { ok: false, status: 0, response: { error: err instanceof Error ? err.message : String(err) } }
  }
}
