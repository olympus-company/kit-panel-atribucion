import type { ClienteAdRow, ClientePanelData } from '@/features/panel-cliente/types'

export type SalesTone = 'green' | 'red' | 'blue' | 'amber' | 'cyan' | 'purple' | 'gold'

export type SalesKpi = {
  label: string
  value: string
  delta: string
  tone: SalesTone
  icon: 'roas' | 'lead' | 'calendar' | 'alert' | 'sale' | 'cost'
}

export type ActionLead = {
  name: string
  reason: string
  phone?: string
  urgency: 'alta' | 'media' | 'baja'
}

export type OpsKpi = {
  label: string
  value: string
  hint: string
  tone: SalesTone
}

export type TrendPoint = {
  label: string
  leads: number
  agendas: number
  ventas: number
}

export type TierDatum = {
  tier: string
  value: number
  revenueUsd: number
}

export type FunnelStep = {
  label: string
  value: number
  conversion: number
  cost: string
  tone: SalesTone
}

export type CockpitCall = {
  id: string
  closerId: string | null
  closerName: string
  prospectName: string
  prospectEmail: string | null
  recordedAt: string
  durationSeconds: number | null
  score: number | null
  outcome: 'ganada' | 'perdida' | 'no-show' | 'pendiente'
  tierQuoted: string | null
  triggerArrival: string | null
  triggerOutcome: string | null
  objectionMain: string | null
  talkRatioCloser: number | null
  questionsCount: number | null
  priceMentionedMin: number | null
  casesMentioned: number | null
  silencesCount: number | null
  aiRecommendation: string | null
  shareUrl: string | null
}

export type CloserRankingRow = {
  id: string
  name: string
  countryCode: string
  role: string
  calls: number
  wins: number
  losses: number
  noShows: number
  avgScore: number | null
  closeRate: number
  speedToLeadMin: number | null
  callsList: CockpitCall[]
}

export type TriggerDatum = {
  label: string
  count: number
  share: number
}

export type ObjectionDatum = {
  label: string
  count: number
  overcomeRate: number
  bestCloser: string
}

export type Palanca = {
  title: string
  type: 'creativo' | 'proceso' | 'equipo'
  description: string
  potential: string
}

export type SalesCockpitData = {
  base: ClientePanelData
  topKpis: SalesKpi[]
  accionDia: {
    leadsSinContacto: number
    calientesSinAgenda: number
    agendasSinRecordatorio: number
    topLeads: ActionLead[]
  }
  opsKpis: OpsKpi[]
  trend: TrendPoint[]
  tiers: TierDatum[]
  palancas: Palanca[]
  journey: FunnelStep[]
  closers: CloserRankingRow[]
  calls: CockpitCall[]
  geoSplit: {
    mx: { leads: number; ventas: number; closeRate: number; revenueUsd: number }
    cl: { leads: number; ventas: number; closeRate: number; revenueUsd: number }
  }
  triggers: TriggerDatum[]
  objections: ObjectionDatum[]
  anatomy: {
    win: string[]
    lose: string[]
  }
  velocity: OpsKpi[]
  ads: ClienteAdRow[]
  generatedAt: Date
  hasFathomData: boolean
}
