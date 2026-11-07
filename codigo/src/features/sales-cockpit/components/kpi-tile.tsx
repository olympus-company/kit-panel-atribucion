import { AlertTriangle, CalendarCheck, CircleDollarSign, MousePointerClick, TrendingUp, Users } from 'lucide-react'
import type { SalesKpi, SalesTone } from '@/features/panel-cliente-v2/types'

const colors: Record<SalesTone, string> = {
  green: 'border-green-500/40 text-green-300',
  red: 'border-red-500/50 text-red-300',
  blue: 'border-blue-500/40 text-blue-300',
  amber: 'border-amber-500/40 text-amber-300',
  cyan: 'border-cyan-500/40 text-cyan-300',
  purple: 'border-purple-500/40 text-purple-300',
  gold: 'border-[#d4af37]/60 text-[#d4af37]',
}

export function KpiTile({ item }: { item: SalesKpi }) {
  const Icon = icons[item.icon]
  return (
    <article className={`relative overflow-hidden rounded-xl border bg-[#1c2338] p-4 ${colors[item.tone]}`}>
      <Icon className="absolute right-4 top-4 opacity-80" size={22} />
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a4adc3]">{item.label}</span>
      <strong className="mt-3 block text-2xl font-black leading-none tracking-normal sm:text-3xl">{item.value}</strong>
      <small className="mt-2 block text-xs font-bold text-[#a4adc3]">{item.delta}</small>
    </article>
  )
}

const icons = {
  roas: TrendingUp,
  lead: Users,
  calendar: CalendarCheck,
  alert: AlertTriangle,
  sale: CircleDollarSign,
  cost: MousePointerClick,
}
