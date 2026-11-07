'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { PanelRangeKey, PanelRangeOption } from '../types'
import styles from './panel-clientes-view.module.css'

type RangeSelectorProps = {
  active: PanelRangeKey
  options: PanelRangeOption[]
  from?: string
  to?: string
}

export function RangeSelector({ active, options, from, to }: RangeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function updateRange(range: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('range', range)
    next.delete('from')
    next.delete('to')
    router.push(`?${next.toString()}`)
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const next = new URLSearchParams(searchParams.toString())
    next.set('range', 'custom')
    next.set('from', customFrom)
    next.set('to', customTo)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className={styles.rangeControls}>
      <label className={styles.rangeControl}>
        <span>Rango</span>
        <select value={active} onChange={(event) => updateRange(event.target.value)}>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
          {active === 'custom' ? <option value="custom">Fechas personalizadas</option> : null}
        </select>
      </label>
      <label className={styles.rangeControl}>
        <span>Desde</span>
        <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => setCustomFrom(event.target.value)} />
      </label>
      <label className={styles.rangeControl}>
        <span>Hasta</span>
        <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => setCustomTo(event.target.value)} />
      </label>
      <button type="button" className={styles.rangeApply} onClick={applyCustom} disabled={!customFrom || !customTo}>
        Aplicar
      </button>
    </div>
  )
}
