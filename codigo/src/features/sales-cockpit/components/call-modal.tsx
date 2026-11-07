'use client'

import { X } from 'lucide-react'
import type { CockpitCall } from '@/features/panel-cliente-v2/types'

export function CallModal({ call, onClose }: { call: CockpitCall | null; onClose: () => void }) {
  if (!call) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <article className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-[#161c2c] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4af37]">Análisis llamada</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">{call.prospectName}</h2>
            <p className="text-sm text-[#a4adc3]">{call.closerName} · {call.outcome}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <Metric label="Score" value={call.score === null ? '-' : String(call.score)} />
          <Metric label="Duración" value={call.durationSeconds ? `${Math.round(call.durationSeconds / 60)} min` : '-'} />
          <Metric label="Talk ratio" value={call.talkRatioCloser ? `${call.talkRatioCloser}%` : '-'} />
          <Metric label="Preguntas" value={call.questionsCount === null ? '-' : String(call.questionsCount)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Block title="Gatillo de llegada" text={call.triggerArrival} />
          <Block title="Gatillo de resultado" text={call.triggerOutcome} />
          <Block title="Objeción principal" text={call.objectionMain} />
          <Block title="Recomendación IA" text={call.aiRecommendation} />
        </div>
        {call.shareUrl ? <a href={call.shareUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-black text-[#060810]">Ver grabación Fathom completa</a> : null}
      </article>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#6b7490]">{label}</span><strong className="mt-1 block text-xl">{value}</strong></div>
}

function Block({ title, text }: { title: string; text: string | null }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><strong className="text-sm">{title}</strong><p className="mt-2 text-sm leading-6 text-[#a4adc3]">{text ?? 'Sin evidencia todavía.'}</p></div>
}
