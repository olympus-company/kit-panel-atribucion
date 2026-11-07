import type { PanelClientConfig } from './types'

// PLANTILLA. En producción hay una entrada por cliente (slug → cuenta de Meta + location y pipeline del CRM +
// etapas + etiquetas). Aquí queda una sola de ejemplo con marcadores: reemplaza cada VALOR_* por el del cliente real.
// Los tokens NO van aquí: `pitEnv` / `tokenEnv` son NOMBRES de variables de entorno.
export const PANEL_CLIENTS: Record<string, PanelClientConfig> = {
  ejemplo: {
    slug: 'ejemplo',
    nombre: 'Cliente Ejemplo',
    rubro: 'Rubro del cliente · ciudad',
    initials: 'CE',
    labels: {
      title: 'Servicio A vs. Servicio B',
      primary: { label: 'Servicio A' },
      secondary: { label: 'Servicio B', detail: 'detalle opcional' },
      metaAccountName: 'Nombre de la cuenta publicitaria',
    },
    ghl: {
      locationId: 'VALOR_LOCATION_ID_DEL_CRM',
      pitEnv: 'EJEMPLO_GHL_PIT',
      pipelineId: 'VALOR_PIPELINE_ID',
      stages: {
        calificado: 'VALOR_STAGE_ID_CALIFICADO',
        agendado: 'VALOR_STAGE_ID_AGENDADO',
        noShow: 'VALOR_STAGE_ID_NO_SHOW',
        concretado: 'VALOR_STAGE_ID_CONCRETADO',
        seguimiento: 'VALOR_STAGE_ID_SEGUIMIENTO',
        futura: 'VALOR_STAGE_ID_FUTURA',
        noCalifica: 'VALOR_STAGE_ID_NO_CALIFICA',
      },
      tags: {
        servicioB: 'servicio-b',
        servicioA: 'servicio-a',
        calificado: 'calificado',
        noCalificado: 'no calificado',
      },
    },
    meta: {
      adAccountId: 'VALOR_ID_CUENTA_PUBLICITARIA_SIN_act_',
      tokenEnv: 'META_SYSTEM_USER_TOKEN', // token de usuario de sistema con permiso ads_read; vive en variables de entorno
    },
  },
}

export function getPanelClient(slug: string): PanelClientConfig | null {
  return PANEL_CLIENTS[slug] ?? null
}
