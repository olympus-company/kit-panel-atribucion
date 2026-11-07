'use client'

import { useMemo, useState } from 'react'
import type { CloserRankingRow, CockpitCall } from '@/features/panel-cliente-v2/types'
import { CallModal } from './call-modal'
import { CloserDetailCard } from './closer-detail-card'

type Filter = 'todos' | 'nuevos' | 'reactivados' | 'tier'

export function CloserRanking({ rows }: { rows: CloserRankingRow[] }) {
  const [filter, setFilter] = useState<Filter>('todos')
  const [selectedCall, setSelectedCall] = useState<CockpitCall | null>(null)
  const sorted = useMemo(() => [...rows].sort((a, b) => b.closeRate - a.closeRate || b.calls - a.calls), [rows])

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Fathom IA</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Cabina de comando comercial</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['todos', 'nuevos', 'reactivados', 'tier'] as Filter[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full border px-3 py-1 text-xs font-black ${filter === item ? 'border-[#d4af37] bg-[#d4af37] text-[#060810]' : 'border-white/10 bg-white/[0.03] text-[#a4adc3]'}`}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.12em] text-[#6b7490]">
              <th className="py-3">Closer</th><th>Llamadas</th><th>Ganadas</th><th>No-show</th><th>Score</th><th>Cierre</th><th>Speed</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-white/10 last:border-0">
                <td className="py-3 font-black">{row.name}<span className="ml-2 text-xs text-[#a4adc3]">{row.countryCode}</span></td>
                <td>{row.calls}</td><td>{row.wins}</td><td>{row.noShows}</td><td>{row.avgScore ? Math.round(row.avgScore) : 'sin data'}</td><td>{row.closeRate}%</td><td>{row.speedToLeadMin ?? 'pendiente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {sorted.map((row) => <CloserDetailCard key={row.id} row={row} onSelectCall={setSelectedCall} />)}
      </div>
      <CallModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </section>
  )
}

const labels: Record<Filter, string> = { todos: 'Todos', nuevos: 'Nuevos', reactivados: 'Reactivados', tier: 'Tier' }
