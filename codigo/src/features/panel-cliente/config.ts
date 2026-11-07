// Config del panel vivo del dueño · Cliente Ejemplo.
// Notas: (1) la atribución por anuncio se cruza por NOMBRE (utmContent del CRM ==
// ad_name de Meta; el CRM NO trae utmAdId); (2) monetaryValue está poblado → hay revenue/ROAS real.
// OJO MONEDAS: Meta gasta en CLP, los planes/monetaryValue están en USD. Se convierte con la convención
// definida por el negocio (constante USD_TO_CLP): ajústala a tu caso.
export const USD_TO_CLP = 1000

export type ClienteStageKind = 'calificado' | 'agenda' | 'noshow' | 'venta' | 'descarte'

export const CLIENTE_CONFIG = {
  name: 'Cliente Ejemplo',
  initials: 'CE',
  meta: {
    adAccountId: process.env.CLIENTE_META_AD_ACCOUNT_ID ?? 'VALOR_ID_CUENTA_PUBLICITARIA',
    tokenEnv: 'META_SYSTEM_USER_TOKEN',
  },
  ghl: {
    locationId: process.env.CLIENTE_GHL_LOCATION_ID ?? 'VALOR_LOCATION_ID_DEL_CRM',
    tokenEnv: 'CLIENTE_GHL_PIT',
    pipelineId: 'VALOR_PIPELINE_ID',
    // En orden de embudo. `venta` marca las etapas de cierre; las de plan llevan su precio USD.
    stages: [
      { id: 'VALOR_STAGE_ID_1', name: 'Calificado · no agendó', kind: 'calificado' },
      { id: 'VALOR_STAGE_ID_2', name: 'Agendó cita', kind: 'agenda' },
      { id: 'VALOR_STAGE_ID_3', name: 'No contestó / no confirmó', kind: 'agenda' },
      { id: 'VALOR_STAGE_ID_4', name: 'No asistió (no-show)', kind: 'noshow' },
      { id: 'VALOR_STAGE_ID_5', name: 'Seguimiento', kind: 'agenda' },
      { id: 'VALOR_STAGE_ID_6', name: 'Acceso Plan A', kind: 'venta', plan: 'Plan A', priceUsd: 1000 }, // precios de ejemplo
      { id: 'VALOR_STAGE_ID_7', name: 'Acceso Plan B', kind: 'venta', plan: 'Plan B', priceUsd: 2000 },
      { id: 'VALOR_STAGE_ID_8', name: 'Acceso Plan C', kind: 'venta', plan: 'Plan C', priceUsd: 3000 },
      { id: 'VALOR_STAGE_ID_9', name: 'No calificado', kind: 'descarte' },
    ],
  },
} as const
