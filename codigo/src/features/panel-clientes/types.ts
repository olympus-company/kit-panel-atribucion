export type PanelStageKey =
  | 'calificado'
  | 'agendado'
  | 'noShow'
  | 'concretado'
  | 'seguimiento'
  | 'futura'
  | 'noCalifica'

// Rótulos del segmento de 2 servicios (el donut). Cada cliente define su par de servicios.
// `primary` mapea a la métrica `servicioA`, `secondary` a `servicioB` (los buckets
// internos no cambian; solo cambia cómo se rotulan). `metaAccountName` = nombre de la cuenta de Meta.
export type PanelSegmentLabels = {
  title: string
  primary: { label: string; detail?: string }
  secondary: { label: string; detail?: string }
  metaAccountName: string
}

export type PanelClientConfig = {
  slug: string
  nombre: string
  rubro: string
  initials: string
  labels: PanelSegmentLabels
  ghl: {
    locationId: string
    pitEnv: string
    pipelineId: string
    stages: Record<PanelStageKey, string>
    tags: {
      servicioB: string
      servicioA: string
      calificado: string
      noCalificado: string
    }
  }
  meta: {
    adAccountId: string
    tokenEnv: string
  }
}

export type PanelRangeKey = 'today' | '7d' | '30d' | 'month' | 'completo' | 'custom'

export type PanelRangeOption = {
  key: PanelRangeKey
  label: string
}

export type PanelRange = {
  key: PanelRangeKey
  label: string
  currentSince: Date
  currentUntil: Date
  previousSince: Date
  previousUntil: Date
  metaPreset?: 'today' | 'last_7d' | 'last_30d' | 'this_month' | 'maximum'
  from?: string
  to?: string
}

export type MetricValue = {
  value: number | null
  previous: number | null
  trendValue?: number | null
  status: 'ok' | 'missing-token' | 'error'
}

export type PanelMetricKey =
  | 'leads'
  | 'calificados'
  | 'agendados'
  | 'seguimiento'
  | 'concretados'
  | 'servicioB'
  | 'servicioA'
  | 'metaSpend'
  | 'metaConversations'
  | 'metaCpl'
  | 'metaCtr'
  | 'metaReach'

export type PanelMetrics = Record<PanelMetricKey, MetricValue>

export type PanelAdLead = {
  adId: string
  adName: string
  campaignName: string
  adsetName: string
  spend: number
  conversations: number
  cpl: number | null
  funnel: PanelAdFunnel | null
}

export type PanelCampaignLead = {
  campaignName: string
  spend: number
  conversations: number
  cpl: number | null
  funnel: PanelAdFunnel | null
}

export type PanelAdFunnel = {
  qualified: number
  scheduled: number
  paid: number
  costPerQualified: number | null
  costPerScheduled: number | null
  costPerPaid: number | null
}

export type PanelAdLeads = {
  status: 'ok' | 'missing-token' | 'error'
  funnelStatus: 'ok' | 'unavailable'
  ads: PanelAdLead[]
}

export type PanelData = {
  client: PanelClientConfig
  generatedAt: Date
  range: PanelRange
  totalContacts: number | null
  pipelineTotal: number | null
  metrics: PanelMetrics
  metaFrequency: MetricValue
  adLeads: PanelAdLeads
  campaignLeads: PanelCampaignLead[]
}
