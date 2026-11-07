'use client'

// Tabla "Calidad de leads por anuncio" (pedido del dueño): cada anuncio separado por CAMPAÑA, con total de
// leads y % + N de calificados / no calificados / ventas sobre su propio total. Columnas ordenables (tipo Excel):
// texto = alfabético; "Total leads" = cantidad; calif/no-calif/ventas = por su % (la tasa que el dueño analiza).
import { useMemo, useState } from 'react'
import type { ClienteAdQualityRow } from './types'
import styles from './panel-cliente-view.module.css'

const UNATTRIBUTED_AD = 'Sin atribuir (etiqueta perdida)'

type SortKey = 'adName' | 'campaign' | 'leads' | 'qualified' | 'notQualified' | 'ventas'
type SortDir = 'asc' | 'desc'

const TEXT_KEYS = new Set<SortKey>(['adName', 'campaign'])

function sortValue(row: ClienteAdQualityRow, key: SortKey): number | string {
  if (key === 'adName') return row.adName.toLowerCase()
  if (key === 'campaign') return row.campaign.toLowerCase()
  if (key === 'leads') return row.leads
  return row.leads > 0 ? row[key] / row.leads : 0 // calif / no-calif / ventas → por tasa (%)
}

export function LeadQualityTable({ rows }: { rows: ClienteAdQualityRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'leads', dir: 'desc' })

  const { real, unattributed } = useMemo(() => {
    const withLeads = rows.filter((row) => row.leads > 0)
    return {
      real: withLeads.filter((row) => row.adName !== UNATTRIBUTED_AD),
      unattributed: withLeads.filter((row) => row.adName === UNATTRIBUTED_AD),
    }
  }, [rows])

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...real].sort((a, b) => {
      const va = sortValue(a, sort.key)
      const vb = sortValue(b, sort.key)
      if (va < vb) return -factor
      if (va > vb) return factor
      return b.leads - a.leads // desempate estable por volumen
    })
  }, [real, sort])

  if (!sorted.length && !unattributed.length) return null

  const ordered = [...sorted, ...unattributed] // "Sin atribuir" siempre al final, no participa del orden

  function toggle(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: TEXT_KEYS.has(key) ? 'asc' : 'desc' },
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionTitle}>
        <div>
          <h2>Tabla · Calidad de leads por anuncio</h2>
          <p>
            Cada anuncio separado por campaña (des-coliciona nombres repetidos). Clic en cualquier columna para ordenar, como en
            Excel. El % es sobre el total de leads de ese anuncio.
          </p>
        </div>
      </div>
      <div className={styles.qualityTableWrap}>
        <table className={styles.qualityTable}>
          <thead>
            <tr>
              <Th label="Anuncio" col="adName" sort={sort} onSort={toggle} />
              <Th label="Campaña" col="campaign" sort={sort} onSort={toggle} />
              <Th label="Total leads" col="leads" sort={sort} onSort={toggle} num />
              <Th label="Calificados" col="qualified" sort={sort} onSort={toggle} num />
              <Th label="No calificados" col="notQualified" sort={sort} onSort={toggle} num />
              <Th label="Ventas" col="ventas" sort={sort} onSort={toggle} num />
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr
                key={`${row.adName}|${row.campaign}`}
                className={row.adName === UNATTRIBUTED_AD ? styles.qtMuted : undefined}
              >
                <td className={styles.qtName}>{row.adName}</td>
                <td>
                  <span className={styles.qtCampaign}>{row.campaign}</span>
                </td>
                <td className={styles.qtNum}>
                  <strong className={styles.qtTotal}>{formatNumber(row.leads)}</strong>
                </td>
                <QualityCell count={row.qualified} total={row.leads} tone={styles.qtGood} />
                <QualityCell count={row.notQualified} total={row.leads} tone={styles.qtBad} />
                <QualityCell count={row.ventas} total={row.leads} tone={styles.qtSale} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Th({
  label,
  col,
  sort,
  onSort,
  num = false,
}: {
  label: string
  col: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  num?: boolean
}) {
  const active = sort.key === col
  return (
    <th className={num ? styles.qtNum : undefined}>
      <button
        type="button"
        className={`${styles.qtSortBtn} ${active ? styles.qtSortActive : ''}`}
        onClick={() => onSort(col)}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <span className={styles.qtArrow}>{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )
}

function QualityCell({ count, total, tone }: { count: number; total: number; tone: string }) {
  const percent = total > 0 ? (count / total) * 100 : 0
  return (
    <td className={`${styles.qtNum} ${styles.qtCell}`}>
      <strong className={tone}>{formatPercent(percent)}</strong>
      <span>n={formatNumber(count)}</span>
    </td>
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}
