import type { SalesCockpitData } from './types'
import { AccionDelDia } from '@/features/sales-cockpit/components/accion-del-dia'
import { AdsGrid } from '@/features/sales-cockpit/components/ads-grid'
import { AnatomyComparison } from '@/features/sales-cockpit/components/anatomy-comparison'
import { CloserRanking } from '@/features/sales-cockpit/components/closer-ranking'
import { DashboardShell } from '@/features/sales-cockpit/components/dashboard-shell'
import { GeoSplit } from '@/features/sales-cockpit/components/geo-split'
import { JourneyFunnel } from '@/features/sales-cockpit/components/journey-funnel'
import { KpiTile } from '@/features/sales-cockpit/components/kpi-tile'
import { NoshowAlert } from '@/features/sales-cockpit/components/noshow-alert'
import { ObjectionsList } from '@/features/sales-cockpit/components/objections-list'
import { OpsKpisGrid } from '@/features/sales-cockpit/components/ops-kpis-grid'
import { PalancasHero } from '@/features/sales-cockpit/components/palancas-hero'
import { TierDonut } from '@/features/sales-cockpit/components/tier-donut'
import { TrendChart } from '@/features/sales-cockpit/components/trend-chart'
import { TriggersList } from '@/features/sales-cockpit/components/triggers-list'
import { VelocityCards } from '@/features/sales-cockpit/components/velocity-cards'

export function PanelClienteV2View({ data }: { data: SalesCockpitData }) {
  return (
    <DashboardShell data={data}>
      {!data.hasFathomData ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Fathom todavía no tiene llamadas procesadas para el dueño. Meta + GHL están vivos; la cabina IA se completa al entrar el primer webhook.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {data.topKpis.map((item) => <KpiTile key={item.label} item={item} />)}
      </section>

      <AccionDelDia data={data.accionDia} />
      <OpsKpisGrid items={data.opsKpis} />

      <section className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <TrendChart data={data.trend} />
        <TierDonut data={data.tiers} />
      </section>

      <PalancasHero items={data.palancas} />
      <NoshowAlert noShows={data.base.funnel.noShow} agendas={data.base.funnel.agenda} />
      <JourneyFunnel steps={data.journey} />
      <CloserRanking rows={data.closers} />

      <section className="grid gap-3 lg:grid-cols-2">
        <GeoSplit data={data.geoSplit} />
        <TriggersList items={data.triggers} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <AnatomyComparison win={data.anatomy.win} lose={data.anatomy.lose} />
        <ObjectionsList items={data.objections} />
      </section>

      <VelocityCards items={data.velocity} />
      <AdsGrid ads={data.ads} />
    </DashboardShell>
  )
}
