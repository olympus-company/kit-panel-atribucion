// Estado REAL (hoy) de anuncios y campañas de una cuenta de Meta, para los paneles de dueño.
//
// POR QUÉ: los insights del período mezclan campañas ya apagadas con las que corren;
// con "30 días" el dueño veía iguales una campaña pausada y la vigente y preguntaba "¿ya no está activa?".
// Se lee a nivel de ANUNCIO con su conjunto: `effective_status` ya arrastra la pausa de campaña/conjunto
// (ADSET_PAUSED, CAMPAIGN_PAUSED), pero NO la fecha de término del conjunto (un evento con end_time pasado
// sigue "ACTIVE") → se revisa `adset.end_time`. Una campaña está prendida si al menos un anuncio corre.
// Best-effort: si Meta falla, los mapas quedan vacíos y el panel muestra el período sin el prendida/apagada.

export type EstadoMeta = {
  /** adId → corre hoy */
  anuncios: Map<string, boolean>
  /** campaignId → tiene al menos un anuncio corriendo hoy */
  campanas: Map<string, boolean>
  /** false si no se pudo leer (los mapas están vacíos y no significan "todo apagado") */
  ok: boolean
}

type AdRow = { id: string; campaign_id?: string; effective_status?: string; adset?: { effective_status?: string; end_time?: string } }

export async function getEstadoMeta(adAccountId: string, token = process.env.META_SYSTEM_USER_TOKEN): Promise<EstadoMeta> {
  const estado: EstadoMeta = { anuncios: new Map(), campanas: new Map(), ok: false }
  if (!token || !adAccountId) return estado
  try {
    const qs = new URLSearchParams({ fields: 'id,campaign_id,effective_status,adset{effective_status,end_time}', limit: '500', access_token: token })
    const res = await fetch(`https://graph.facebook.com/v21.0/act_${adAccountId}/ads?${qs}`, { cache: 'no-store' })
    if (!res.ok) return estado
    const data = (await res.json()) as { data?: AdRow[] }
    const ahora = Date.now()
    for (const ad of data.data ?? []) {
      const fin = ad.adset?.end_time ? new Date(ad.adset.end_time).getTime() : null
      const corre = ad.effective_status === 'ACTIVE' && (fin === null || fin > ahora)
      estado.anuncios.set(ad.id, corre)
      if (ad.campaign_id) estado.campanas.set(ad.campaign_id, (estado.campanas.get(ad.campaign_id) ?? false) || corre)
    }
    estado.ok = true
  } catch {
    // Sin estado el panel sigue sirviendo.
  }
  return estado
}

/** Estado de un anuncio para el panel: true/false si se pudo leer, null si Meta no respondió. */
export function activoDe(estado: EstadoMeta, adId: string): boolean | null {
  return estado.ok ? (estado.anuncios.get(adId) ?? false) : null
}
