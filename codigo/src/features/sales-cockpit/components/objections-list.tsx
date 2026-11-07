import type { ObjectionDatum } from '@/features/panel-cliente-v2/types'

export function ObjectionsList({ items }: { items: ObjectionDatum[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Top objeciones</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm sm:grid-cols-[1fr_auto_auto]">
            <strong>{item.label}</strong><span className="text-[#a4adc3]">{item.count} llamadas</span><span className="text-[#d4af37]">{item.bestCloser}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
