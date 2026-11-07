import type { PanelAdFunnel, PanelAdLead, PanelCampaignLead, PanelClientConfig, PanelStageKey } from '../types'
import type { CtwaAttribution } from './attribution'
import type { GhlLeadStage } from './ghl'

const STAGE_RANK: Record<PanelStageKey, number> = {
  noCalifica: 0,
  calificado: 1,
  futura: 1,
  seguimiento: 2,
  noShow: 2,
  agendado: 3,
  concretado: 4,
}

const QUALIFIED_STAGES = new Set<PanelStageKey>(['calificado', 'agendado', 'noShow', 'concretado', 'seguimiento'])
const SCHEDULED_STAGES = new Set<PanelStageKey>(['agendado', 'concretado'])

export function enrichAdLeadsWithFunnel(
  ads: PanelAdLead[],
  attributions: CtwaAttribution[],
  crmLeads: GhlLeadStage[],
  client: PanelClientConfig,
): PanelAdLead[] {
  return ads.map((ad) => {
    const phones = uniquePhones(attributions.filter((row) => row.sourceId === ad.adId).map((row) => row.phone))
    const funnel = buildFunnel(ad.spend, phones, crmLeads, client.ghl.tags.calificado)
    return { ...ad, funnel }
  })
}

export function groupAdLeadsByCampaign(ads: PanelAdLead[]): PanelCampaignLead[] {
  const byCampaign = new Map<string, PanelCampaignLead>()

  for (const ad of ads) {
    const campaignName = ad.campaignName || 'Campaña sin nombre'
    const current = byCampaign.get(campaignName) ?? {
      campaignName,
      spend: 0,
      conversations: 0,
      cpl: null,
      funnel: emptyFunnel(),
    }
    current.spend += ad.spend
    current.conversations += ad.conversations
    if (current.funnel && ad.funnel) {
      current.funnel.qualified += ad.funnel.qualified
      current.funnel.scheduled += ad.funnel.scheduled
      current.funnel.paid += ad.funnel.paid
    } else {
      current.funnel = null
    }
    byCampaign.set(campaignName, current)
  }

  return [...byCampaign.values()]
    .map((campaign) => recalculateCampaignCosts(campaign))
    .sort((a, b) => (b.funnel?.qualified ?? 0) - (a.funnel?.qualified ?? 0) || b.conversations - a.conversations)
}

function buildFunnel(spend: number, phones: string[], crmLeads: GhlLeadStage[], qualifiedTag: string): PanelAdFunnel {
  let qualified = 0
  let scheduled = 0
  let paid = 0

  for (const phone of phones) {
    const lead = bestLeadMatch(phone, crmLeads)
    if (!lead) continue
    const isQualifiedByTag = hasTag(lead.tags, qualifiedTag)
    if (isQualifiedByTag || (lead.stageKey !== null && QUALIFIED_STAGES.has(lead.stageKey))) qualified += 1
    if (lead.stageKey !== null && SCHEDULED_STAGES.has(lead.stageKey)) scheduled += 1
    if (lead.stageKey === 'concretado') paid += 1
  }

  return {
    qualified,
    scheduled,
    paid,
    costPerQualified: costPer(spend, qualified),
    costPerScheduled: costPer(spend, scheduled),
    costPerPaid: costPer(spend, paid),
  }
}

function bestLeadMatch(phone: string, crmLeads: GhlLeadStage[]): GhlLeadStage | null {
  const matches = crmLeads.filter((lead) => phonesMatch(phone, lead.phone))
  if (matches.length === 0) return null
  return matches.sort((a, b) => stageRank(b.stageKey) - stageRank(a.stageKey))[0] ?? null
}

function phonesMatch(left: string, right: string): boolean {
  const leftDigits = digits(left)
  const rightDigits = digits(right)
  if (leftDigits.length < 7 || rightDigits.length < 7) return false
  const suffixLength = Math.min(leftDigits.length, rightDigits.length, 9)
  return leftDigits.slice(-suffixLength) === rightDigits.slice(-suffixLength)
}

function uniquePhones(phones: string[]): string[] {
  const bySuffix = new Map<string, string>()
  for (const phone of phones) {
    const normalized = digits(phone)
    if (normalized.length < 7) continue
    bySuffix.set(normalized.slice(-9), phone)
  }
  return [...bySuffix.values()]
}

function hasTag(tags: string[], expected: string): boolean {
  const normalizedExpected = normalizeTag(expected)
  return tags.some((tag) => normalizeTag(tag) === normalizedExpected)
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

function stageRank(stageKey: PanelStageKey | null): number {
  return stageKey ? STAGE_RANK[stageKey] : -1
}

function costPer(spend: number, conversions: number): number | null {
  return conversions > 0 ? spend / conversions : null
}

function emptyFunnel(): PanelAdFunnel {
  return {
    qualified: 0,
    scheduled: 0,
    paid: 0,
    costPerQualified: null,
    costPerScheduled: null,
    costPerPaid: null,
  }
}

function recalculateCampaignCosts(campaign: PanelCampaignLead): PanelCampaignLead {
  return {
    ...campaign,
    cpl: costPer(campaign.spend, campaign.conversations),
    funnel: campaign.funnel
      ? {
          qualified: campaign.funnel.qualified,
          scheduled: campaign.funnel.scheduled,
          paid: campaign.funnel.paid,
          costPerQualified: costPer(campaign.spend, campaign.funnel.qualified),
          costPerScheduled: costPer(campaign.spend, campaign.funnel.scheduled),
          costPerPaid: costPer(campaign.spend, campaign.funnel.paid),
        }
      : null,
  }
}
