import type { FunnelStep } from '@/features/panel-cliente-v2/types'

export function JourneyFunnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((step) => step.value), 1)
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Journey extendido</h2>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="grid gap-2 sm:grid-cols-[120px_1fr_190px] sm:items-center">
            <strong className="text-sm">{step.label}</strong>
            <div className="h-11 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              <div className="flex h-full items-center rounded-lg bg-[#d4af37] px-3 text-sm font-black text-[#060810]" style={{ width: `${Math.max(5, (step.value / max) * 100)}%` }}>
                {step.value.toLocaleString('es-CL')}
              </div>
            </div>
            <span className="text-sm text-[#a4adc3]">{step.conversion}% · {step.cost}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
