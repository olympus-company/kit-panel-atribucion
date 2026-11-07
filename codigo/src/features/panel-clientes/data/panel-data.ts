import type { MetricValue, PanelAdLeads, PanelClientConfig, PanelData, PanelRange } from '../types'
import { enrichAdLeadsWithFunnel, groupAdLeadsByCampaign } from './ad-funnel'
import { fetchCtwaAttribution } from './attribution'
import { fetchGhlContactTotal, fetchGhlLeadStages, fetchGhlStages, fetchGhlTag } from './ghl'
import { fetchAdLeadInsights, fetchMetaMetrics, type MetaMetrics } from './meta'

const ERROR_METRIC: MetricValue = { value: null, previous: null, status: 'error' }

export async function getPanelData(client: PanelClientConfig, range: PanelRange): Promise<PanelData> {
  const [stages, servicioB, servicioA, meta, adLeads, totalContacts] = await Promise.all([
    fetchGhlStages(client, range).catch(() => null),
    fetchGhlTag(client, client.ghl.tags.servicioB, range).catch(() => null),
    fetchGhlTag(client, client.ghl.tags.servicioA, range).catch(() => null),
    fetchMetaMetrics(client, range).catch(() => errorMetaMetrics()),
    fetchAdLeadInsights(client, range).catch((): PanelAdLeads => ({ status: 'error', funnelStatus: 'unavailable', ads: [] })),
    fetchGhlContactTotal(client).catch(() => null),
  ])
  const enrichedAdLeads = await enrichAdLeads(client, range, adLeads)

  return {
    client,
    generatedAt: new Date(),
    range,
    totalContacts,
    pipelineTotal: stages?.total ?? null,
    metrics: {
      // Embudo + calidad = COHORTE POR LLEGADA en el rango elegido: leads que ENTRARON en la ventana y su etapa
      // actual. Decisión de producto: "Últimos 7 días" debe significar lo que llegó en 7 días para que
      // calce con el gasto de Meta del mismo período. "Período completo" = ventana ancha → cuenta toda la cartera
      // (y sin comparación "vs anterior", que no aplica). El total histórico también vive en el header ("Pipeline
      // vivo · N oportunidades"). El donut servicioB/servicioA sigue siendo histórico (rotulado "· total").
      leads: stages ? rangeMetric(range, stages.currentTotal, stages.previousTotal) : ERROR_METRIC,
      calificados: stages ? rangeMetric(range, stages.currentByStage.calificado, stages.previousByStage.calificado) : ERROR_METRIC,
      agendados: stages ? rangeMetric(range, stages.currentByStage.agendado, stages.previousByStage.agendado) : ERROR_METRIC,
      seguimiento: stages ? rangeMetric(range, stages.currentByStage.seguimiento, stages.previousByStage.seguimiento) : ERROR_METRIC,
      concretados: stages ? rangeMetric(range, stages.currentByStage.concretado, stages.previousByStage.concretado) : ERROR_METRIC,
      servicioB: servicioB ? totalMetric(servicioB.total) : ERROR_METRIC,
      servicioA: servicioA ? totalMetric(servicioA.total) : ERROR_METRIC,
      metaSpend: meta.spend,
      metaConversations: meta.conversations,
      metaCpl: meta.cpl,
      metaCtr: meta.ctr,
      metaReach: meta.reach,
    },
    metaFrequency: meta.frequency,
    adLeads: enrichedAdLeads,
    campaignLeads: groupAdLeadsByCampaign(enrichedAdLeads.ads),
  }
}

async function enrichAdLeads(client: PanelClientConfig, range: PanelRange, adLeads: PanelAdLeads): Promise<PanelAdLeads> {
  if (adLeads.status !== 'ok' || adLeads.ads.length === 0) return adLeads
  try {
    const adIds = adLeads.ads.map((ad) => ad.adId)
    const [attributions, crmLeads] = await Promise.all([
      fetchCtwaAttribution(client, range, adIds),
      fetchGhlLeadStages(client),
    ])
    return {
      ...adLeads,
      funnelStatus: 'ok',
      ads: enrichAdLeadsWithFunnel(adLeads.ads, attributions, crmLeads, client),
    }
  } catch {
    return { ...adLeads, funnelStatus: 'unavailable' }
  }
}

function totalMetric(value: number): MetricValue {
  return { value, previous: null, trendValue: null, status: 'ok' }
}

function rangeMetric(range: PanelRange, current: number, previous: number): MetricValue {
  // "Período completo" no tiene un "período anterior" con sentido → sin comparación (el trend queda "sin dato").
  const comparable = range.key === 'completo' ? null : previous
  return { value: current, previous: comparable, trendValue: current, status: 'ok' }
}

function errorMetaMetrics(): MetaMetrics {
  return {
    spend: ERROR_METRIC,
    conversations: ERROR_METRIC,
    cpl: ERROR_METRIC,
    ctr: ERROR_METRIC,
    reach: ERROR_METRIC,
    frequency: ERROR_METRIC,
  }
}
