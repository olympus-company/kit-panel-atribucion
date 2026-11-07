import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { PanelClientConfig, PanelRange } from '../types'

const ctwaRowSchema = z.object({
  phone: z.string().nullable().optional(),
  source_id: z.string().nullable().optional(),
  captured_at: z.string().nullable().optional(),
})

const ctwaRowsSchema = z.array(ctwaRowSchema)

export type CtwaAttribution = {
  phone: string
  sourceId: string
  capturedAt: string | null
}

export async function fetchCtwaAttribution(
  client: PanelClientConfig,
  range: PanelRange,
  adIds: string[],
): Promise<CtwaAttribution[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const filteredAdIds = adIds.filter(Boolean)
  if (!supabaseUrl || !serviceKey || filteredAdIds.length === 0) return []

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase
    .from('ctwa_attribution')
    .select('phone,source_id,captured_at')
    .eq('location_id', client.ghl.locationId)
    .gte('captured_at', range.currentSince.toISOString())
    .lt('captured_at', range.currentUntil.toISOString())
    .in('source_id', filteredAdIds)

  if (error) throw error

  return ctwaRowsSchema.parse(data ?? []).flatMap((row) => {
    const phone = row.phone?.trim()
    const sourceId = row.source_id?.trim()
    if (!phone || !sourceId) return []
    return [{ phone, sourceId, capturedAt: row.captured_at ?? null }]
  })
}
