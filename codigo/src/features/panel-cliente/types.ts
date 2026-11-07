import type { MetricValue, PanelRange } from '@/features/panel-clientes/types'
import type { ClienteStageKind } from './config'

export type SourceStatus = 'ok' | 'missing-token' | 'error'

// Costos en CLP (moneda de la cuenta Meta). revenueUsd y roas usan la conversión 1 USD = 1.000 CLP.
export type ClienteKpis = {
  spend: MetricValue // CLP
  leads: MetricValue
  qualified: MetricValue
  agenda: MetricValue
  ventas: MetricValue
  revenueUsd: MetricValue // USD
  costPerLead: MetricValue // CLP
  costPerQualified: MetricValue // CLP
  costPerVenta: MetricValue // CLP
  roas: MetricValue // ratio (revenue convertido a CLP / gasto CLP)
}

export type ClienteFunnelStage = {
  id: string
  name: string
  kind: ClienteStageKind
  count: number
  share: number
}

export type ClienteFunnelSnapshot = {
  total: number
  qualified: number
  agenda: number
  ventas: number
  descartados: number
  noShow: number
  stages: ClienteFunnelStage[]
}

// Un anuncio con su funnel real (CRM, cruzado por NOMBRE) + gasto (Meta). Verdad del funnel = CRM.
export type ClienteAdRow = {
  adName: string
  campaignName: string
  leads: number
  notQualified: number // etapa "No calificado" (descarte), por anuncio
  qualified: number
  agenda: number
  ventas: number
  revenueUsd: number
  spend: number // CLP
  costPerLead: number | null // CLP
  costPerQualified: number | null // CLP
  costPerVenta: number | null // CLP
  roas: number | null
  postUrl: string | null // publicación PÚBLICA (FB/IG con comentarios)
  activo: boolean | null // ¿corre HOY en Meta? (independiente del período) · null = no se pudo leer
}

export type ClienteCampaignRow = {
  campaignName: string
  leads: number
  qualified: number
  agenda: number
  ventas: number
  revenueUsd: number
  spend: number
  roas: number | null
}

export type ClientePlanRow = { plan: string; ventas: number; revenueUsd: number }

// Fila de la tabla "Calidad de leads por anuncio" (pedido del dueño): cada anuncio DESAGREGADO por país.
// Des-coliciona los nombres homónimos que viven en campañas de distintos países,
// que es justo el "no hay claridad de dónde viene". Los % de la vista se calculan sobre `leads`.
export type ClienteAdQualityRow = {
  adName: string
  campaign: string // nombre de campaña normalizado (colapsa duplicados por mayúsculas); '—' si sin atribuir
  leads: number
  qualified: number
  notQualified: number
  ventas: number
}

export type ClienteAttribution = {
  totalSpend: number // CLP
  byAd: ClienteAdRow[]
  byCampaign: ClienteCampaignRow[]
  byPlan: ClientePlanRow[]
  byAdQuality: ClienteAdQualityRow[]
  metaResolved: boolean
  spendResolved: boolean
}

export type ClientePanelData = {
  generatedAt: Date
  range: PanelRange
  sourceStatus: {
    meta: SourceStatus
    ghl: SourceStatus
  }
  kpis: ClienteKpis
  funnel: ClienteFunnelSnapshot
  attribution: ClienteAttribution
}
