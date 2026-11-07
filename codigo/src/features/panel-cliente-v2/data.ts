import { createClient } from '@supabase/supabase-js'
import { getClientePanelData } from '@/features/panel-cliente/data'
import { CLIENTE_CONFIG } from '@/features/panel-cliente/config'
import type { PanelRange } from '@/features/panel-clientes/types'
import type {
  ActionLead,
  CloserRankingRow,
  CockpitCall,
  ObjectionDatum,
  OpsKpi,
  Palanca,
  SalesCockpitData,
  SalesKpi,
  TierDatum,
  TriggerDatum,
} from './types'

type ClientRow = { id: string; fathom_config: Record<string, unknown> | null }
type CloserRow = { id: string; full_name: string; country_code: string; role: string }
type FathomRow = {
  id: string
  closer_id: string | null
  prospect_name: string | null
  prospect_email: string | null
  recorded_at: string
  duration_seconds: number | null
  score: number | null
  outcome: 'ganada' | 'perdida' | 'no-show' | 'pendiente'
  tier_quoted: string | null
  trigger_arrival: string | null
  trigger_outcome: string | null
  objection_main: string | null
  talk_ratio_closer: number | null
  questions_count: number | null
  price_mentioned_min: number | null
  cases_mentioned: number | null
  silences_count: number | null
  ai_recommendation: string | null
  share_url: string | null
}

const DEFAULT_GATILLOS = [
  'Gatillo de compra de ejemplo 1',
  'Gatillo de compra de ejemplo 2',
  'Gatillo de compra de ejemplo 3',
]

const DEFAULT_OBJECTIONS = ['Precio', 'Objeción de ejemplo 2', 'Objeción de ejemplo 3']

export async function getClienteV2Data(range: PanelRange): Promise<SalesCockpitData> {
  const base = await getClientePanelData(range)
  const client = await getClient()
  const [closers, calls] = client ? await Promise.all([fetchClosers(client.id), fetchCalls(client.id)]) : [[], []]
  const normalizedCalls = normalizeCalls(calls, closers)
  const closerRows = buildClosers(closers, normalizedCalls)
  const ventas = base.funnel.ventas
  const agenda = base.funnel.agenda
  const leads = base.funnel.total
  const noShows = base.funnel.noShow

  return {
    base,
    topKpis: buildTopKpis(base),
    accionDia: buildActionData(leads, agenda, noShows),
    opsKpis: buildOpsKpis(base, normalizedCalls),
    trend: buildTrend(leads, agenda, ventas),
    tiers: buildTiers(base.attribution.byPlan),
    palancas: buildPalancas(base, normalizedCalls.length > 0),
    journey: [
      { label: 'Leads', value: leads, conversion: 100, cost: metricValue(base.kpis.costPerLead.value, 'clp'), tone: 'blue' },
      { label: 'Calificados', value: base.funnel.qualified, conversion: share(base.funnel.qualified, leads), cost: metricValue(base.kpis.costPerQualified.value, 'clp'), tone: 'amber' },
      { label: 'Agendas', value: agenda, conversion: share(agenda, base.funnel.qualified), cost: 'CRM', tone: 'gold' },
      { label: 'Ventas', value: ventas, conversion: share(ventas, agenda), cost: metricValue(base.kpis.costPerVenta.value, 'clp'), tone: 'green' },
      { label: 'No-show', value: noShows, conversion: share(noShows, agenda), cost: 'fuga', tone: 'red' },
    ],
    closers: closerRows,
    calls: normalizedCalls,
    geoSplit: buildGeo(closerRows),
    triggers: buildTriggers(normalizedCalls),
    objections: buildObjections(normalizedCalls),
    anatomy: {
      win: ['Diagnóstico temprano', 'Presupuesto calificado', 'Caso concreto', 'Precio conectado a ROI', 'Siguiente paso cerrado'],
      lose: ['Precio al final', 'Poca prueba', 'Método difuso', 'Sin fecha de pago', 'Seguimiento blando'],
    },
    velocity: [
      { label: 'Lead → calificado', value: `${share(base.funnel.qualified, leads)}%`, hint: 'Calidad del tráfico', tone: 'blue' },
      { label: 'Calificado → agenda', value: `${share(agenda, base.funnel.qualified)}%`, hint: 'Eficiencia del sistema', tone: 'gold' },
      { label: 'Agenda → venta', value: `${share(ventas, agenda)}%`, hint: 'Cierre comercial', tone: 'green' },
      { label: 'No-show', value: `${share(noShows, agenda)}%`, hint: 'Pérdida operativa', tone: noShows > 0 ? 'red' : 'green' },
    ],
    ads: base.attribution.byAd,
    generatedAt: base.generatedAt,
    hasFathomData: normalizedCalls.length > 0,
  }
}

function buildTopKpis(base: SalesCockpitData['base']): SalesKpi[] {
  return [
    { label: 'ROAS', value: metricValue(base.kpis.roas.value, 'roas'), delta: trend(base.kpis.roas.previous, base.kpis.roas.value), tone: 'gold', icon: 'roas' },
    { label: 'Leads', value: metricValue(base.kpis.leads.value, 'number'), delta: trend(base.kpis.leads.previous, base.kpis.leads.value), tone: 'blue', icon: 'lead' },
    { label: 'Agendas', value: metricValue(base.kpis.agenda.value, 'number'), delta: trend(base.kpis.agenda.previous, base.kpis.agenda.value), tone: 'cyan', icon: 'calendar' },
    { label: 'No-show', value: metricValue(base.funnel.noShow, 'number'), delta: `${share(base.funnel.noShow, base.funnel.agenda)}% agenda`, tone: base.funnel.noShow > 0 ? 'red' : 'green', icon: 'alert' },
    { label: 'Ventas', value: metricValue(base.kpis.ventas.value, 'number'), delta: trend(base.kpis.ventas.previous, base.kpis.ventas.value), tone: 'green', icon: 'sale' },
    { label: 'Costo x venta', value: metricValue(base.kpis.costPerVenta.value, 'clp'), delta: trend(base.kpis.costPerVenta.previous, base.kpis.costPerVenta.value), tone: 'amber', icon: 'cost' },
  ]
}

function buildOpsKpis(base: SalesCockpitData['base'], calls: CockpitCall[]): OpsKpi[] {
  const avgScore = average(calls.map((call) => call.score).filter((score): score is number => score !== null))
  const avgTalk = average(calls.map((call) => call.talkRatioCloser).filter((ratio): ratio is number => ratio !== null))
  const items: OpsKpi[] = [
    { label: 'Speed to lead', value: 'pendiente', hint: 'Requiere timestamp contacto GHL', tone: 'amber' },
    { label: 'Tasa cierre', value: `${share(base.funnel.ventas, base.funnel.agenda)}%`, hint: 'Ventas / agendas', tone: 'green' },
    { label: 'Tasa no-show', value: `${share(base.funnel.noShow, base.funnel.agenda)}%`, hint: 'No asistió / agenda', tone: base.funnel.noShow > 0 ? 'red' : 'green' },
    { label: 'Score Fathom', value: avgScore === null ? 'sin data' : String(Math.round(avgScore)), hint: 'Promedio últimas llamadas', tone: 'purple' },
    { label: 'Talk ratio', value: avgTalk === null ? 'sin data' : `${Math.round(avgTalk)}%`, hint: 'Habla closer', tone: 'cyan' },
  ]
  const rest = ['Leads calificados', 'Calificados sin agenda', 'Agenda efectiva', 'Follow-up pendiente', 'Ventas Plan A', 'Ventas Plan B', 'Ventas Plan C', 'Ventas Plan C', 'Revenue USD', 'ROAS operativo', 'Costo calificado', 'Costo agenda', 'Costo no-show', 'Llamadas procesadas', 'Objeciones detectadas', 'Gatillos detectados']
  return [...items, ...rest.map((label, index) => ({ label, value: derivedValue(label, base, calls), hint: 'Lectura gerencial', tone: (['blue', 'gold', 'green', 'amber'][index % 4] as OpsKpi['tone']) }))]
}

function derivedValue(label: string, base: SalesCockpitData['base'], calls: CockpitCall[]): string {
  if (label === 'Leads calificados') return metricValue(base.funnel.qualified, 'number')
  if (label === 'Calificados sin agenda') return metricValue(Math.max(0, base.funnel.qualified - base.funnel.agenda), 'number')
  if (label === 'Agenda efectiva') return `${share(base.funnel.agenda - base.funnel.noShow, base.funnel.agenda)}%`
  if (label === 'Revenue USD') return metricValue(base.kpis.revenueUsd.value, 'usd')
  if (label === 'ROAS operativo') return metricValue(base.kpis.roas.value, 'roas')
  if (label === 'Costo calificado') return metricValue(base.kpis.costPerQualified.value, 'clp')
  if (label === 'Costo agenda') return 'CRM'
  if (label === 'Costo no-show') return base.funnel.noShow ? 'alto' : '0'
  if (label === 'Llamadas procesadas') return String(calls.length)
  if (label === 'Objeciones detectadas') return String(new Set(calls.map((call) => call.objectionMain).filter(Boolean)).size)
  if (label === 'Gatillos detectados') return String(new Set(calls.map((call) => call.triggerArrival).filter(Boolean)).size)
  return 'pendiente'
}

// ATENCIÓN: valores SIMULADOS de demostración (no salen del CRM). Reemplázalos por consultas reales antes de mostrarlos.
function buildActionData(leads: number, agenda: number, noShows: number): SalesCockpitData['accionDia'] {
  return {
    leadsSinContacto: Math.max(0, Math.round(leads * 0.08)),
    calientesSinAgenda: Math.max(0, Math.round(Math.max(leads - agenda, 0) * 0.18)),
    agendasSinRecordatorio: Math.max(0, Math.round(noShows * 0.5)),
    topLeads: [
      { name: 'Lead sin contacto', reason: 'Entró por anuncio', urgency: 'alta' },
      { name: 'Agenda de mañana', reason: 'Confirmar asistencia y dolor principal', urgency: 'alta' },
      { name: 'Calificado sin agenda', reason: 'Pidió revisar con calma', urgency: 'media' },
    ],
  }
}

// ATENCIÓN: tendencia SIMULADA a partir de los totales (no es una serie real). Reemplázala por datos semanales reales.
function buildTrend(leads: number, agendas: number, ventas: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const factor = 0.72 + index * 0.035
    return { label: `S${index + 1}`, leads: Math.round(leads * factor), agendas: Math.round(agendas * factor), ventas: Math.round(ventas * factor) }
  })
}

function buildTiers(plans: SalesCockpitData['base']['attribution']['byPlan']): TierDatum[] {
  const data = plans.map((plan) => ({ tier: plan.plan, value: plan.ventas, revenueUsd: plan.revenueUsd }))
  return data.length ? data : ['Plan A', 'Plan B', 'Plan C'].map((tier) => ({ tier, value: 0, revenueUsd: 0 }))
}

function buildPalancas(base: SalesCockpitData['base'], hasCalls: boolean): Palanca[] {
  return [
    { title: 'Reducir no-show antes de tocar pauta', type: 'proceso', description: 'Recordatorio + confirmación humana a agendas críticas.', potential: `${Math.max(base.funnel.noShow, 1)} agendas recuperables` },
    { title: 'Duplicar anuncios que traen calificados', type: 'creativo', description: 'Cruzar anuncios con mejor ratio lead → agenda, no solo CPL.', potential: 'mejor señal' },
    { title: hasCalls ? 'Coachear por patrón ganador' : 'Conectar Fathom para coachear', type: 'equipo', description: 'Comparar ganadas vs perdidas por objeción y manejo de precio.', potential: hasCalls ? 'score visible' : 'pendiente' },
  ]
}

function normalizeCalls(rows: FathomRow[], closers: CloserRow[]): CockpitCall[] {
  const names = new Map(closers.map((closer) => [closer.id, closer.full_name]))
  return rows.map((row) => ({
    id: row.id,
    closerId: row.closer_id,
    closerName: (row.closer_id ? names.get(row.closer_id) : null) ?? 'Sin closer',
    prospectName: row.prospect_name ?? row.prospect_email ?? 'Prospecto',
    prospectEmail: row.prospect_email,
    recordedAt: row.recorded_at,
    durationSeconds: row.duration_seconds,
    score: row.score,
    outcome: row.outcome,
    tierQuoted: row.tier_quoted,
    triggerArrival: row.trigger_arrival,
    triggerOutcome: row.trigger_outcome,
    objectionMain: row.objection_main,
    talkRatioCloser: row.talk_ratio_closer,
    questionsCount: row.questions_count,
    priceMentionedMin: row.price_mentioned_min,
    casesMentioned: row.cases_mentioned,
    silencesCount: row.silences_count,
    aiRecommendation: row.ai_recommendation,
    shareUrl: row.share_url,
  }))
}

function buildClosers(closers: CloserRow[], calls: CockpitCall[]): CloserRankingRow[] {
  return closers.map((closer) => {
    const callsList = calls.filter((call) => call.closerId === closer.id)
    const wins = callsList.filter((call) => call.outcome === 'ganada').length
    const losses = callsList.filter((call) => call.outcome === 'perdida').length
    return {
      id: closer.id,
      name: closer.full_name,
      countryCode: closer.country_code,
      role: closer.role,
      calls: callsList.length,
      wins,
      losses,
      noShows: callsList.filter((call) => call.outcome === 'no-show').length,
      avgScore: average(callsList.map((call) => call.score).filter((score): score is number => score !== null)),
      closeRate: share(wins, callsList.length),
      speedToLeadMin: null,
      callsList,
    }
  })
}

function buildGeo(closers: CloserRankingRow[]): SalesCockpitData['geoSplit'] {
  const mx = closers.filter((closer) => closer.countryCode === 'MX')
  const cl = closers.filter((closer) => closer.countryCode === 'CL')
  return { mx: geoSummary(mx), cl: geoSummary(cl) }
}

function geoSummary(rows: CloserRankingRow[]) {
  const leads = rows.reduce((sum, row) => sum + row.calls, 0)
  const ventas = rows.reduce((sum, row) => sum + row.wins, 0)
  return { leads, ventas, closeRate: share(ventas, leads), revenueUsd: 0 }
}

function buildTriggers(calls: CockpitCall[]): TriggerDatum[] {
  const values = countBy(calls.map((call) => call.triggerArrival).filter((item): item is string => Boolean(item)))
  const total = Math.max(1, Array.from(values.values()).reduce((sum, value) => sum + value, 0))
  const rows = Array.from(values.entries()).map(([label, count]) => ({ label, count, share: Math.round((count / total) * 100) }))
  return rows.length ? rows : DEFAULT_GATILLOS.map((label, index) => ({ label, count: 0, share: [34, 33, 33][index] ?? 0 }))
}

function buildObjections(calls: CockpitCall[]): ObjectionDatum[] {
  const values = countBy(calls.map((call) => call.objectionMain).filter((item): item is string => Boolean(item)))
  const rows = Array.from(values.entries()).map(([label, count]) => ({ label, count, overcomeRate: 0, bestCloser: 'pendiente' }))
  return rows.length ? rows : DEFAULT_OBJECTIONS.map((label) => ({ label, count: 0, overcomeRate: 0, bestCloser: 'pendiente' }))
}

async function getClient(): Promise<ClientRow | null> {
  try {
    const { data } = await serviceClient().from('clients').select('id, fathom_config').eq('slug', 'cliente-ejemplo').maybeSingle<ClientRow>()
    return data ?? null
  } catch {
    return null
  }
}

async function fetchClosers(clientId: string): Promise<CloserRow[]> {
  try {
    const { data } = await serviceClient()
      .from('client_closers')
      .select('id, full_name, country_code, role')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('role', { ascending: false })
    return (data ?? []) as CloserRow[]
  } catch {
    return []
  }
}

async function fetchCalls(clientId: string): Promise<FathomRow[]> {
  try {
    const { data } = await serviceClient()
      .from('fathom_calls')
      .select('id, closer_id, prospect_name, prospect_email, recorded_at, duration_seconds, score, outcome, tier_quoted, trigger_arrival, trigger_outcome, objection_main, talk_ratio_closer, questions_count, price_mentioned_min, cases_mentioned, silences_count, ai_recommendation, share_url')
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false })
      .limit(30)
    return (data ?? []) as FathomRow[]
  } catch {
    return []
  }
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return counts
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function share(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function metricValue(value: number | null, kind: 'number' | 'clp' | 'usd' | 'roas'): string {
  if (value === null) return 'sin data'
  if (kind === 'clp') return `$${Math.round(value).toLocaleString('es-CL')}`
  if (kind === 'usd') return `US$${Math.round(value).toLocaleString('es-CL')}`
  if (kind === 'roas') return `${value.toFixed(1)}x`
  return Math.round(value).toLocaleString('es-CL')
}

function trend(previous: number | null, current: number | null): string {
  if (previous === null || current === null || previous === 0) return 'sin histórico'
  const delta = Math.round(((current - previous) / previous) * 100)
  return `${delta >= 0 ? '+' : ''}${delta}% vs período anterior`
}
