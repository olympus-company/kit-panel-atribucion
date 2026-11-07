import { z } from 'zod'
import { inRange } from '@/features/panel-clientes/data/date-range'
import type { MetricValue, PanelRange } from '@/features/panel-clientes/types'
import { CLIENTE_CONFIG, USD_TO_CLP, type ClienteStageKind } from './config'
import {
  emptyMeta,
  fetchClienteCreativesByName,
  fetchClienteMetaSnapshot,
  fetchClienteSpendByName,
  type ClienteAdCreative,
} from './meta'
import { buildClienteAdBreakdown, type OppForAttribution } from './attribution'
import type { ClienteFunnelSnapshot, ClienteFunnelStage, ClienteKpis, ClientePanelData, SourceStatus } from './types'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 OlympusOS/1.0'
const PAGE_LIMIT = 100
const PAGE_CAP = 80

const STAGE_KIND = new Map<string, ClienteStageKind>(CLIENTE_CONFIG.ghl.stages.map((s) => [s.id, s.kind]))

const optStr = z.preprocess((value) => (value === null ? undefined : value), z.string().optional())
const attributionEntrySchema = z.object({ utmContent: optStr, utmCampaign: optStr }).passthrough()
const opportunitySchema = z.object({
  id: optStr,
  pipelineStageId: optStr,
  stageId: optStr,
  createdAt: optStr,
  dateAdded: optStr,
  updatedAt: optStr,
  monetaryValue: z.coerce.number().nullish(),
  attributions: z.array(attributionEntrySchema).optional(),
})
const opportunitiesResponseSchema = z.object({
  opportunities: z.array(opportunitySchema).optional(),
  meta: z.object({ total: z.number().optional() }).optional(),
})
type Opportunity = z.infer<typeof opportunitySchema>

export async function getClientePanelData(range: PanelRange): Promise<ClientePanelData> {
  const [meta, metaPrevious, opportunities, spendByName, creativesByName] = await Promise.all([
    safe(fetchClienteMetaSnapshot(range), emptyMeta()),
    safe(fetchClienteMetaSnapshot(previousRange(range)), emptyMeta()),
    safe(fetchOpportunities(), null),
    safe(fetchClienteSpendByName(range), new Map<string, number>()),
    safe(fetchClienteCreativesByName(), new Map<string, ClienteAdCreative>()),
  ])

  const rangeOpps = (opportunities ?? []).filter((opportunity) => oppInRange(opportunity, range))
  const previousOpps = (opportunities ?? []).filter((opportunity) => oppInRange(opportunity, previousRange(range)))
  const current = summarize(rangeOpps)
  const previous = summarize(previousOpps)

  const attribution = buildClienteAdBreakdown(rangeOpps.map(toAttribution), spendByName, creativesByName)

  const kpis: ClienteKpis = {
    spend: ok(meta.spend, metaPrevious.spend),
    leads: ok(current.total, previous.total),
    qualified: ok(current.qualified, previous.qualified),
    agenda: ok(current.agenda, previous.agenda),
    ventas: ok(current.ventas, previous.ventas),
    revenueUsd: ok(current.revenueUsd, previous.revenueUsd),
    costPerLead: ok(perAction(meta.spend, current.total), perAction(metaPrevious.spend, previous.total)),
    costPerQualified: ok(perAction(meta.spend, current.qualified), perAction(metaPrevious.spend, previous.qualified)),
    costPerVenta: ok(perAction(meta.spend, current.ventas), perAction(metaPrevious.spend, previous.ventas)),
    roas: ok(roasOf(current.revenueUsd, meta.spend), roasOf(previous.revenueUsd, metaPrevious.spend)),
  }

  return {
    generatedAt: new Date(),
    range,
    sourceStatus: {
      meta: metaStatus(meta.spend > 0 || attribution.spendResolved),
      ghl: opportunities ? 'ok' : tokenStatus(CLIENTE_CONFIG.ghl.tokenEnv),
    },
    kpis,
    funnel: {
      total: current.total,
      qualified: current.qualified,
      agenda: current.agenda,
      ventas: current.ventas,
      descartados: current.descartados,
      noShow: current.noShow,
      stages: current.stages,
    },
    attribution,
  }
}

type Summary = ClienteFunnelSnapshot & { revenueUsd: number }

function summarize(opps: Opportunity[]): Summary {
  const counts = new Map<string, number>(CLIENTE_CONFIG.ghl.stages.map((s) => [s.id, 0]))
  let total = 0
  let qualified = 0
  let agenda = 0
  let ventas = 0
  let descartados = 0
  let noShow = 0
  let revenueUsd = 0

  for (const opp of opps) {
    const stageId = opp.pipelineStageId ?? opp.stageId ?? ''
    const kind = STAGE_KIND.get(stageId)
    total++
    if (counts.has(stageId)) counts.set(stageId, (counts.get(stageId) ?? 0) + 1)
    if (kind === 'descarte') descartados++
    else if (kind) qualified++
    if (kind === 'agenda' || kind === 'noshow' || kind === 'venta') agenda++
    if (kind === 'noshow') noShow++
    if (kind === 'venta') {
      ventas++
      revenueUsd += Number(opp.monetaryValue ?? 0)
    }
  }

  const stages: ClienteFunnelStage[] = CLIENTE_CONFIG.ghl.stages.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    count: counts.get(s.id) ?? 0,
    share: total > 0 ? (counts.get(s.id) ?? 0) / total : 0,
  }))

  return { total, qualified, agenda, ventas, descartados, noShow, stages, revenueUsd }
}

function toAttribution(opp: Opportunity): OppForAttribution {
  return {
    stageId: opp.pipelineStageId ?? opp.stageId,
    utmContent: primaryUtm(opp, 'utmContent'),
    utmCampaign: primaryUtm(opp, 'utmCampaign'),
    monetaryValue: Number(opp.monetaryValue ?? 0),
  }
}

function primaryUtm(opp: Opportunity, key: 'utmContent' | 'utmCampaign'): string | undefined {
  for (const a of opp.attributions ?? []) {
    const value = a[key]
    if (value) return value
  }
  return undefined
}

async function fetchOpportunities(): Promise<Opportunity[]> {
  const token = envRequired(CLIENTE_CONFIG.ghl.tokenEnv)
  const first = await fetchOpportunitiesPage(token, 1)
  const all = [...(first.opportunities ?? [])]
  const total = first.meta?.total ?? all.length
  const pages = Math.min(Math.ceil(total / PAGE_LIMIT), PAGE_CAP)
  if (pages <= 1) return all
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => fetchOpportunitiesPage(token, index + 2)))
  for (const page of rest) all.push(...(page.opportunities ?? []))
  return all
}

async function fetchOpportunitiesPage(token: string, page: number): Promise<z.infer<typeof opportunitiesResponseSchema>> {
  const qs = new URLSearchParams({
    location_id: CLIENTE_CONFIG.ghl.locationId,
    pipeline_id: CLIENTE_CONFIG.ghl.pipelineId,
    status: 'all',
    limit: String(PAGE_LIMIT),
    page: String(page),
  })
  const response = await fetch(`${GHL_BASE}/opportunities/search?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Version: '2021-07-28',
      'User-Agent': GHL_USER_AGENT,
    },
    next: { revalidate: 300 },
  })
  if (!response.ok) throw new Error(`GHL opportunities ${response.status}`)
  return opportunitiesResponseSchema.parse(await response.json())
}

function oppInRange(opp: Opportunity, range: PanelRange): boolean {
  return inRange(opp.createdAt ?? opp.dateAdded ?? opp.updatedAt, range.currentSince, range.currentUntil)
}

function previousRange(range: PanelRange): PanelRange {
  return { ...range, currentSince: range.previousSince, currentUntil: range.previousUntil, metaPreset: undefined, from: undefined, to: undefined }
}

function perAction(spend: number, count: number): number | null {
  return count > 0 && spend > 0 ? spend / count : null
}

function roasOf(revenueUsd: number, spendClp: number): number | null {
  return spendClp > 0 ? (revenueUsd * USD_TO_CLP) / spendClp : null
}

function ok(value: number | null, previous: number | null): MetricValue {
  return { value, previous, trendValue: value, status: 'ok' }
}

function metaStatus(hasData: boolean): SourceStatus {
  if (!process.env[CLIENTE_CONFIG.meta.tokenEnv] || !CLIENTE_CONFIG.meta.adAccountId) return 'missing-token'
  return hasData ? 'ok' : 'error'
}

function tokenStatus(envName: string): SourceStatus {
  return process.env[envName] ? 'error' : 'missing-token'
}

function envRequired(name: string): string {
  const token = process.env[name]
  if (!token) throw new Error(`${name} no configurada`)
  return token
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}
