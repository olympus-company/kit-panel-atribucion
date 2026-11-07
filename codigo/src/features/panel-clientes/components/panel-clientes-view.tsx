import type { CSSProperties } from 'react'
import type { MetricValue, PanelAdLead, PanelCampaignLead, PanelData } from '../types'
import { PANEL_RANGE_OPTIONS } from '../data/date-range'
import { RangeSelector } from './range-selector'
import styles from './panel-clientes-view.module.css'

type KpiTone = 'good' | 'warn' | 'crit' | 'mut'

type Kpi = {
  label: string
  metric: MetricValue
  formatter?: (value: number) => string
  tone?: KpiTone
  hint?: string
}

export function PanelClientesView({ data }: { data: PanelData }) {
  const m = data.metrics
  const L = data.client.labels
  const totalService = value(m.servicioA) + value(m.servicioB)
  const servicioAPct = totalService > 0 ? (value(m.servicioA) / totalService) * 100 : 50
  const generated = formatDate(data.generatedAt)
  const adMax = Math.max(...data.adLeads.ads.map((ad) => ad.conversations), 0)
  const campaignMax = Math.max(...data.campaignLeads.map((campaign) => campaign.conversations), 0)

  return (
    <main className={styles.panel}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.mark}>{data.client.initials}</div>
            <div>
              <h1 className={styles.title}>{data.client.nombre} · Panel de decisiones</h1>
              <div className={styles.sub}>{data.client.rubro} · tablero vivo para el CRM</div>
            </div>
          </div>
          <div className={styles.metaRight}>
            <span className={styles.chip}><span className={styles.dot} />Datos reales · {generated}</span>
            <div style={{ marginTop: 7 }}>Pipeline vivo · {displayNumber(data.pipelineTotal)} oportunidades · {displayNumber(data.totalContacts)} contactos</div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <RangeSelector active={data.range.key} options={PANEL_RANGE_OPTIONS} from={data.range.from} to={data.range.to} />
          <span className={styles.rangeHint}>Todo el tablero refleja el rango elegido · el CRM cuenta los leads que llegaron en ese período (elige "Período completo" para ver toda la cartera)</span>
        </div>

        <div className={styles.banner}>
          <span>▸</span>
          <div>
            <strong>Qué estás viendo:</strong> el tablero de {data.client.nombre} con datos en vivo del CRM y Meta Ads. Si una fuente falla, ese bloque queda en <strong>—</strong> y el resto sigue cargando.
          </div>
        </div>

        <Section title={`Captación & calidad de leads · ${data.range.label.toLowerCase()}`} />
        <div className={`${styles.grid} ${styles.g5}`}>
          <KpiCard label="Leads en el pipeline" metric={m.leads} tone="mut" hint="oportunidades activas" />
          <KpiCard label="Calificados" metric={m.calificados} tone="good" hint={`${rate(m.calificados, m.leads)} de los leads`} />
          <KpiCard label="Agendaron reunión" metric={m.agendados} tone="warn" hint={`${rate(m.agendados, m.calificados)} de calificados`} />
          <KpiCard label="En seguimiento (rescate activo)" metric={m.seguimiento} tone="mut" hint="bot reenganchando" />
          <KpiCard label="Concretaron (reunión / pago)" metric={m.concretados} tone="crit" hint="cuello a vigilar" />
        </div>

        <Section title="Embudo y tipo de servicio" />
        <div className={`${styles.grid} ${styles.g2}`}>
          <div className={styles.card}>
            <div className={styles.sub} style={{ marginBottom: 14 }}>Recorrido del lead — dónde se cae la gente · {data.range.label.toLowerCase()}</div>
            <div className={styles.funnel}>
              <FunnelRow label="Leads llegados" metric={m.leads} max={value(m.leads)} />
              <FunnelRow label="Calificados" metric={m.calificados} max={value(m.leads)} />
              <FunnelRow label="Agendaron" metric={m.agendados} max={value(m.leads)} />
              <FunnelRow label="En seguimiento" metric={m.seguimiento} max={value(m.leads)} />
              <FunnelRow label="Concretaron" metric={m.concretados} max={value(m.leads)} minWidth={2} />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.sub} style={{ marginBottom: 14 }}>{L.title}</div>
            <div className={styles.donutWrap}>
              <div className={styles.donut} style={{ '--servicioA-slice': `${servicioAPct}%` } as CSSProperties}>
                <div className={styles.donutCenter}>
                  <strong>{totalService || '—'}</strong>
                  <span>con servicio</span>
                </div>
              </div>
              <div className={styles.legend}>
                <LegendRow title={L.primary.label} detail={`${Math.round(servicioAPct)}% del mix${L.primary.detail ? ` · ${L.primary.detail}` : ''}`} metric={m.servicioA} color="servicioA" />
                <LegendRow title={L.secondary.label} detail={`${Math.round(100 - servicioAPct)}% del mix${L.secondary.detail ? ` · ${L.secondary.detail}` : ''}`} metric={m.servicioB} color="servicioB" />
              </div>
            </div>
          </div>
        </div>

        <Section title={`Métricas de Meta · "${L.metaAccountName}" · ${data.range.label.toLowerCase()}`} />
        <div className={`${styles.grid} ${styles.g5}`}>
          <KpiCard label="Invertido en Meta" metric={m.metaSpend} formatter={formatClp} tone="good" hint="cuenta activa" />
          <KpiCard label="Conversaciones iniciadas (leads)" metric={m.metaConversations} tone="mut" hint="CTWA · WhatsApp" />
          <KpiCard label="Costo por conversación" metric={m.metaCpl} formatter={formatClp} tone="good" hint="eficiente" />
          <KpiCard label="CTR (qué tan atractivo)" metric={m.metaCtr} formatter={formatPercentValue} tone="good" hint="sano" />
          <KpiCard label="Alcance" metric={m.metaReach} tone="mut" hint={`frecuencia ${displayMetric(data.metaFrequency, formatDecimal)}`} />
        </div>

        <div className={styles.adsCard}>
          <div className={styles.adsHeader}>
            <div>
              <h3>Campañas que traen leads</h3>
              <p>Resumen por campaña · costos recalculados con gasto total · ordenado por calificados</p>
            </div>
            {data.adLeads.status !== 'ok' ? <span className={styles.lockFlagStatic}>{data.adLeads.status === 'missing-token' ? 'SIN TOKEN' : 'ERROR'}</span> : null}
          </div>
          {data.adLeads.status !== 'ok' ? (
            <div className={styles.emptyState}>—</div>
          ) : data.campaignLeads.length ? (
            <div className={styles.adsList}>
              {data.campaignLeads.map((campaign, index) => (
                <CampaignRow key={`${campaign.campaignName}-${index}`} campaign={campaign} max={campaignMax} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Sin campañas con conversaciones en este rango.</div>
          )}
        </div>

        <div className={styles.adsCard}>
          <div className={styles.adsHeader}>
            <div>
              <h3>Anuncios que traen leads</h3>
              <p>Top anuncios por conversaciones iniciadas · funnel por etapa actual · {data.range.label.toLowerCase()}</p>
            </div>
            {data.adLeads.status !== 'ok' ? <span className={styles.lockFlagStatic}>{data.adLeads.status === 'missing-token' ? 'SIN TOKEN' : 'ERROR'}</span> : null}
          </div>
          {data.adLeads.status !== 'ok' ? (
            <div className={styles.emptyState}>—</div>
          ) : data.adLeads.ads.length ? (
            <div className={styles.adsList}>
              {data.adLeads.ads.map((ad, index) => (
                <AdRow key={`${ad.adId || ad.adName}-${index}`} ad={ad} max={adMax} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Sin anuncios con conversaciones en este rango.</div>
          )}
        </div>

        <footer className={styles.footer}>
          <div><strong>Fuentes:</strong> CRM de GoHighLevel para pipeline, tags y contactos; Meta Ads API para gasto, conversaciones, CPL, CTR y alcance.</div>
          <div style={{ marginTop: 6 }}><strong>Uso:</strong> esta vista queda lista para embeberse como pestaña dentro del CRM de {data.client.nombre} en tu-app.example/panel/{data.client.slug}.</div>
          <div className={styles.legendNote}>
            <span><span className={styles.swatch} style={{ background: 'var(--pc-good)' }} />saludable</span>
            <span><span className={styles.swatch} style={{ background: 'var(--pc-warn)' }} />a vigilar</span>
            <span><span className={styles.swatch} style={{ background: 'var(--pc-crit)' }} />cuello de botella</span>
          </div>
        </footer>
      </div>
    </main>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionBar} />
      <h2 className={styles.sectionTitle}>{title}</h2>
      <span className={styles.rule} />
    </div>
  )
}

function KpiCard({ label, metric, formatter = formatNumber, tone = 'mut', hint }: Kpi) {
  const locked = metric.status !== 'ok'
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      {locked ? <span className={styles.lockFlag}>{metric.status === 'missing-token' ? 'SIN TOKEN' : 'ERROR'}</span> : null}
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{displayMetric(metric, formatter)}</div>
      <div className={styles.foot}>
        <span className={`${styles.pill} ${styles[tone]}`}>{trendLabel(metric)}</span>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  )
}

function FunnelRow({ label, metric, max, minWidth = 0 }: { label: string; metric: MetricValue; max: number; minWidth?: number }) {
  const width = max > 0 ? Math.max(minWidth, (value(metric) / max) * 100) : 0
  return (
    <div className={styles.frow}>
      <span className={styles.fLabel}>{label}</span>
      <span className={styles.track}><span className={styles.fill} style={{ width: `${width}%` }} /></span>
      <span className={styles.fNumber}>{displayPlain(metric)}</span>
    </div>
  )
}

function LegendRow({ title, detail, metric, color }: { title: string; detail: string; metric: MetricValue; color: 'servicioA' | 'servicioB' }) {
  const cssColor = color === 'servicioA' ? 'var(--pc-servicioA)' : 'var(--pc-servicioB)'
  return (
    <div className={styles.legendRow}>
      <span className={styles.swatch} style={{ background: cssColor }} />
      <div>
        <div className={styles.legendTitle}>{title}</div>
        <div className={styles.legendDetail}>{detail} · total</div>
      </div>
      <span className={styles.legendNumber}>{displayPlain(metric)}</span>
    </div>
  )
}

function CampaignRow({ campaign, max, rank }: { campaign: PanelCampaignLead; max: number; rank: number }) {
  const width = max > 0 ? Math.max(6, (campaign.conversations / max) * 100) : 0
  const funnel = campaign.funnel
  return (
    <div className={styles.adRow}>
      <div className={styles.adRank}>{rank}</div>
      <div className={styles.adMain}>
        <div className={styles.adTitle}>{campaign.campaignName}</div>
        <div className={styles.adSub}>Resumen de campaña</div>
        <div className={styles.adTrack}><span style={{ width: `${width}%` }} /></div>
      </div>
      <div className={styles.adStats}>
        <strong>{formatNumber(campaign.conversations)}</strong>
        <span>conv.</span>
      </div>
      <div className={styles.adMoney}>
        <strong>{campaign.cpl === null ? '—' : formatClp(campaign.cpl)}</strong>
        <span>{formatClp(campaign.spend)}</span>
      </div>
      <div className={styles.adFunnel}>
        <FunnelChip label="Calif" count={funnel?.qualified ?? null} cost={funnel?.costPerQualified ?? null} />
        <FunnelChip label="Agenda" count={funnel?.scheduled ?? null} cost={funnel?.costPerScheduled ?? null} />
        <FunnelChip label="Pagó" count={funnel?.paid ?? null} cost={funnel?.costPerPaid ?? null} />
      </div>
    </div>
  )
}

function AdRow({ ad, max, rank }: { ad: PanelAdLead; max: number; rank: number }) {
  const width = max > 0 ? Math.max(6, (ad.conversations / max) * 100) : 0
  const funnel = ad.funnel
  return (
    <div className={styles.adRow}>
      <div className={styles.adRank}>{rank}</div>
      <div className={styles.adMain}>
        <div className={styles.adTitle}>{ad.adName}</div>
        <div className={styles.adSub}>{ad.campaignName}{ad.adsetName ? ` · ${ad.adsetName}` : ''}</div>
        <div className={styles.adTrack}><span style={{ width: `${width}%` }} /></div>
      </div>
      <div className={styles.adStats}>
        <strong>{formatNumber(ad.conversations)}</strong>
        <span>conv.</span>
      </div>
      <div className={styles.adMoney}>
        <strong>{ad.cpl === null ? '—' : formatClp(ad.cpl)}</strong>
        <span>{formatClp(ad.spend)}</span>
      </div>
      <div className={styles.adFunnel}>
        <FunnelChip label="Calif" count={funnel?.qualified ?? null} cost={funnel?.costPerQualified ?? null} />
        <FunnelChip label="Agenda" count={funnel?.scheduled ?? null} cost={funnel?.costPerScheduled ?? null} />
        <FunnelChip label="Pagó" count={funnel?.paid ?? null} cost={funnel?.costPerPaid ?? null} />
      </div>
    </div>
  )
}

function FunnelChip({ label, count, cost }: { label: string; count: number | null; cost: number | null }) {
  return (
    <span className={styles.adFunnelItem}>
      {label}: <strong>{count === null ? '—' : formatNumber(count)}</strong> <em>({cost === null ? '—' : formatClp(cost)})</em>
    </span>
  )
}

function trendLabel(metric: MetricValue): string {
  if (metric.status !== 'ok') return 'sin dato'
  const current = metric.trendValue ?? metric.value
  if (current === null || metric.previous === null) return 'sin dato'
  if (metric.previous === 0 && current > 0) return '↑ nuevo'
  if (metric.previous === 0) return '→ estable'
  const diff = ((current - metric.previous) / Math.abs(metric.previous)) * 100
  if (Math.abs(diff) < 1) return '→ estable'
  return `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(0)}% vs anterior`
}

function rate(part: MetricValue, total: MetricValue): string {
  const numerator = value(part)
  const denominator = value(total)
  if (!denominator) return '—'
  return `${Math.round((numerator / denominator) * 100)}%`
}

function value(metric: MetricValue): number {
  return metric.value ?? 0
}

function displayPlain(metric: MetricValue): string {
  return displayMetric(metric, formatNumber)
}

function displayMetric(metric: MetricValue, formatter: (value: number) => string): string {
  return metric.value === null ? '—' : formatter(metric.value)
}

function displayNumber(valueToFormat: number | null): string {
  return valueToFormat === null ? '—' : formatNumber(valueToFormat)
}

function formatNumber(valueToFormat: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valueToFormat)
}

function formatClp(valueToFormat: number): string {
  return `CL$${formatNumber(Math.round(valueToFormat))}`
}

function formatPercentValue(valueToFormat: number): string {
  return `${valueToFormat.toFixed(2).replace('.', ',')}%`
}

function formatDecimal(valueToFormat: number): string {
  return valueToFormat.toFixed(1).replace('.', ',')
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
