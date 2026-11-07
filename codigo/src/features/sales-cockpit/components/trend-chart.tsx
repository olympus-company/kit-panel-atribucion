import type { TrendPoint } from '@/features/panel-cliente-v2/types'

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.flatMap((point) => [point.leads, point.agendas, point.ventas]), 1)
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Tendencia 12 semanas</h2>
      <svg viewBox="0 0 640 240" className="mt-4 h-56 w-full">
        <polyline points={points(data.map((p) => p.leads), max)} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
        <polyline points={points(data.map((p) => p.agendas), max)} fill="none" stroke="#d4af37" strokeWidth="4" strokeLinecap="round" />
        <polyline points={points(data.map((p) => p.ventas), max)} fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div className="flex justify-center gap-4 text-xs font-bold text-[#a4adc3]">
        <span className="text-blue-300">Leads</span><span className="text-[#d4af37]">Agendas</span><span className="text-green-300">Ventas</span>
      </div>
    </section>
  )
}

function points(values: number[], max: number): string {
  return values.map((value, index) => `${20 + index * 54},${220 - (value / max) * 190}`).join(' ')
}
