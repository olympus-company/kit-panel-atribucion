import { Phone, Timer, Flame, Bell } from 'lucide-react'
import type { SalesCockpitData } from '@/features/panel-cliente-v2/types'

export function AccionDelDia({ data }: { data: SalesCockpitData['accionDia'] }) {
  return (
    <section className="rounded-2xl border border-[#d4af37]/60 bg-[#1c2338] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4af37]">Acción del día</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Volver al sistema comercial</h2>
        </div>
        <Flame className="text-[#d4af37]" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Alert label="Sin contacto >60 min" value={data.leadsSinContacto} icon={<Timer size={16} />} />
        <Alert label="Calientes sin agenda" value={data.calientesSinAgenda} icon={<Flame size={16} />} />
        <Alert label="Agenda sin recordatorio" value={data.agendasSinRecordatorio} icon={<Bell size={16} />} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {data.topLeads.map((lead) => (
          <article key={`${lead.name}-${lead.reason}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <strong className="block text-sm">{lead.name}</strong>
            <span className="mt-1 block text-xs text-[#a4adc3]">{lead.reason}</span>
            <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-3 py-2 text-xs font-black text-[#060810]">
              <Phone size={14} />
              Llamar
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function Alert({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className="inline-flex items-center gap-2 text-xs font-bold text-[#a4adc3]">{icon}{label}</span>
      <strong className="text-xl">{value}</strong>
    </div>
  )
}
