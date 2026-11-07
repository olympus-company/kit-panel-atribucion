import type { SalesCockpitData } from '@/features/panel-cliente-v2/types'

export function GeoSplit({ data }: { data: SalesCockpitData['geoSplit'] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Split geo</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Geo label="México" row={data.mx} />
        <Geo label="Chile" row={data.cl} />
      </div>
    </section>
  )
}

function Geo({ label, row }: { label: string; row: { leads: number; ventas: number; closeRate: number; revenueUsd: number } }) {
  return <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><strong>{label}</strong><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><span>{row.leads}<small className="block text-[#a4adc3]">calls</small></span><span>{row.ventas}<small className="block text-[#a4adc3]">ventas</small></span><span>{row.closeRate}%<small className="block text-[#a4adc3]">cierre</small></span></div></article>
}
