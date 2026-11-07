export interface CapiClientConfig {
  pixel_id: string
  capi_token_env: string
  test_event_code_env: string
  default_country: string
  default_currency: string
  default_event_source_url: string
  // page_id de la Página FB conectada al WhatsApp del cliente. OBLIGATORIO para conversiones CTWA
  // (action_source=business_messaging): Meta lo exige DENTRO de user_data o rechaza el evento con 400.
  // Además la página debe estar asociada al dataset en Business Manager.
  page_id: string
}

// PLANTILLA: una entrada por cliente. Los tokens NO van aquí; `capi_token_env` es el NOMBRE de la variable de entorno.
export const CAPI_CLIENTS: Record<string, CapiClientConfig> = {
  ejemplo: {
    pixel_id: 'VALOR_ID_DEL_DATASET_O_PIXEL', // Events Manager → Orígenes de datos
    capi_token_env: 'EJEMPLO_CAPI_TOKEN', // o META_SYSTEM_USER_TOKEN si el usuario de sistema tiene acceso al dataset
    test_event_code_env: 'EJEMPLO_CAPI_TEST_CODE', // código de «Probar eventos» (solo para verificar, no cuenta)
    default_country: 'cl',
    default_currency: 'CLP',
    default_event_source_url: 'https://dominio-del-cliente.example/',
    page_id: '', // Página de Facebook conectada al WhatsApp; obligatoria solo para conversiones Click-to-WhatsApp
  },
}

export function getClientConfig(slug: string): CapiClientConfig | null {
  return CAPI_CLIENTS[slug.toLowerCase()] ?? null
}
