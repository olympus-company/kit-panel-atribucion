// Webhook: los workflows del CRM del dueño (Cliente Ejemplo) avisan cada escalón del embudo y esta ruta
// dispara el evento CAPI correspondiente a Meta. Cierra el circuito de datos (hoy Meta ve 0 ventas → optimiza a
// leads baratos). Cada sender gatea por CLIENTE_CAPI_LIVE (inerte hasta prenderlo) y es idempotente por event_id.
//
// Wire en GHL (un workflow por evento, enganchado a los tags/etapas que el equipo YA usa):
//   • lead     → trigger tag "calificada"        (o etapa "Calificado · no agendó")  → CompleteRegistration
//   • schedule → trigger tag "llamada agendada"  (o etapa "Agendó cita")             → Schedule
//   • purchase → trigger etapa "Acceso PLAN X" / "Negocio cerrado"                   → Purchase (con value CLP)
// Acción Webhook (POST) a  {APP}/api/capi/cliente
//   header Authorization: Bearer <CAPI_WEBHOOK_SECRET>
//   body JSON: { "event": "schedule", "contactId": "{{contact.id}}", "phone": "{{contact.phone}}", "email": "{{contact.email}}" }
//   (purchase además: "value": 1000000  ← monto de la venta en la moneda del dataset)
import { NextResponse } from 'next/server'
import { sendClienteLead, sendClienteSchedule, sendClientePurchase } from '@/lib/sales-agent/cliente-capi'

export const runtime = 'nodejs'

type EventKind = 'lead' | 'schedule' | 'purchase'

interface Body {
  event?: string
  contactId?: string
  phone?: string | null
  email?: string | null
  value?: number
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CAPI_WEBHOOK_SECRET ?? ''}`
  if (!process.env.CAPI_WEBHOOK_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const event = (body.event ?? '').trim().toLowerCase() as EventKind
  if (!body.contactId) {
    return NextResponse.json({ ok: false, error: 'missing_contactId' }, { status: 400 })
  }

  const common = { contactId: body.contactId, phone: body.phone ?? null, email: body.email ?? null }
  // Best-effort: los senders gatean por CLIENTE_CAPI_LIVE y jamás lanzan (envuelven su propio try/catch).
  switch (event) {
    case 'lead':
      await sendClienteLead(common)
      break
    case 'schedule':
      await sendClienteSchedule(common)
      break
    case 'purchase':
      await sendClientePurchase({ ...common, amount: body.value })
      break
    default:
      return NextResponse.json({ ok: false, error: `unsupported_event:${event || 'vacío'}` }, { status: 400 })
  }

  console.log('[CAPI cliente]', event, body.contactId, body.value != null ? `value:${body.value}` : '')
  return NextResponse.json({ ok: true, event, contactId: body.contactId })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'capi/cliente',
    events: ['lead', 'schedule', 'purchase'],
    live: process.env.CLIENTE_CAPI_LIVE === 'true',
    secret_configured: Boolean(process.env.CAPI_WEBHOOK_SECRET),
  })
}
