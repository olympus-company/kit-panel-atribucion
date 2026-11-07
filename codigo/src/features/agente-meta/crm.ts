import { SIN_ATRIBUCION, type CrmAnuncio, type CruceCrm } from './tipos'

// Cruce con el CRM (GHL) por anuncio: de qué anuncio vino cada oportunidad y hasta qué etapa llegó.
// Criterio: Ad ID del contacto =
// custom field `source_id` → atribución nativa de GHL → ctwa_attribution (por teléfono). Solo se LEE del CRM (la búsqueda de GHL usa POST pero no escribe).
// Si el cliente no guarda ad_id en sus contactos, el cruce lo dice («sin atribución por anuncio») y no inventa nada.
const GHL = 'https://services.leadconnectorhq.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const PAGINAS_MAX = 30

export type GhlFetch = (ruta: string, cuerpo?: Record<string, unknown>) => Promise<unknown>
type Contacto = { id: string; phone?: string; attributionSource?: unknown; lastAttributionSource?: unknown; customFields?: { id: string; value?: unknown }[]; searchAfter?: unknown }
type Oportunidad = { contactId?: string; pipelineStageId?: string; createdAt?: string }
type Etapa = { id: string; name: string }
/** Tú defines el mapeo: nombre de etapa → 0 sin hito, 1 calificado, 2 venta. */
export type TierDeEtapa = (nombreEtapa: string) => 0 | 1 | 2

const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

export function adIdDelContacto(c: Contacto, campoSourceId: string | null, porTelefono: Map<string, string>): string | null {
  const v = campoSourceId ? c.customFields?.find((f) => f.id === campoSourceId)?.value : null
  if (v != null && String(v).trim()) return String(v).trim()
  for (const a of [c.attributionSource, c.lastAttributionSource]) {
    const id = a && typeof a === 'object' ? (a as { adId?: string }).adId : undefined
    if (id) return String(id)
  }
  const tel = digitos(c.phone)
  return tel ? (porTelefono.get(tel) ?? null) : null
}

/** Pura: junta oportunidades + Ad ID de cada contacto en conteos por anuncio. */
export function agruparPorAnuncio(opps: Oportunidad[], adPorContacto: Map<string, string | null>, etapas: Etapa[], tierDeEtapa: TierDeEtapa | null = null): CruceCrm {
  const mapeado = tierDeEtapa !== null
  const nombreEtapa = new Map(etapas.map((e) => [e.id, e.name]))
  const porAnuncio: Record<string, CrmAnuncio> = {}
  let sinAtribucion = 0
  for (const o of opps) {
    const adId = o.contactId ? adPorContacto.get(o.contactId) : null
    if (!adId) { sinAtribucion++; continue }
    const a = (porAnuncio[adId] ??= { leads: 0, calificados: mapeado ? 0 : null, ventas: mapeado ? 0 : null })
    a.leads++
    const tier = tierDeEtapa ? tierDeEtapa(nombreEtapa.get(o.pipelineStageId ?? '') ?? '') : 0
    if (mapeado && tier >= 1) a.calificados = (a.calificados ?? 0) + 1
    if (mapeado && tier === 2) a.ventas = (a.ventas ?? 0) + 1
  }
  const conAnuncio = opps.length - sinAtribucion
  const aviso = opps.length === 0 ? 'Sin oportunidades nuevas en el CRM en la ventana.' : conAnuncio === 0 ? SIN_ATRIBUCION : !mapeado ? 'Este cliente no tiene mapeo de etapas (calificado/venta): solo se cuentan oportunidades por anuncio.' : null
  return { disponible: true, hitosMapeados: mapeado, contactosConAnuncio: Object.keys(porAnuncio).length, oportunidades: opps.length, sinAtribucion, porAnuncio, aviso }
}

export function crearGhl(token: string, f: typeof fetch = fetch): GhlFetch {
  return async (ruta, cuerpo) => {
    const res = await f(`${GHL}${ruta}`, {
      method: cuerpo ? 'POST' : 'GET', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Version: '2021-07-28', Accept: 'application/json', 'User-Agent': UA },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
    if (!res.ok) throw new Error(`GHL ${ruta.split('?')[0]} -> ${res.status}`)
    return res.json()
  }
}

async function mapaContactos(ghl: GhlFetch, loc: string, campo: string | null, porTelefono: Map<string, string>): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>()
  let despues: unknown
  for (let p = 0; p < PAGINAS_MAX; p++) {
    const res = (await ghl('/contacts/search', { locationId: loc, pageLimit: 100, ...(despues !== undefined ? { searchAfter: despues } : {}) })) as { contacts?: Contacto[] }
    const lista = res.contacts ?? []
    for (const c of lista) mapa.set(c.id, adIdDelContacto(c, campo, porTelefono))
    despues = lista[lista.length - 1]?.searchAfter
    if (lista.length < 100 || despues === undefined) break
  }
  return mapa
}

async function oportunidades(ghl: GhlFetch, loc: string, pipelineId: string, desdeMs: number, hastaMs: number): Promise<Oportunidad[]> {
  const salida: Oportunidad[] = []
  let cursor = ''
  for (let p = 0; p < PAGINAS_MAX; p++) {
    const res = (await ghl(`/opportunities/search?location_id=${loc}&pipeline_id=${pipelineId}&limit=100${cursor}`)) as { opportunities?: Oportunidad[]; meta?: { startAfter?: number; startAfterId?: string } }
    const lista = res.opportunities ?? []
    for (const o of lista) {
      const ms = o.createdAt ? new Date(o.createdAt).getTime() : 0
      if (ms >= desdeMs && ms <= hastaMs) salida.push(o)
    }
    const m = res.meta
    const todasViejas = lista.length > 0 && lista.every((o) => (o.createdAt ? new Date(o.createdAt).getTime() : 0) < desdeMs)
    if (lista.length < 100 || !m?.startAfter || !m.startAfterId || todasViejas) break
    cursor = `&startAfter=${m.startAfter}&startAfterId=${m.startAfterId}`
  }
  return salida
}

/** Cruza las oportunidades del pipeline de ventas (el de más etapas) con el Ad ID de cada contacto. `ctwa`: teléfono → Ad ID desde ctwa_attribution. */
export async function cruzarCrm(ghl: GhlFetch, loc: string, desde: string, hasta: string, ctwa: Map<string, string>, tierDeEtapa: TierDeEtapa | null = null): Promise<CruceCrm> {
  try {
    const { pipelines = [] } = (await ghl(`/opportunities/pipelines?locationId=${loc}`)) as { pipelines?: { id: string; stages?: Etapa[] }[] }
    const pipeline = [...pipelines].sort((a, b) => (b.stages?.length ?? 0) - (a.stages?.length ?? 0))[0]
    if (!pipeline) return { disponible: false, motivo: 'El cliente no tiene pipelines en el CRM.' }
    let campo: string | null = null
    try {
      const cf = (await ghl(`/locations/${loc}/customFields`)) as { customFields?: { id: string; fieldKey?: string }[] }
      campo = cf.customFields?.find((f) => (f.fieldKey ?? '').split('.').pop()?.toLowerCase() === 'source_id')?.id ?? null
    } catch { /* sin custom fields: queda la atribución nativa y ctwa */ }
    const desdeMs = new Date(`${desde}T00:00:00-04:00`).getTime()
    const hastaMs = new Date(`${hasta}T23:59:59-03:00`).getTime()
    const [adPorContacto, opps] = await Promise.all([mapaContactos(ghl, loc, campo, ctwa), oportunidades(ghl, loc, pipeline.id, desdeMs, hastaMs)])
    return agruparPorAnuncio(opps, adPorContacto, pipeline.stages ?? [], tierDeEtapa)
  } catch (e) {
    return { disponible: false, motivo: `No se pudo leer el CRM: ${e instanceof Error ? e.message : 'error desconocido'}` }
  }
}
