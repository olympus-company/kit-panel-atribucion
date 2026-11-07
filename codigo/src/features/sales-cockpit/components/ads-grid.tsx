import type { ClienteAdRow } from '@/features/panel-cliente/types'

export function AdsGrid({ ads }: { ads: ClienteAdRow[] }) {
  const sorted = [...ads].sort((a, b) => b.spend - a.spend).slice(0, 12)
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Anuncios</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sorted.map((ad) => (
          <article key={ad.adName} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><strong className="block truncate">{ad.adName}</strong><span className="text-xs text-[#a4adc3]">{ad.campaignName || 'Sin campaña'}</span></div>
              <strong className="text-[#d4af37]">${Math.round(ad.spend).toLocaleString('es-CL')}</strong>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs"><Mini label="Leads" value={ad.leads} /><Mini label="Calif." value={ad.qualified} /><Mini label="Agenda" value={ad.agenda} /><Mini label="Venta" value={ad.ventas} /></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return <span className="rounded-lg bg-white/[0.04] p-2"><small className="block text-[#6b7490]">{label}</small><strong>{value}</strong></span>
}
