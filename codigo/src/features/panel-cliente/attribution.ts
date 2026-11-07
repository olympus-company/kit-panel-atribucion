// Atribución por anuncio de Cliente Ejemplo: agrupa las oportunidades por el NOMBRE del anuncio
// (utmContent del CRM == ad_name de Meta; el CRM NO trae utmAdId) y arma el funnel real por anuncio —
// leads → calificados → agenda → venta — cruzando el gasto de Meta (por nombre) y el revenue (monetaryValue
// USD de las oportunidades en etapas de venta). Verdad del funnel = CRM. ROAS convierte USD→CLP (×1.000).

import { CLIENTE_CONFIG, USD_TO_CLP, type ClienteStageKind } from './config'
import { normalizeAdName, type ClienteAdCreative } from './meta'
import type {
  ClienteAdQualityRow,
  ClienteAdRow,
  ClienteAttribution,
  ClienteCampaignRow,
  ClientePlanRow,
} from './types'

export type OppForAttribution = {
  stageId: string | undefined
  utmContent?: string
  utmCampaign?: string
  monetaryValue: number // USD
}

const STAGE_KIND = new Map<string, ClienteStageKind>(CLIENTE_CONFIG.ghl.stages.map((s) => [s.id, s.kind]))
const STAGE_PLAN = new Map<string, string>(
  CLIENTE_CONFIG.ghl.stages.filter((s): s is typeof s & { plan: string } => 'plan' in s).map((s) => [s.id, s.plan]),
)

const NO_AD = '(sin anuncio)'
const UNATTRIBUTED_LABEL = 'Sin atribuir (etiqueta perdida)'

function kindOf(stageId: string | undefined): ClienteStageKind | undefined {
  return stageId ? STAGE_KIND.get(stageId) : undefined
}

// Nombre de campaña "presentable": colapsa espacios. Se muestra tal cual y en minúsculas se usa como clave,
// para que la MISMA campaña escrita con distintas mayúsculas ("Campaña (Ej)" vs "campaña (EJ)")
// NO se cuente dos veces. Se muestra la campaña exacta, no solo el país.
function campaignLabel(campaignName: string): string {
  return campaignName.replace(/\s+/g, ' ').trim()
}

export function buildClienteAdBreakdown(
  opps: OppForAttribution[],
  spendByName: Map<string, number>,
  creativesByName: Map<string, ClienteAdCreative>,
): ClienteAttribution {
  const byAd = new Map<string, ClienteAdRow>()
  const byPlan = new Map<string, ClientePlanRow>()
  // Tabla "Calidad de leads por anuncio" del dueño: misma data del funnel pero desagregada por anuncio+país.
  const byAdQuality = new Map<string, ClienteAdQualityRow>()

  for (const opp of opps) {
    const rawName = opp.utmContent?.trim()
    const norm = rawName ? normalizeAdName(rawName) : NO_AD
    const kind = kindOf(opp.stageId)
    const isQualified = kind !== undefined && kind !== 'descarte'
    const isNotQualified = kind === 'descarte'
    const isAgenda = kind === 'agenda' || kind === 'noshow' || kind === 'venta'
    const isVenta = kind === 'venta'

    // Fila por anuncio+campaña (los "Sin atribuir" colapsan en una sola fila con campaña '—').
    const label = campaignLabel(opp.utmCampaign ?? '')
    const campaign = norm === NO_AD ? '—' : label || 'Sin campaña'
    const qKey = `${norm}¦${campaign.toLowerCase()}`
    const qRow =
      byAdQuality.get(qKey) ??
      ({
        adName: norm === NO_AD ? UNATTRIBUTED_LABEL : rawName ?? norm,
        campaign,
        leads: 0,
        qualified: 0,
        notQualified: 0,
        ventas: 0,
      } satisfies ClienteAdQualityRow)
    qRow.leads++
    if (isQualified) qRow.qualified++
    if (isNotQualified) qRow.notQualified++
    if (isVenta) qRow.ventas++
    byAdQuality.set(qKey, qRow)

    const creative = creativesByName.get(norm)
    const row =
      byAd.get(norm) ??
      ({
        adName: creative?.name ?? rawName ?? (norm === NO_AD ? 'Sin atribuir (etiqueta perdida)' : rawName ?? norm),
        campaignName: opp.utmCampaign ?? '',
        leads: 0,
        notQualified: 0,
        qualified: 0,
        agenda: 0,
        ventas: 0,
        revenueUsd: 0,
        spend: 0,
        costPerLead: null,
        costPerQualified: null,
        costPerVenta: null,
        roas: null,
        postUrl: creative?.postUrl ?? null,
        activo: creative?.activo ?? null,
      } satisfies ClienteAdRow)

    row.leads++
    if (isNotQualified) row.notQualified++
    if (isQualified) row.qualified++
    if (isAgenda) row.agenda++
    if (isVenta) {
      row.ventas++
      row.revenueUsd += opp.monetaryValue
      const plan = opp.stageId ? STAGE_PLAN.get(opp.stageId) : undefined
      if (plan) {
        const p = byPlan.get(plan) ?? ({ plan, ventas: 0, revenueUsd: 0 } satisfies ClientePlanRow)
        p.ventas++
        p.revenueUsd += opp.monetaryValue
        byPlan.set(plan, p)
      }
    }
    if (!row.campaignName && opp.utmCampaign) row.campaignName = opp.utmCampaign
    byAd.set(norm, row)
  }

  // Anuncios que gastaron pero no trajeron leads atribuidos (desperdicio visible) → fila con leads 0.
  for (const [norm, spend] of spendByName) {
    if (spend <= 0 || byAd.has(norm)) continue
    const creative = creativesByName.get(norm)
    byAd.set(norm, {
      adName: creative?.name ?? norm,
      campaignName: '',
      leads: 0,
      notQualified: 0,
      qualified: 0,
      agenda: 0,
      ventas: 0,
      revenueUsd: 0,
      spend: 0,
      costPerLead: null,
      costPerQualified: null,
      costPerVenta: null,
      roas: null,
      postUrl: creative?.postUrl ?? null,
        activo: creative?.activo ?? null,
    })
  }

  // Merge de gasto + costos por acción + ROAS (revenue USD → CLP).
  for (const [norm, row] of byAd) {
    row.spend = spendByName.get(norm) ?? 0
    row.costPerLead = row.leads > 0 && row.spend > 0 ? row.spend / row.leads : null
    row.costPerQualified = row.qualified > 0 && row.spend > 0 ? row.spend / row.qualified : null
    row.costPerVenta = row.ventas > 0 && row.spend > 0 ? row.spend / row.ventas : null
    row.roas = row.spend > 0 ? (row.revenueUsd * USD_TO_CLP) / row.spend : null
  }

  // Desglose por campaña.
  const byCampaign = new Map<string, ClienteCampaignRow>()
  for (const row of byAd.values()) {
    const name = row.campaignName || '(sin campaña)'
    const c =
      byCampaign.get(name) ??
      ({ campaignName: name, leads: 0, qualified: 0, agenda: 0, ventas: 0, revenueUsd: 0, spend: 0, roas: null } satisfies ClienteCampaignRow)
    c.leads += row.leads
    c.qualified += row.qualified
    c.agenda += row.agenda
    c.ventas += row.ventas
    c.revenueUsd += row.revenueUsd
    c.spend += row.spend
    byCampaign.set(name, c)
  }
  for (const c of byCampaign.values()) {
    c.roas = c.spend > 0 ? (c.revenueUsd * USD_TO_CLP) / c.spend : null
  }

  let totalSpend = 0
  for (const s of spendByName.values()) totalSpend += s

  const bySpendThenLeads = <T extends { spend: number; leads: number }>(arr: T[]) =>
    arr.sort((a, b) => b.spend - a.spend || b.leads - a.leads)

  return {
    totalSpend,
    byAd: bySpendThenLeads([...byAd.values()]),
    byCampaign: bySpendThenLeads([...byCampaign.values()]),
    byPlan: [...byPlan.values()].sort((a, b) => b.revenueUsd - a.revenueUsd),
    byAdQuality: [...byAdQuality.values()].sort((a, b) => b.leads - a.leads),
    metaResolved: creativesByName.size > 0,
    spendResolved: spendByName.size > 0,
  }
}
