import type { PanelRange, PanelRangeKey, PanelRangeOption } from '../types'

export const PANEL_RANGE_OPTIONS: PanelRangeOption[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'completo', label: 'Período completo' },
]

// Inicio de la cartera: ninguna oportunidad de Olympus es anterior a 2024. "Período completo" usa una ventana
// que arranca aquí → currentByStage captura TODA la cartera sin ramas especiales en el cálculo del embudo.
const HISTORY_START = new Date(Date.UTC(2024, 0, 1))

type RangeInput = {
  range?: string
  from?: string
  to?: string
}

export function resolvePanelRange(input: RangeInput, now = new Date()): PanelRange {
  const key = parseRangeKey(input.range)
  if (key === 'custom') return customRange(input, now)
  if (key === 'today') return presetRange('today', 'Hoy', startOfDay(now), addDays(startOfDay(now), 1), 'today')
  if (key === '30d') return presetRange('30d', 'Últimos 30 días', addDays(now, -30), now, 'last_30d')
  if (key === 'month') return presetRange('month', 'Este mes', startOfMonth(now), now, 'this_month')
  if (key === 'completo') return presetRange('completo', 'Período completo', HISTORY_START, addDays(now, 1), 'maximum')
  return presetRange('7d', 'Últimos 7 días', addDays(now, -7), now, 'last_7d')
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function isoInclusiveEndDate(date: Date): string {
  return isoDate(addDays(date, -1))
}

export function inRange(value: string | undefined, since: Date, until: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  const time = date.getTime()
  return Number.isFinite(time) && time >= since.getTime() && time < until.getTime()
}

function presetRange(
  key: PanelRangeKey,
  label: string,
  currentSince: Date,
  currentUntil: Date,
  metaPreset: PanelRange['metaPreset'],
): PanelRange {
  const duration = currentUntil.getTime() - currentSince.getTime()
  return {
    key,
    label,
    currentSince,
    currentUntil,
    previousSince: new Date(currentSince.getTime() - duration),
    previousUntil: new Date(currentSince),
    metaPreset,
  }
}

function customRange(input: RangeInput, now: Date): PanelRange {
  const from = parseIsoDate(input.from)
  const to = parseIsoDate(input.to)
  if (!from || !to || from.getTime() > to.getTime()) return resolvePanelRange({ range: '7d' }, now)
  const currentSince = from
  const currentUntil = addDays(to, 1)
  const duration = currentUntil.getTime() - currentSince.getTime()
  return {
    key: 'custom',
    label: `${isoDate(from)} → ${isoDate(to)}`,
    currentSince,
    currentUntil,
    previousSince: new Date(currentSince.getTime() - duration),
    previousUntil: new Date(currentSince),
    from: isoDate(from),
    to: isoDate(to),
  }
}

function parseRangeKey(value: string | undefined): PanelRangeKey {
  if (value === 'today' || value === '30d' || value === 'month' || value === 'completo' || value === 'custom') return value
  return '7d'
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) ? date : null
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}
