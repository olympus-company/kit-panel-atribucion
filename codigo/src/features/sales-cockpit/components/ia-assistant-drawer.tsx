'use client'

import { useMemo, useState } from 'react'
import { Send, X } from 'lucide-react'
import type { SalesCockpitData } from '@/features/panel-cliente-v2/types'

export function IaAssistantDrawer({ data, open, onClose }: { data: SalesCockpitData; open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('El asistente queda listo para conectar streaming con el contexto del panel. Por ahora usa los KPIs y llamadas cargadas en pantalla.')
  const [loading, setLoading] = useState(false)
  const context = useMemo(() => ({
    roas: data.topKpis[0]?.value,
    ventas: data.base.funnel.ventas,
    noShow: data.base.funnel.noShow,
    topKpis: data.topKpis.map((item) => ({ label: item.label, value: item.value })),
    calls: data.calls.slice(0, 5).map((call) => ({ score: call.score, outcome: call.outcome, objection: call.objectionMain })),
  }), [data])

  if (!open) return null
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#101522] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d4af37]">Asistente IA</p><h2 className="mt-1 text-xl font-black">Analiza panel</h2></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2" aria-label="Cerrar asistente"><X size={18} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {['¿Qué palanca mover hoy?', '¿Qué objeción está frenando ventas?', 'Resume las últimas llamadas'].map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#a4adc3]">{item}</button>
        ))}
      </div>
      <div className="mt-4 flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#d5d9e5]">
        {answer}
        <pre className="mt-4 overflow-auto rounded-lg bg-black/20 p-3 text-[11px] text-[#a4adc3]">{JSON.stringify(context, null, 2)}</pre>
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!question.trim()) return
          setLoading(true)
          try {
            const response = await fetch('/api/ai/panel-cliente-v2', {
              method: 'POST',
              // La llave del panel (?k=) viaja en un encabezado: el endpoint ya no es público.
              headers: { 'Content-Type': 'application/json', 'x-panel-key': new URLSearchParams(window.location.search).get('k') ?? '' },
              body: JSON.stringify({ question, context }),
            })
            const payload = (await response.json()) as { answer?: string; error?: string }
            setAnswer(payload.answer ?? payload.error ?? 'No pude generar respuesta ahora.')
          } catch {
            setAnswer('No pude conectar con la IA ahora. Revisa OPENROUTER_API_KEY o intenta nuevamente.')
          } finally {
            setLoading(false)
          }
        }}
      >
        <input value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none" placeholder="Pregúntale al panel" />
        <button type="submit" disabled={loading} className="rounded-lg bg-[#d4af37] px-3 text-[#060810] disabled:opacity-60"><Send size={16} /></button>
      </form>
    </aside>
  )
}
