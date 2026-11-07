import type { Palanca } from '@/features/panel-cliente-v2/types'

export function PalancasHero({ items }: { items: Palanca[] }) {
  return (
    <section className="rounded-2xl border border-[#d4af37]/70 bg-[#1c2338] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4af37]">Palancas</p>
      <h2 className="mt-1 text-xl font-black tracking-normal">Qué mover esta semana</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item, index) => (
          <article key={item.title} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4 pt-6">
            <span className="absolute -top-3 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#d4af37] text-sm font-black text-[#060810]">{index + 1}</span>
            <small className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d4af37]">{item.type}</small>
            <h3 className="mt-2 text-base font-black tracking-normal">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#a4adc3]">{item.description}</p>
            <strong className="mt-3 block border-t border-white/10 pt-3 text-green-300">{item.potential}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
