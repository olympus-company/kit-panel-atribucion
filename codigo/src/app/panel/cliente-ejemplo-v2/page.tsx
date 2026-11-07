import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolvePanelRange } from '@/features/panel-clientes/data/date-range'
import { getClienteV2Data } from '@/features/panel-cliente-v2/data'
import { PanelClienteV2View } from '@/features/panel-cliente-v2/panel-cliente-v2-view'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ k?: string; range?: string; from?: string; to?: string }>
}

export const metadata: Metadata = {
  title: 'Cliente Ejemplo · Panel comercial v2',
  robots: { index: false, follow: false },
}

export default async function ClientePanelV2Page({ searchParams }: PageProps) {
  const query = await searchParams
  const provided = query.k
  const clientKey = process.env.CLIENTE_PANEL_KEY
  const authorized = Boolean(provided) && [clientKey].filter(Boolean).includes(provided)
  if (!authorized) notFound()

  const hasRange = Boolean(query.range || (query.from && query.to))
  const range = resolvePanelRange(hasRange ? query : { range: 'completo' })
  const data = await getClienteV2Data(range)
  return <PanelClienteV2View data={data} />
}
