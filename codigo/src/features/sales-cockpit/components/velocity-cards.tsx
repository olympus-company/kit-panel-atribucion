import type { OpsKpi } from '@/features/panel-cliente-v2/types'

export function VelocityCards({ items }: { items: OpsKpi[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Velocidad del embudo</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {items.map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><span className="text-xs text-[#a4adc3]">{item.label}</span><strong className="mt-2 block text-2xl">{item.value}</strong><small className="text-[#6b7490]">{item.hint}</small></div>)}
      </div>
    </section>
  )
}
