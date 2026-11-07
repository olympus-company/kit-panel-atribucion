import { z } from 'zod'
import { FilaInsightSchema, type CampanaMeta, type ConjuntoMeta, type DatosCuenta, type FilaInsight } from './tipos'

// Lector de Meta (Graph API). SOLO LECTURA: toda llamada es GET. Nunca se pausa, edita ni cambia presupuestos.
const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_PAGINAS = 20

const PaginaSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ data: z.array(item), paging: z.object({ next: z.string().optional() }).optional() })
const CampanaSchema = z.object({ id: z.string(), name: z.string().optional(), objective: z.string().optional(), effective_status: z.string().optional() })
const ConjuntoSchema = z.object({
  id: z.string(), name: z.string().optional(), campaign_id: z.string().optional(), effective_status: z.string().optional(),
  learning_stage_info: z.object({ status: z.string().optional() }).optional(),
})

export type Fetcher = (url: string, init: { method: 'GET'; headers: Record<string, string>; cache: 'no-store' }) => Promise<Response>

export class GraphError extends Error {}

/** GET con paginación. El token va en el encabezado, no en la URL, para que no quede en registros. */
export async function graphGet<T extends z.ZodTypeAny>(ruta: string, params: Record<string, string>, token: string, item: T, f: Fetcher = fetch): Promise<z.infer<T>[]> {
  const salida: z.infer<T>[] = []
  let url: string | undefined = `${GRAPH}/${ruta}?${new URLSearchParams(params).toString()}`
  for (let pagina = 0; url && pagina < MAX_PAGINAS; pagina++) {
    const res = await f(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const cuerpo: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = (cuerpo as { error?: { message?: string } } | null)?.error?.message
      throw new GraphError(`Meta ${ruta}: ${msg ?? `HTTP ${res.status}`}`)
    }
    const p = PaginaSchema(item).parse(cuerpo)
    salida.push(...p.data)
    url = p.paging?.next
  }
  return salida
}

export const idCuenta = (id: string) => (id.startsWith('act_') ? id : `act_${id}`)

/** Insights nivel anuncio, un día por fila, + objetivo de cada campaña + estado de aprendizaje de cada conjunto. */
export async function leerCuentaMeta(cuenta: string, token: string, desde: string, hasta: string, f: Fetcher = fetch): Promise<DatosCuenta> {
  const act = idCuenta(cuenta)
  const [filas, campanas, conjuntos] = await Promise.all([
    graphGet(`${act}/insights`, {
      level: 'ad', time_increment: '1', limit: '500', time_range: JSON.stringify({ since: desde, until: hasta }),
      fields: 'ad_id,ad_name,adset_id,campaign_id,spend,impressions,reach,frequency,cpm,actions,cost_per_action_type',
    }, token, FilaInsightSchema, f),
    graphGet(`${act}/campaigns`, { fields: 'id,name,objective,effective_status', limit: '500' }, token, CampanaSchema, f),
    graphGet(`${act}/adsets`, { fields: 'id,name,campaign_id,effective_status,learning_stage_info', limit: '500' }, token, ConjuntoSchema, f),
  ])
  return {
    filas: filas as FilaInsight[],
    campanas: campanas.map((c): CampanaMeta => ({ id: c.id, nombre: c.name ?? c.id, objetivo: c.objective ?? 'UNKNOWN', estado: c.effective_status ?? 'UNKNOWN' })),
    conjuntos: conjuntos.map((c): ConjuntoMeta => ({ id: c.id, nombre: c.name ?? c.id, campanaId: c.campaign_id ?? '', estado: c.effective_status ?? 'UNKNOWN', aprendizaje: c.learning_stage_info?.status === 'LEARNING' })),
  }
}

/** Token de Meta: el de sistema de OlympusOS (como el resto de la app) o, si la cuenta guarda uno propio, ese. No hay cifrado en la columna: `access_token_encrypted` guarda texto plano o «system_user». */
export function tokenMeta(guardado: string | null | undefined): string | null {
  const propio = guardado && guardado !== 'system_user' ? guardado : null
  return process.env.META_SYSTEM_USER_TOKEN || propio
}
