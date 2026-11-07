'use client'

import { ChevronDown, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { CloserRankingRow, CockpitCall } from '@/features/panel-cliente-v2/types'

export function CloserDetailCard({ row, onSelectCall }: { row: CloserRankingRow; onSelectCall: (call: CockpitCall) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <strong className="block text-base">{row.name}</strong>
          <span className="text-xs text-[#a4adc3]">{row.role} · {row.countryCode}</span>
        </div>
        <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
      </button>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Cierre" value={`${row.closeRate}%`} />
        <Mini label="Calls" value={String(row.calls)} />
        <Mini label="Score" value={row.avgScore ? String(Math.round(row.avgScore)) : '-'} />
      </div>
      {open ? (
        <div className="mt-4 space-y-2">
          {row.callsList.length ? row.callsList.slice(0, 5).map((call) => (
            <button key={call.id} type="button" onClick={() => onSelectCall(call)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs">
              <span>{call.prospectName}<small className="block text-[#a4adc3]">{call.outcome} · score {call.score ?? '-'}</small></span>
              <ExternalLink size={14} />
            </button>
          )) : <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-[#a4adc3]">Sin llamadas Fathom procesadas todavía.</p>}
        </div>
      ) : null}
    </article>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.04] p-2"><span className="block text-[10px] text-[#6b7490]">{label}</span><strong>{value}</strong></div>
}
