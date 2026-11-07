import { z } from 'zod'
import type { MetricValue, PanelAdLead, PanelAdLeads, PanelClientConfig, PanelRange } from '../types'
import { isoDate, isoInclusiveEndDate } from './date-range'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'
const CONVERSATION_ACTION = 'onsite_conversion.messaging_conversation_started_7d'

const actionSchema = z.object({
  action_type: z.string().optional(),
  value: z.string().optional(),
})

const insightSchema = z.object({
  spend: z.string().optional(),
  ctr: z.string().optional(),
  reach: z.string().optional(),
  frequency: z.string().optional(),
  actions: z.array(actionSchema).optional(),
})

const adInsightSchema = insightSchema.extend({
  ad_id: z.string().optional(),
  ad_name: z.string().optional(),
  campaign_name: z.string().optional(),
  adset_name: z.string().optional(),
})

const insightsResponseSchema = z.object({
  data: z.array(insightSchema).optional(),
})

const adInsightsResponseSchema = z.object({
  data: z.array(adInsightSchema).optional(),
})

type MetaSnapshot = {
  spend: number
  conversations: number
  cpl: number | null
  ctr: number
  reach: number
  frequency: number
}

export type MetaMetrics = {
  spend: MetricValue
  conversations: MetricValue
  cpl: MetricValue
  ctr: MetricValue
  reach: MetricValue
  frequency: MetricValue
}

export async function fetchMetaMetrics(client: PanelClientConfig, range: PanelRange): Promise<MetaMetrics> {
  const token = process.env[client.meta.tokenEnv]
  if (!token) return missingMetaMetrics()

  const [current, previous] = await Promise.all([
    fetchMetaSnapshot(client, token, currentMetaRange(range)),
    fetchMetaSnapshot(client, token, {
      since: isoDate(range.previousSince),
      until: isoInclusiveEndDate(range.previousUntil),
    }),
  ])

  return {
    spend: ok(current.spend, previous.spend),
    conversations: ok(current.conversations, previous.conversations),
    cpl: ok(current.cpl, previous.cpl),
    ctr: ok(current.ctr, previous.ctr),
    reach: ok(current.reach, previous.reach),
    frequency: ok(current.frequency, previous.frequency),
  }
}

export async function fetchAdLeadInsights(client: PanelClientConfig, range: PanelRange): Promise<PanelAdLeads> {
  const token = process.env[client.meta.tokenEnv]
  if (!token) return { status: 'missing-token', funnelStatus: 'unavailable', ads: [] }

  const qs = baseInsightParams(token, currentMetaRange(range))
  qs.set('level', 'ad')
  qs.set('fields', 'ad_id,ad_name,campaign_name,adset_name,spend,actions')
  qs.set('limit', '50')

  const response = await fetch(`${GRAPH_BASE}/act_${client.meta.adAccountId}/insights?${qs.toString()}`, {
    next: { revalidate: 300 },
  })
  if (!response.ok) throw new Error(`Meta ads ${response.status}`)
  const parsed = adInsightsResponseSchema.parse(await response.json())
  const ads = (parsed.data ?? [])
    .map(toAdLead)
    .filter((ad) => ad.conversations > 0)
    .sort((a, b) => b.conversations - a.conversations)
    .slice(0, 8)
  return { status: 'ok', funnelStatus: 'unavailable', ads }
}

async function fetchMetaSnapshot(
  client: PanelClientConfig,
  token: string,
  range: { preset: string } | { since: string; until: string },
): Promise<MetaSnapshot> {
  const qs = baseInsightParams(token, range)
  qs.set('fields', 'spend,cpc,cpm,ctr,reach,frequency,actions')

  const response = await fetch(`${GRAPH_BASE}/act_${client.meta.adAccountId}/insights?${qs.toString()}`, {
    next: { revalidate: 300 },
  })
  if (!response.ok) throw new Error(`Meta ${response.status}`)
  const parsed = insightsResponseSchema.parse(await response.json())
  const row = parsed.data?.[0]
  const spend = numberFrom(row?.spend)
  const conversations = conversationsFromActions(row?.actions)

  return {
    spend,
    conversations,
    cpl: conversations > 0 ? spend / conversations : null,
    ctr: numberFrom(row?.ctr),
    reach: numberFrom(row?.reach),
    frequency: numberFrom(row?.frequency),
  }
}

function currentMetaRange(range: PanelRange): { preset: string } | { since: string; until: string } {
  if (range.metaPreset) return { preset: range.metaPreset }
  return { since: isoDate(range.currentSince), until: range.to ?? isoInclusiveEndDate(range.currentUntil) }
}

function baseInsightParams(token: string, range: { preset: string } | { since: string; until: string }): URLSearchParams {
  const qs = new URLSearchParams({ access_token: token })
  if ('preset' in range) qs.set('date_preset', range.preset)
  else qs.set('time_range', JSON.stringify({ since: range.since, until: range.until }))
  return qs
}

function toAdLead(row: z.infer<typeof adInsightSchema>): PanelAdLead {
  const conversations = conversationsFromActions(row.actions)
  const spend = numberFrom(row.spend)
  return {
    adId: row.ad_id || '',
    adName: row.ad_name || 'Anuncio sin nombre',
    campaignName: row.campaign_name || 'Campaña sin nombre',
    adsetName: row.adset_name || '',
    spend,
    conversations,
    cpl: conversations > 0 ? spend / conversations : null,
    funnel: null,
  }
}

function conversationsFromActions(actions: Array<z.infer<typeof actionSchema>> | undefined): number {
  return (actions ?? [])
    .filter((action) => action.action_type === CONVERSATION_ACTION)
    .reduce((sum, action) => sum + numberFrom(action.value), 0)
}

function ok(value: number | null, previous: number | null): MetricValue {
  return { value, previous, status: 'ok' }
}

function missingMetaMetrics(): MetaMetrics {
  const missing: MetricValue = { value: null, previous: null, status: 'missing-token' }
  return {
    spend: missing,
    conversations: missing,
    cpl: missing,
    ctr: missing,
    reach: missing,
    frequency: missing,
  }
}

function numberFrom(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
