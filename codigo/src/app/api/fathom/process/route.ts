import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callGHL } from '@/lib/ghl'
import { scoreFathomCall } from '@/lib/openrouter'

const processSchema = z.object({ call_id: z.string().uuid() })

const callRowSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  closer_id: z.string().uuid().nullable(),
  fathom_meeting_id: z.string(),
  prospect_email: z.string().nullable(),
  transcript_raw: z.string().nullable(),
  raw_payload: z.record(z.string(), z.unknown()).nullable(),
  client_closers: z.object({ full_name: z.string().nullable() }).nullable(),
  clients: z.object({
    client_name: z.string().nullable(),
    name: z.string().nullable(),
    fathom_config: z.record(z.string(), z.unknown()).nullable(),
  }).nullable(),
})

const ghlAccountSchema = z.object({ api_key: z.string().nullable(), location_id: z.string().nullable() }).nullable()
const contactLookupSchema = z.object({
  contacts: z.array(z.object({ id: z.string().optional() }).passthrough()).optional(),
  contact: z.object({ id: z.string().optional() }).passthrough().optional(),
}).passthrough()
const opportunitiesSchema = z.object({
  opportunities: z.array(z.object({ id: z.string().optional(), contactId: z.string().optional() }).passthrough()).optional(),
}).passthrough()

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_JOB_SECRET ?? process.env.CRON_SECRET
  if (!secret || req.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = processSchema.parse(await req.json())
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('fathom_calls')
    .select('id, client_id, closer_id, fathom_meeting_id, prospect_email, transcript_raw, raw_payload, client_closers(full_name), clients(client_name, name, fathom_config)')
    .eq('id', body.call_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const call = callRowSchema.parse(data)
  const transcript = call.transcript_raw ?? extractTranscript(call.raw_payload) ?? (await downloadTranscript(call.fathom_meeting_id))
  if (!transcript) return NextResponse.json({ error: 'transcript unavailable' }, { status: 422 })

  const config = parseConfig(call.clients?.fathom_config ?? null)
  const scoring = await scoreFathomCall(transcript, {
    clientName: call.clients?.client_name ?? call.clients?.name ?? 'Cliente Ejemplo',
    closerName: call.client_closers?.full_name ?? null,
    gatillos: config.gatillos,
    objections: config.objections,
  })

  const crm = await matchGhlOpportunity(supabase, call.client_id, call.prospect_email)
  const { error: updateError } = await supabase
    .from('fathom_calls')
    .update({
      transcript_raw: transcript,
      score: scoring.score,
      outcome: scoring.outcome,
      tier_quoted: scoring.tier_quoted,
      trigger_arrival: scoring.trigger_arrival,
      trigger_outcome: scoring.trigger_outcome,
      objection_main: scoring.objection_main,
      talk_ratio_closer: scoring.talk_ratio_closer,
      questions_count: scoring.questions_count,
      price_mentioned_min: scoring.price_mentioned_min,
      cases_mentioned: scoring.cases_mentioned,
      silences_count: scoring.silences_count,
      ai_recommendation: scoring.ai_recommendation,
      matched_gatillo: scoring.matched_gatillo,
      matched_objection: scoring.matched_objection,
      crm_contact_id: crm.contactId,
      crm_opportunity_id: crm.opportunityId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', call.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true, call_id: call.id, crm })
}

function extractTranscript(payload: Record<string, unknown> | null): string | null {
  const direct = payload?.transcript ?? payload?.transcript_text ?? payload?.summary
  if (typeof direct === 'string' && direct.trim()) return direct
  const segments = payload?.transcript_segments
  if (!Array.isArray(segments)) return null
  const lines = segments
    .map((segment) => {
      if (!segment || typeof segment !== 'object') return null
      const record = segment as Record<string, unknown>
      return typeof record.text === 'string' ? record.text : null
    })
    .filter((line): line is string => Boolean(line))
  return lines.length ? lines.join('\n') : null
}

async function downloadTranscript(meetingId: string): Promise<string | null> {
  const apiKey = process.env.FATHOM_API_KEY
  if (!apiKey) return null
  const response = await fetch(`https://api.fathom.video/v1/meetings/${encodeURIComponent(meetingId)}/transcript`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })
  if (!response.ok) return null
  const json = (await response.json()) as unknown
  const parsed = z
    .object({
      transcript: z.string().optional(),
      text: z.string().optional(),
      segments: z.array(z.object({ text: z.string().optional() }).passthrough()).optional(),
    })
    .passthrough()
    .parse(json)
  return parsed.transcript ?? parsed.text ?? parsed.segments?.map((segment) => segment.text).filter(Boolean).join('\n') ?? null
}

function parseConfig(value: Record<string, unknown> | null): { gatillos: string[]; objections: string[] } {
  const parsed = z
    .object({ gatillos: z.array(z.string()).default([]), objections: z.array(z.string()).default([]) })
    .catch({ gatillos: [], objections: [] })
    .parse(value ?? {})
  return parsed
}

async function matchGhlOpportunity(
  supabase: ReturnType<typeof serviceClient>,
  clientId: string,
  prospectEmail: string | null,
): Promise<{ contactId: string | null; opportunityId: string | null }> {
  if (!prospectEmail) return { contactId: null, opportunityId: null }

  const { data } = await supabase.from('ghl_accounts').select('api_key, location_id').eq('client_id', clientId).maybeSingle()
  const account = ghlAccountSchema.parse(data ?? null)
  if (!account?.api_key || !account.location_id) return { contactId: null, opportunityId: null }

  try {
    const lookup = contactLookupSchema.parse(await callGHL(account.api_key, `/contacts/search/duplicate?locationId=${account.location_id}&email=${encodeURIComponent(prospectEmail)}`))
    const contactId = lookup.contact?.id ?? lookup.contacts?.[0]?.id ?? null
    if (!contactId) return { contactId: null, opportunityId: null }

    const opportunities = opportunitiesSchema.parse(await callGHL(account.api_key, `/opportunities/search?location_id=${account.location_id}&contact_id=${contactId}&limit=20`))
    return { contactId, opportunityId: opportunities.opportunities?.[0]?.id ?? null }
  } catch {
    return { contactId: null, opportunityId: null }
  }
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
