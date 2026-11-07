import type { MetricValue, PanelRangeOption } from '@/features/panel-clientes/types'
import { EstadoPill } from '@/shared/components/estado-meta'
import { PANEL_RANGE_OPTIONS } from '@/features/panel-clientes/data/date-range'
import { RangeSelector } from '@/features/panel-clientes/components/range-selector'
import type { ClienteAdRow, ClienteFunnelStage, ClientePanelData, ClientePlanRow, SourceStatus } from './types'
import { LeadQualityTable } from './lead-quality-table'
import styles from './panel-cliente-view.module.css'

// Se incluye "Período completo": el ciclo de venta es largo y las ventas son dispersas, así que la foto histórica es la vista útil por defecto.
const RANGE_OPTIONS: PanelRangeOption[] = PANEL_RANGE_OPTIONS

export function PanelClienteView({ data }: { data: ClientePanelData }) {
  const maxStageCount = Math.max(...data.funnel.stages.map((stage) => stage.count), 1)
  const maxAdSpend = Math.max(...data.attribution.byAd.map((ad) => ad.spend), 1)

  return (
    <main className={styles.panel}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.mark}>CE</div>
            <div>
              <h1>Cliente Ejemplo</h1>
              <p>Panel vivo comercial · Cliente Ejemplo · Meta + CRM</p>
            </div>
          </div>
          <div className={styles.powered}>
            <span>Powered by Olympus</span>
            <strong>{formatDate(data.generatedAt)}</strong>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.rangeBlock}>
            <RangeSelector active={data.range.key} options={RANGE_OPTIONS} from={data.range.from} to={data.range.to} />
            <span className={styles.rangeDates}>
              Datos del {formatDay(data.range.currentSince)} al {formatDay(inclusiveEnd(data.range.currentUntil))}
            </span>
          </div>
          <div className={styles.status}>
            <StatusPill label="Meta" status={data.sourceStatus.meta} />
            <StatusPill label="GHL" status={data.sourceStatus.ghl} />
          </div>
        </div>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>{data.range.label}</span>
            <h2>Inversión, calificación, agendas y ventas reales del embudo de Cliente Ejemplo.</h2>
          </div>
          <div className={styles.heroMetric}>
            <span>ROAS (1 USD = 1.000 CLP)</span>
            <strong>{displayMetric(data.kpis.roas, formatRoas)}</strong>
          </div>
        </section>

        <section className={styles.kpiGrid}>
          <KpiCard label="Inversión" metric={data.kpis.spend} formatter={formatClp} tone="gold" />
          <KpiCard label="Leads" metric={data.kpis.leads} tone="purple" />
          <KpiCard label="Calificados" metric={data.kpis.qualified} tone="purple" />
          <KpiCard label="Agendas" metric={data.kpis.agenda} tone="green" />
          <KpiCard label="Ventas" metric={data.kpis.ventas} tone="gold" />
          <KpiCard label="Revenue (USD)" metric={data.kpis.revenueUsd} formatter={formatUsd} tone="gold" />
          <KpiCard label="Costo x lead" metric={data.kpis.costPerLead} formatter={formatClp} tone="green" />
          <KpiCard label="Costo x calificado" metric={data.kpis.costPerQualified} formatter={formatClp} tone="green" />
          <KpiCard label="Costo x venta" metric={data.kpis.costPerVenta} formatter={formatClp} tone="green" />
          <KpiCard label="ROAS" metric={data.kpis.roas} formatter={formatRoas} tone="gold" />
        </section>

        <section className={styles.card}>
          <SectionTitle title="Embudo del rango" subtitle="Oportunidades creadas en el período, por etapa del pipeline HR Funnel" />
          <div className={styles.summaryGrid}>
            <SummaryStat label="Leads" value={data.funnel.total} />
            <SummaryStat label="Calificados" value={data.funnel.qualified} />
            <SummaryStat label="Agendaron" value={data.funnel.agenda} />
            <SummaryStat label="Ventas" value={data.funnel.ventas} />
          </div>
          <StageList stages={data.funnel.stages} max={maxStageCount} />
        </section>

        {data.attribution.byPlan.length ? (
          <section className={styles.card}>
            <SectionTitle title="Ventas por plan" subtitle="Cierres marcados en el CRM (por etapa de acceso al plan) + revenue en USD" />
            <div className={styles.planGrid}>
              {data.attribution.byPlan.map((plan) => (
                <PlanCard key={plan.plan} plan={plan} />
              ))}
            </div>
          </section>
        ) : null}

        {data.attribution.byAd.length ? (
          <>
            <section className={styles.card}>
              <SectionTitle
                title="De qué anuncio llegó cada lead"
                subtitle="Funnel real por anuncio (CRM, cruzado por nombre) + gasto Meta · abre Ver anuncio para la publicación pública con comentarios"
              />
              <div className={styles.adGrid}>
                {data.attribution.byAd.map((ad) => (
                  <ClienteAdCard key={ad.adName} ad={ad} maxSpend={maxAdSpend} />
                ))}
              </div>
              <p className={styles.adNote}>
                Atribución tomada del CRM (nombre del anuncio de origen de cada lead), independiente de la ventana de Meta. Revenue
                y ROAS convierten los planes de USD a CLP con la convención del dueño (1 USD = 1.000 CLP). Nota: la venta se marca
                moviendo la tarjeta a la etapa del plan; el no-show sale de la etapa "No asistió" (hoy sub-registrada en el CRM).
              </p>
            </section>
            <LeadQualitySection ads={data.attribution.byAd} />
            <LeadQualityTable rows={data.attribution.byAdQuality} />
          </>
        ) : null}

        <footer className={styles.footer}>
          <strong>Powered by Olympus</strong>
          <span>Meta Ads API + GHL/Sharp en lectura solamente. Ruta pública gateada por secreto y noindex.</span>
        </footer>
      </div>
    </main>
  )
}

function LeadQualitySection({ ads }: { ads: ClienteAdRow[] }) {
  const notQualifiedRows = leadQualityRows(ads, 'notQualified')
  const qualifiedRows = leadQualityRows(ads, 'qualified')
  if (!notQualifiedRows.length && !qualifiedRows.length) return null
  return (
    <section className={styles.card}>
      <SectionTitle title="Calidad de leads por anuncio" subtitle="Qué anuncios traen calificados vs no calificados — % del total de cada tipo" />
      <div className={styles.qualityGrid}>
        {notQualifiedRows.length ? <LeadQualityColumn title="No calificados por anuncio" rows={notQualifiedRows} tone="bad" /> : null}
        {qualifiedRows.length ? <LeadQualityColumn title="Calificados por anuncio" rows={qualifiedRows} tone="good" /> : null}
      </div>
    </section>
  )
}

type LeadQualityRow = { adName: string; count: number; percent: number }

// Ranking de calidad SOLO por anuncios reales: se excluye la fila "Sin atribuir" (etiqueta perdida
// en attribution.ts) para que los % sumen 100% entre anuncios, como espera el dueño.
const UNATTRIBUTED_AD = 'Sin atribuir (etiqueta perdida)'

function leadQualityRows(ads: ClienteAdRow[], key: 'notQualified' | 'qualified'): LeadQualityRow[] {
  const realAds = ads.filter((ad) => ad.adName !== UNATTRIBUTED_AD)
  const total = realAds.reduce((sum, ad) => sum + ad[key], 0)
  if (total === 0) return []
  return realAds
    .filter((ad) => ad[key] > 0)
    .map((ad) => ({ adName: ad.adName, count: ad[key], percent: (ad[key] / total) * 100 }))
    .sort((a, b) => b.count - a.count)
}

function LeadQualityColumn({ title, rows, tone }: { title: string; rows: LeadQualityRow[]; tone: 'bad' | 'good' }) {
  return (
    <div className={`${styles.qualityColumn} ${tone === 'bad' ? styles.badQuality : styles.goodQuality}`}>
      <h3>{title}</h3>
      <div className={styles.qualityList}>
        {rows.map((row) => (
          <article key={row.adName} className={styles.qualityRow}>
            <div className={styles.qualityTop}>
              <strong className={styles.qualityName}>{row.adName}</strong>
              <div className={styles.qualityValue}>
                <strong>{formatPercent(row.percent)}</strong>
                <span>n={formatNumber(row.count)}</span>
              </div>
            </div>
            <div className={styles.qualityBar}><span style={{ width: `${Math.max(4, row.percent)}%` }} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  metric,
  formatter = formatNumber,
  tone,
}: {
  label: string
  metric: MetricValue
  formatter?: (value: number) => string
  tone: 'gold' | 'green' | 'purple'
}) {
  return (
    <article className={`${styles.kpi} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{displayMetric(metric, formatter)}</strong>
      <small>{trend(metric)}</small>
    </article>
  )
}

function StageList({ stages, max }: { stages: ClienteFunnelStage[]; max: number }) {
  return (
    <div className={styles.stageList}>
      {stages.map((stage) => (
        <article key={stage.id} className={`${styles.stageRow} ${styles[stage.kind]}`}>
          <div className={styles.stageTop}>
            <div>
              <strong>{stage.name}</strong>
            </div>
            <div className={styles.stageCount}>
              <strong>{formatNumber(stage.count)}</strong>
              <span>{formatPercent(stage.share * 100)}</span>
            </div>
          </div>
          <div className={styles.barTrack}>
            <span style={{ width: `${Math.max(stage.count > 0 ? 4 : 0, (stage.count / max) * 100)}%` }} />
          </div>
        </article>
      ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: ClientePlanRow }) {
  return (
    <div className={styles.planCard}>
      <span>{plan.plan}</span>
      <strong>{formatNumber(plan.ventas)} ventas</strong>
      <small>{formatUsd(plan.revenueUsd)}</small>
    </div>
  )
}

function ClienteAdCard({ ad, maxSpend }: { ad: ClienteAdRow; maxSpend: number }) {
  return (
    <article className={styles.adCard}>
      <div className={styles.adTop}>
        <div style={{ minWidth: 0 }}>
          <strong className={styles.adName}>{ad.adName}</strong>
          <EstadoPill activo={ad.activo} chico />
          <span className={styles.adCampaign}>{ad.campaignName || 'Sin campaña'}</span>
        </div>
        <div className={styles.adMoney}>
          <strong>{formatClp(ad.spend)}</strong>
          <span className={ad.roas !== null ? styles.adRoas : undefined}>
            {ad.roas === null ? 'sin ROAS' : `ROAS ${formatRoas(ad.roas)}`}
          </span>
        </div>
      </div>
      <div className={styles.barTrack}>
        <span style={{ width: `${Math.max(ad.spend > 0 ? 5 : 0, (ad.spend / maxSpend) * 100)}%` }} />
      </div>
      <div className={styles.adFunnel}>
        <AdStat label="Leads" value={ad.leads} />
        <AdStat label="No calif." value={ad.notQualified} leak />
        <AdStat label="Calificados" value={ad.qualified} />
        <AdStat label="Calif. sin agenda" value={Math.max(0, ad.qualified - ad.agenda)} leak />
        <AdStat label="Agenda" value={ad.agenda} />
        <AdStat label="Venta" value={ad.ventas} />
      </div>
      {ad.postUrl ? (
        <a href={ad.postUrl} target="_blank" rel="noopener noreferrer" className={styles.verAnuncio}>
          ▶ Ver anuncio
        </a>
      ) : null}
    </article>
  )
}

function AdStat({ label, value, leak = false }: { label: string; value: number; leak?: boolean }) {
  return (
    <div className={`${styles.adStat} ${leak ? styles.leak : ''}`}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryStat}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function StatusPill({ label, status }: { label: string; status: SourceStatus }) {
  return <span className={`${styles.statusPill} ${styles[status]}`}>{label}: {statusLabel(status)}</span>
}

function statusLabel(status: SourceStatus): string {
  if (status === 'ok') return 'OK'
  if (status === 'missing-token') return 'sin token'
  return 'parcial'
}

function displayMetric(metric: MetricValue, formatter: (value: number) => string): string {
  return metric.value === null ? '-' : formatter(metric.value)
}

function trend(metric: MetricValue): string {
  if (metric.status !== 'ok' || metric.previous === null || metric.value === null) return 'sin comparación'
  if (metric.previous === 0 && metric.value > 0) return 'nuevo en rango'
  if (metric.previous === 0) return 'estable'
  const diff = ((metric.value - metric.previous) / Math.abs(metric.previous)) * 100
  if (Math.abs(diff) < 1) return 'estable'
  return `${diff > 0 ? '+' : '-'}${Math.abs(diff).toFixed(0)}% vs anterior`
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)
}

function formatClp(value: number): string {
  return `$${formatNumber(Math.round(value))}`
}

function formatUsd(value: number): string {
  return `US$${formatNumber(Math.round(value))}`
}

function formatRoas(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}x`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

// El rango usa `currentUntil` exclusivo (medianoche del día siguiente); para mostrar la fecha de cierre real
// que ve el dueño se resta un día → el "hasta" inclusivo.
function inclusiveEnd(currentUntil: Date): Date {
  return new Date(currentUntil.getTime() - 24 * 60 * 60 * 1000)
}
