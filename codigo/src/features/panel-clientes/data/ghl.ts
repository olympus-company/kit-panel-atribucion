import { z } from 'zod'
import type { PanelClientConfig, PanelRange, PanelStageKey } from '../types'
import { inRange } from './date-range'

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 OlympusOS/1.0'

const opportunitySchema = z.object({
  id: z.string().optional(),
  contactId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  createdAt: z.string().optional(),
  dateAdded: z.string().optional(),
  updatedAt: z.string().optional(),
  contact: z.object({
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
})

const opportunitiesSchema = z.object({
  opportunities: z.array(opportunitySchema).optional(),
  meta: z.object({ total: z.number().optional() }).optional(),
})

const contactSchema = z.object({
  id: z.string().optional(),
  dateAdded: z.string().optional(),
  createdAt: z.string().optional(),
})

const contactsSearchSchema = z.object({
  contacts: z.array(contactSchema).optional(),
  total: z.number().optional(),
  meta: z.object({ total: z.number().optional() }).optional(),
})

export type GhlStageSnapshot = {
  total: number
  byStage: Record<PanelStageKey, number>
  currentByStage: Record<PanelStageKey, number>
  previousByStage: Record<PanelStageKey, number>
  currentTotal: number
  previousTotal: number
}

export type GhlTagSnapshot = {
  total: number
  current: number
  previous: number
}

export type GhlLeadStage = {
  phone: string
  stageKey: PanelStageKey | null
  tags: string[]
}

export async function fetchGhlStages(client: PanelClientConfig, ranges: PanelRange): Promise<GhlStageSnapshot> {
  const token = envToken(client.ghl.pitEnv)
  const opportunities = await fetchPipelineOpportunities(token, client)
  const empty = emptyStageCounts(client)
  const byStage = { ...empty }
  const currentByStage = { ...empty }
  const previousByStage = { ...empty }

  for (const opportunity of opportunities) {
    const stageKey = stageKeyForId(client, opportunity.pipelineStageId)
    if (!stageKey) continue
    byStage[stageKey] += 1
    const date = opportunity.createdAt ?? opportunity.dateAdded ?? opportunity.updatedAt
    if (inRange(date, ranges.currentSince, ranges.currentUntil)) currentByStage[stageKey] += 1
    if (inRange(date, ranges.previousSince, ranges.previousUntil)) previousByStage[stageKey] += 1
  }

  return {
    total: opportunities.length,
    byStage,
    currentByStage,
    previousByStage,
    currentTotal: countByRange(opportunities, ranges.currentSince, ranges.currentUntil),
    previousTotal: countByRange(opportunities, ranges.previousSince, ranges.previousUntil),
  }
}

export async function fetchGhlLeadStages(client: PanelClientConfig): Promise<GhlLeadStage[]> {
  const token = envToken(client.ghl.pitEnv)
  const opportunities = await fetchPipelineOpportunities(token, client)
  return opportunities
    .map((opportunity) => ({
      phone: opportunity.contact?.phone ?? '',
      stageKey: stageKeyForId(client, opportunity.pipelineStageId),
      tags: opportunity.contact?.tags ?? [],
    }))
    .filter((lead) => lead.phone.trim().length > 0)
}

export async function fetchGhlTag(client: PanelClientConfig, tag: string, ranges: PanelRange): Promise<GhlTagSnapshot> {
  const token = envToken(client.ghl.pitEnv)
  const data = await ghlFetch(token, '/contacts/search', {
    method: 'POST',
    body: {
      locationId: client.ghl.locationId,
      pageLimit: 100,
      filters: [{ field: 'tags', operator: 'contains', value: tag }],
    },
  })
  const parsed = contactsSearchSchema.parse(data)
  const contacts = parsed.contacts ?? []
  const total = parsed.total ?? parsed.meta?.total ?? contacts.length
  return {
    total,
    current: countByRange(contacts, ranges.currentSince, ranges.currentUntil),
    previous: countByRange(contacts, ranges.previousSince, ranges.previousUntil),
  }
}

const OPPS_PAGE_SIZE = 100
const OPPS_MAX_PAGES = 60 // techo de seguridad (~6.000 opps) por si la API reporta un total inflado

async function fetchOpportunitiesPage(token: string, client: PanelClientConfig, page: number): Promise<z.infer<typeof opportunitiesSchema>> {
  const qs = new URLSearchParams({
    location_id: client.ghl.locationId,
    pipeline_id: client.ghl.pipelineId,
    status: 'all',
    limit: String(OPPS_PAGE_SIZE),
    page: String(page),
  })
  const data = await ghlFetch(token, `/opportunities/search?${qs.toString()}`, { method: 'GET' })
  return opportunitiesSchema.parse(data)
}

// Trae TODAS las oportunidades del pipeline (antes cortaba en 1.000 → clientes con una cartera grande
// veían etapas enteras en 0 porque las páginas 11+ quedaban fuera). La página 1 revela meta.total y las
// restantes se piden en paralelo.
async function fetchPipelineOpportunities(token: string, client: PanelClientConfig): Promise<Array<z.infer<typeof opportunitySchema>>> {
  const first = await fetchOpportunitiesPage(token, client, 1)
  const all = [...(first.opportunities ?? [])]
  const total = first.meta?.total ?? all.length
  const totalPages = Math.min(Math.ceil(total / OPPS_PAGE_SIZE), OPPS_MAX_PAGES)
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => fetchOpportunitiesPage(token, client, index + 2)),
    )
    for (const page of rest) all.push(...(page.opportunities ?? []))
  }
  return all
}

export async function fetchGhlContactTotal(client: PanelClientConfig): Promise<number> {
  const token = envToken(client.ghl.pitEnv)
  const data = await ghlFetch(token, '/contacts/search', {
    method: 'POST',
    body: { locationId: client.ghl.locationId, pageLimit: 1 },
  })
  const parsed = contactsSearchSchema.parse(data)
  return parsed.total ?? parsed.meta?.total ?? parsed.contacts?.length ?? 0
}

function envToken(envName: string): string {
  const token = process.env[envName]
  if (!token) throw new Error(`${envName} no configurada`)
  return token
}

async function ghlFetch(token: string, path: string, init: { method: 'GET' | 'POST'; body?: Record<string, unknown> }): Promise<unknown> {
  const response = await fetch(`${GHL_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Version: '2021-07-28',
      'User-Agent': GHL_USER_AGENT,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    next: { revalidate: 300 },
  })
  if (!response.ok) throw new Error(`GHL ${response.status}`)
  return response.json()
}

function stageKeyForId(client: PanelClientConfig, stageId: string | undefined): PanelStageKey | null {
  if (!stageId) return null
  const entry = Object.entries(client.ghl.stages).find(([, id]) => id === stageId)
  return (entry?.[0] as PanelStageKey | undefined) ?? null
}

function emptyStageCounts(client: PanelClientConfig): Record<PanelStageKey, number> {
  return Object.keys(client.ghl.stages).reduce((acc, key) => {
    acc[key as PanelStageKey] = 0
    return acc
  }, {} as Record<PanelStageKey, number>)
}

function countByRange(items: Array<{ createdAt?: string; dateAdded?: string; updatedAt?: string }>, since: Date, until: Date): number {
  return items.filter((item) => inRange(item.createdAt ?? item.dateAdded ?? item.updatedAt, since, until)).length
}
