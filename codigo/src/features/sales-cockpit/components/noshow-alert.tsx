import { AlertTriangle } from 'lucide-react'

export function NoshowAlert({ noShows, agendas }: { noShows: number; agendas: number }) {
  const rate = agendas > 0 ? Math.round((noShows / agendas) * 100) : 0
  return (
    <section className="grid gap-3 rounded-2xl border border-red-500/70 bg-red-500/10 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <AlertTriangle className="text-red-300" size={34} />
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-red-300">Alerta no-show</p>
        <h2 className="mt-1 text-xl font-black tracking-normal">Hay dinero filtrándose antes de la llamada</h2>
        <p className="mt-1 text-sm text-[#a4adc3]">Priorizar confirmación y recordatorio de agendas próximas.</p>
      </div>
      <strong className="text-5xl font-black text-red-300">{rate}%</strong>
    </section>
  )
}
