'use client'

import { useState, type ReactNode } from 'react'
import { Bot, Moon, Sun } from 'lucide-react'
import type { SalesCockpitData } from '@/features/panel-cliente-v2/types'
import { IaAssistantDrawer } from './ia-assistant-drawer'

export function DashboardShell({ data, children }: { data: SalesCockpitData; children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <main data-theme={theme} className="min-h-screen bg-[#0f1421] text-[#f5f6fa] data-[theme=light]:bg-[#f4f6fa] data-[theme=light]:text-[#0f1421]">
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/10 bg-[#1c2338] p-5 data-[theme=light]:border-black/10 data-[theme=light]:bg-white sm:p-7">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Panel comercial v2</p>
              <h1 className="mt-2 text-3xl font-black leading-none tracking-normal sm:text-5xl">Cliente Ejemplo</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#a4adc3] data-[theme=light]:text-[#4a556e]">
                Cabina comercial · Meta + CRM + Fathom IA
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="rounded-lg border border-white/10 px-3 py-2 text-left sm:text-right">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7490]">Generado</span>
                <strong className="text-sm">{formatDate(data.generatedAt)}</strong>
              </div>
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#d4af37]"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#d4af37] px-3 text-xs font-black text-[#060810]"
              >
                <Bot size={16} />
                IA
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill label="Meta" ok={data.base.sourceStatus.meta === 'ok'} />
            <StatusPill label="GHL" ok={data.base.sourceStatus.ghl === 'ok'} />
            <StatusPill label="Fathom" ok={data.hasFathomData} />
          </div>
        </header>
        <div className="mt-3 space-y-3">{children}</div>
      </div>
      <IaAssistantDrawer data={data} open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </main>
  )
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold">
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-400' : 'bg-amber-400'}`} />
      {label} {ok ? 'OK' : 'pendiente'}
    </span>
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
