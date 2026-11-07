import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const inviteeSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  role: z.string().optional(),
}).passthrough()

const fathomWebhookSchema = z.object({
  meeting_id: z.string().optional(),
  id: z.string().optional(),
  share_url: z.string().url().optional(),
  url: z.string().url().optional(),
  recorded_at: z.string().optional(),
  created_at: z.string().optional(),
  duration_seconds: z.coerce.number().int().optional(),
  invitees: z.array(inviteeSchema).optional(),
  participants: z.array(inviteeSchema).optional(),
}).passthrough()

type CloserRow = { id: string; client_id: string }

export async function POST(req: Request) {
  const rawBody = await req.text()
  const secret = process.env.FATHOM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'FATHOM_WEBHOOK_SECRET no configurado' }, { status: 500 })

  const signature = req.headers.get('x-fathom-signature')
  if (!isValidSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const payload = fathomWebhookSchema.parse(JSON.parse(rawBody) as unknown)
  const closerEmail = detectCloserEmail(payload)
  if (!closerEmail) return NextResponse.json({ ignored: true, reason: 'no host email' })

  const supabase = serviceClient()
  const { data: closer, error: closerError } = await supabase
    .from('client_closers')
    .select('id, client_id')
    .eq('fathom_email', closerEmail.toLowerCase())
    .eq('is_active', true)
    .maybeSingle<CloserRow>()

  if (closerError) return NextResponse.json({ error: closerError.message }, { status: 500 })
  if (!closer) return NextResponse.json({ ignored: true, reason: 'closer not registered' })

  const prospect = detectProspect(payload, closerEmail)
  const meetingId = payload.meeting_id ?? payload.id
  if (!meetingId) return NextResponse.json({ ignored: true, reason: 'missing meeting id' })

  const { data: call, error } = await supabase
    .from('fathom_calls')
    .upsert(
      {
        client_id: closer.client_id,
        closer_id: closer.id,
        fathom_meeting_id: meetingId,
        share_url: payload.share_url ?? payload.url ?? null,
        recorded_at: payload.recorded_at ?? payload.created_at ?? new Date().toISOString(),
        duration_seconds: payload.duration_seconds ?? null,
        prospect_email: prospect.email ?? null,
        prospect_name: prospect.name ?? null,
        raw_payload: payload,
        outcome: 'pendiente',
      },
      { onConflict: 'fathom_meeting_id' },
    )
    .select('id')
    .single<{ id: string }>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void triggerProcess(req, call.id)
  return NextResponse.json({ ok: true, call_id: call.id })
}

function isValidSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const normalized = signature.replace(/^sha256=/, '')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(normalized, 'hex')
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

function detectCloserEmail(payload: z.infer<typeof fathomWebhookSchema>): string | null {
  const people = [...(payload.invitees ?? []), ...(payload.participants ?? [])]
  const host = people.find((person) => ['host', 'owner', 'organizer'].includes((person.type ?? person.role ?? '').toLowerCase()))
  return (host?.email ?? people[0]?.email ?? null)?.toLowerCase() ?? null
}

function detectProspect(payload: z.infer<typeof fathomWebhookSchema>, closerEmail: string): { email?: string; name?: string } {
  const people = [...(payload.invitees ?? []), ...(payload.participants ?? [])]
  const prospect = people.find((person) => person.email && person.email.toLowerCase() !== closerEmail.toLowerCase())
  return { email: prospect?.email?.toLowerCase(), name: prospect?.name }
}

async function triggerProcess(req: Request, callId: string): Promise<void> {
  const secret = process.env.INTERNAL_JOB_SECRET ?? process.env.CRON_SECRET
  if (!secret) return
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin
  await fetch(`${origin}/api/fathom/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify({ call_id: callId }),
    keepalive: true,
  }).catch(() => undefined)
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
