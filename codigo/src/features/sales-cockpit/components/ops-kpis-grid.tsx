import type { OpsKpi } from '@/features/panel-cliente-v2/types'

export function OpsKpisGrid({ items }: { items: OpsKpi[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <SectionTitle title="KPIs operativos" subtitle="Lectura gerencial del sistema de ventas" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {items.slice(0, 21).map((item) => (
          <div key={item.label} className="min-h-[86px] rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#6b7490]">{item.label}</span>
            <strong className="mt-2 block text-lg font-black tracking-normal">{item.value}</strong>
            <small className="mt-1 block text-[11px] text-[#a4adc3]">{item.hint}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-black tracking-normal">{title}</h2>
      <p className="mt-1 text-sm text-[#a4adc3]">{subtitle}</p>
    </div>
  )
}
