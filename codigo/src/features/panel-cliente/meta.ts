import { z } from 'zod'
import { isoDate, isoInclusiveEndDate } from '@/features/panel-clientes/data/date-range'
import type { PanelRange } from '@/features/panel-clientes/types'
import { CLIENTE_CONFIG } from './config'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

// Normaliza el nombre del anuncio para cruzar utmContent (CRM) con ad_name (Meta): idénticos salvo
// espacios/mayúsculas.
export function normalizeAdName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

const metricSchema = z.object({ action_type: z.string().optional(), value: z.string().optional() })
const insightSchema = z.object({
  spend: z.string().optional(),
  cpm: z.string().optional(),
  ctr: z.string().optional(),
  actions: z.array(metricSchema).optional(),
})
const insightsResponseSchema = z.object({ data: z.array(insightSchema).optional() })

export type MetaSnapshot = { spend: number; leads: number; cpm: number; ctr: number }
export function emptyMeta(): MetaSnapshot {
  return { spend: 0, leads: 0, cpm: 0, ctr: 0 }
}

// Snapshot a nivel cuenta (gasto CLP + leads Meta + cpm/ctr) para el rango.
export async function fetchClienteMetaSnapshot(range: PanelRange): Promise<MetaSnapshot> {
  const token = process.env[CLIENTE_CONFIG.meta.tokenEnv]
  const adAccountId = CLIENTE_CONFIG.meta.adAccountId
  if (!token || !adAccountId) return emptyMeta()
  const qs = metaParams(token, range)
  qs.set('fields', 'spend,cpm,ctr,actions')
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/insights?${qs.toString()}`, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Meta ${res.status}`)
  const row = insightsResponseSchema.parse(await res.json()).data?.[0]
  return {
    spend: numberFrom(row?.spend),
    leads: metaMetricTotal(row?.actions, 'lead'),
    cpm: numberFrom(row?.cpm),
    ctr: numberFrom(row?.ctr),
  }
}

const adInsightSchema = z.object({ ad_name: z.string().optional(), spend: z.string().optional() })
const adInsightsResponseSchema = z.object({ data: z.array(adInsightSchema).optional() })

// Gasto (CLP) por NOMBRE de anuncio en el rango. Suma los ad_id que comparten nombre (hay duplicados).
export async function fetchClienteSpendByName(range: PanelRange): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const token = process.env[CLIENTE_CONFIG.meta.tokenEnv]
  const adAccountId = CLIENTE_CONFIG.meta.adAccountId
  if (!token || !adAccountId) return map
  const qs = metaParams(token, range)
  qs.set('level', 'ad')
  qs.set('fields', 'ad_name,spend')
  qs.set('limit', '500')
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/insights?${qs.toString()}`, { next: { revalidate: 300 } })
  if (!res.ok) return map
  for (const row of adInsightsResponseSchema.parse(await res.json()).data ?? []) {
    if (!row.ad_name) continue
    const key = normalizeAdName(row.ad_name)
    map.set(key, (map.get(key) ?? 0) + numberFrom(row.spend))
  }
  return map
}

const adCreativeSchema = z.object({
  name: z.string().optional(),
  effective_status: z.string().optional(),
  adset: z.object({ end_time: z.string().optional() }).optional(),
  creative: z
    .object({ effective_object_story_id: z.string().optional(), instagram_permalink_url: z.string().optional() })
    .optional(),
})
const adCreativesResponseSchema = z.object({ data: z.array(adCreativeSchema).optional() })

export type ClienteAdCreative = { name: string; postUrl: string | null; activo: boolean }

// ¿El anuncio corre HOY? effective_status arrastra pausas de campaña/conjunto, pero no la fecha de término
// del conjunto (un evento vencido sigue "ACTIVE") → se revisa adset.end_time. Ver src/lib/meta/estado-anuncios.ts.
function adCorreHoy(ad: { effective_status?: string; adset?: { end_time?: string } }): boolean {
  const fin = ad.adset?.end_time ? new Date(ad.adset.end_time).getTime() : null
  return ad.effective_status === 'ACTIVE' && (fin === null || fin > Date.now())
}


// Publicación PÚBLICA del anuncio (con comentarios), abrible sin login. FB post (effective_object_story_id)
// o permalink IG. NUNCA fb.me/adspreview.
function buildPublicPostUrl(creative?: { effective_object_story_id?: string; instagram_permalink_url?: string }): string | null {
  if (!creative) return null
  const eff = creative.effective_object_story_id
  if (eff && eff.includes('_')) {
    const [pageId, postId] = eff.split('_')
    if (pageId && postId) return `https://www.facebook.com/${pageId}/posts/${postId}`
  }
  return creative.instagram_permalink_url ?? null
}

// Catálogo de anuncios por NOMBRE → link a la publicación pública. Best-effort.
export async function fetchClienteCreativesByName(): Promise<Map<string, ClienteAdCreative>> {
  const map = new Map<string, ClienteAdCreative>()
  const token = process.env[CLIENTE_CONFIG.meta.tokenEnv]
  const adAccountId = CLIENTE_CONFIG.meta.adAccountId
  if (!token || !adAccountId) return map
  const qs = new URLSearchParams({
    access_token: token,
    fields: 'name,effective_status,adset{end_time},creative{effective_object_story_id,instagram_permalink_url}',
    limit: '500',
  })
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/ads?${qs.toString()}`, { next: { revalidate: 300 } })
  if (!res.ok) return map
  for (const ad of adCreativesResponseSchema.parse(await res.json()).data ?? []) {
    if (!ad.name) continue
    const key = normalizeAdName(ad.name)
    const postUrl = buildPublicPostUrl(ad.creative)
    // Prefiere la primera que resuelva un post público.
    const activo = adCorreHoy(ad)
    const prev = map.get(key)
    // Varios anuncios pueden compartir nombre: la fila queda prendida si CUALQUIERA corre hoy.
    if (!prev || (!prev.postUrl && postUrl)) map.set(key, { name: ad.name, postUrl, activo: (prev?.activo ?? false) || activo })
    else if (activo && !prev.activo) prev.activo = true
  }
  return map
}

function metaMetricTotal(metrics: Array<z.infer<typeof metricSchema>> | undefined, key: string): number {
  return (metrics ?? [])
    .filter((m) => {
      const type = m.action_type ?? ''
      if (key === 'lead') return type === 'lead' || type.endsWith('.lead') || type.includes('lead_grouped')
      return type === key || type.endsWith(`.${key}`)
    })
    .reduce((sum, m) => sum + numberFrom(m.value), 0)
}

function metaParams(token: string, range: PanelRange): URLSearchParams {
  const qs = new URLSearchParams({ access_token: token })
  if (range.metaPreset) qs.set('date_preset', range.metaPreset)
  else qs.set('time_range', JSON.stringify({ since: isoDate(range.currentSince), until: range.to ?? isoInclusiveEndDate(range.currentUntil) }))
  return qs
}

function numberFrom(value: string | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
