import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePanelRange } from '@/features/panel-clientes/data/date-range'
import { getClientePanelData } from '@/features/panel-cliente/data'
import { PanelClienteView } from '@/features/panel-cliente/panel-cliente-view'

export const revalidate = 300

type PageProps = {
  searchParams: Promise<{ k?: string; range?: string; from?: string; to?: string }>
}

export const metadata: Metadata = {
  title: 'Cliente Ejemplo · Panel vivo',
  robots: { index: false, follow: false },
}

export default async function ClientePanelPage({ searchParams }: PageProps) {
  const query = await searchParams
  // Acceso: llave propia del cliente (CLIENTE_PANEL_KEY, solo abre ESTE panel) (no hay llave maestra).
  const provided = query.k
  const clientKey = process.env.CLIENTE_PANEL_KEY
  const authorized = Boolean(provided) && [clientKey].filter(Boolean).includes(provided)
  if (!authorized) notFound()

  // Ciclo de venta largo → sin rango explícito, abre en histórico completo (la foto útil).
  const hasRange = Boolean(query.range || (query.from && query.to))
  const range = resolvePanelRange(hasRange ? query : { range: 'completo' })
  const data = await getClientePanelData(range)
  return <PanelClienteView data={data} />
}
