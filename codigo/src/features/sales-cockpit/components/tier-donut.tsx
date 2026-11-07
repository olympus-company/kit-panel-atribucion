import type { TierDatum } from '@/features/panel-cliente-v2/types'

export function TierDonut({ data }: { data: TierDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Ventas por tier</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-[190px_1fr] sm:items-center">
        <div className="relative mx-auto h-44 w-44 rounded-full border-[24px] border-[#d4af37]/70">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-4xl font-black">{total}</strong>
            <small className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a4adc3]">ventas</small>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.tier} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <span>{item.tier}</span>
              <strong>{item.value} · US${Math.round(item.revenueUsd).toLocaleString('es-CL')}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
