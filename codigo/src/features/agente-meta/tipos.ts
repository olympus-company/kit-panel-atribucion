import { z } from 'zod'

// Tipos compartidos del lector de Meta y del cruce con el CRM. Lo que llega de Meta se valida con Zod en el borde (graph.ts).

const Num = z.string().optional()
export const AccionSchema = z.object({ action_type: z.string(), value: z.string() })

/** Una fila de insights nivel anuncio, un día (time_increment=1). */
export const FilaInsightSchema = z.object({
  ad_id: z.string(),
  ad_name: z.string().optional(),
  adset_id: z.string().optional(),
  campaign_id: z.string().optional(),
  date_start: z.string(),
  spend: Num,
  impressions: Num,
  reach: Num,
  frequency: Num,
  cpm: Num,
  actions: z.array(AccionSchema).optional(),
})
export type FilaInsight = z.infer<typeof FilaInsightSchema>

export type CampanaMeta = { id: string; nombre: string; objetivo: string; estado: string }
export type ConjuntoMeta = { id: string; nombre: string; campanaId: string; estado: string; aprendizaje: boolean }
export type DatosCuenta = { filas: FilaInsight[]; campanas: CampanaMeta[]; conjuntos: ConjuntoMeta[] }

/** Cruce con el CRM por anuncio. null en un campo = ese cliente no tiene mapeo de hitos. */
export type CrmAnuncio = { leads: number; calificados: number | null; ventas: number | null }
export type CruceCrm =
  | { disponible: false; motivo: string }
  | { disponible: true; hitosMapeados: boolean; contactosConAnuncio: number; oportunidades: number; sinAtribucion: number; porAnuncio: Record<string, CrmAnuncio>; aviso: string | null }

export const SIN_ATRIBUCION = 'sin atribución por anuncio'
