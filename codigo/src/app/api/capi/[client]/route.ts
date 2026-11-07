import { NextResponse } from 'next/server'
import { hashUserData, type RawUserData } from '@/lib/capi/hash-user-data'
import { sendCapiEvents, type CapiEventInput } from '@/lib/capi/meta-capi'
import { getClientConfig } from '@/lib/capi/clients-config'

export const runtime = 'nodejs'

interface IncomingPayload {
  event_name: CapiEventInput['event_name']
  event_id: string
  event_source_url?: string
  user_data: RawUserData
  custom_data?: CapiEventInput['custom_data']
  use_test_event_code?: boolean
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ client: string }> }
) {
  const { client: clientSlug } = await params

  // Auth: shared secret in Authorization header
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CAPI_WEBHOOK_SECRET ?? ''}`
  if (!process.env.CAPI_WEBHOOK_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const config = getClientConfig(clientSlug)
  if (!config) {
    return NextResponse.json({ ok: false, error: `unknown_client:${clientSlug}` }, { status: 404 })
  }

  const capiToken = process.env[config.capi_token_env]
  if (!capiToken) {
    return NextResponse.json(
      { ok: false, error: `missing_env:${config.capi_token_env}` },
      { status: 500 }
    )
  }

  let body: IncomingPayload
  try {
    body = (await request.json()) as IncomingPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.event_name || !body.event_id || !body.user_data) {
    return NextResponse.json(
      { ok: false, error: 'missing_required_fields', required: ['event_name', 'event_id', 'user_data'] },
      { status: 400 }
    )
  }

  const userData = hashUserData({
    country: config.default_country,
    ...body.user_data,
  })

  const event: CapiEventInput = {
    event_name: body.event_name,
    event_id: body.event_id,
    event_source_url: body.event_source_url ?? config.default_event_source_url,
    action_source: 'system_generated',
    user_data: userData,
    custom_data: {
      currency: config.default_currency,
      ...body.custom_data,
    },
  }

  const testCode = body.use_test_event_code ? process.env[config.test_event_code_env] : null

  const result = await sendCapiEvents({
    pixel_id: config.pixel_id,
    capi_token: capiToken,
    events: [event],
    test_event_code: testCode || null,
  })

  // Lightweight log so we can grep Vercel runtime logs
  console.log('[CAPI]', clientSlug, body.event_name, body.event_id, 'status:', result.status, 'response:', JSON.stringify(result.response))

  return NextResponse.json(
    {
      ok: result.ok,
      client: clientSlug,
      event_name: body.event_name,
      event_id: body.event_id,
      meta: result.response,
    },
    { status: result.ok ? 200 : 502 }
  )
}

export async function GET(_req: Request, { params }: { params: Promise<{ client: string }> }) {
  const { client: clientSlug } = await params
  const config = getClientConfig(clientSlug)
  if (!config) return NextResponse.json({ ok: false, error: `unknown_client:${clientSlug}` }, { status: 404 })

  const hasToken = Boolean(process.env[config.capi_token_env])
  const hasTestCode = Boolean(process.env[config.test_event_code_env])
  const hasSecret = Boolean(process.env.CAPI_WEBHOOK_SECRET)

  return NextResponse.json({
    ok: true,
    client: clientSlug,
    pixel_id: config.pixel_id,
    capi_token_configured: hasToken,
    test_event_code_configured: hasTestCode,
    webhook_secret_configured: hasSecret,
    ready: hasToken && hasSecret,
  })
}
