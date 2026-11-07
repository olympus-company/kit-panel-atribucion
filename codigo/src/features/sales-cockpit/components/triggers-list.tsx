import type { TriggerDatum } from '@/features/panel-cliente-v2/types'

export function TriggersList({ items }: { items: TriggerDatum[] }) {
  return <List title="Top gatillos que agendan" items={items.map((item) => ({ label: item.label, value: `${item.share}%`, count: item.count }))} />
}

function List({ title, items }: { title: string; items: Array<{ label: string; value: string; count: number }> }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => <div key={item.label} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm"><span>{item.label}<small className="block text-[#a4adc3]">{item.count} calls</small></span><strong>{item.value}</strong></div>)}
      </div>
    </section>
  )
}
