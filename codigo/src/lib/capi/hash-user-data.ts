import { createHash } from 'crypto'

function sha256(input: string): string {
  return createHash('sha256').update(input.trim().toLowerCase()).digest('hex')
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

export interface RawUserData {
  email?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
  city?: string | null
  country?: string | null
  fbp?: string | null
  fbc?: string | null
  // ctwa_clid: click-id de Click-to-WhatsApp (viene en referral.ctwa_clid del 1er mensaje). Se manda
  // CRUDO (no hasheado), igual que fbc/fbp. Necesario para atribuir conversiones CTWA a la campaña.
  ctwa_clid?: string | null
  // external_id: identificador propio (ej. contactId de GHL) para reforzar el match cuando no hay
  // email/teléfono confiables. Meta lo espera hasheado, igual que em/ph.
  external_id?: string | null
  client_ip_address?: string | null
  client_user_agent?: string | null
}

export interface HashedUserData {
  em?: string[]
  ph?: string[]
  fn?: string[]
  ln?: string[]
  ct?: string[]
  country?: string[]
  fbp?: string
  fbc?: string
  ctwa_clid?: string
  external_id?: string[]
  // page_id de la Página FB (CTWA/business_messaging). Va crudo dentro de user_data; lo inyecta meta-capi.
  page_id?: string
  client_ip_address?: string
  client_user_agent?: string
}

export function hashUserData(raw: RawUserData): HashedUserData {
  const out: HashedUserData = {}
  if (raw.email) out.em = [sha256(raw.email)]
  if (raw.phone) out.ph = [sha256(normalizePhone(raw.phone))]
  if (raw.first_name) out.fn = [sha256(raw.first_name)]
  if (raw.last_name) out.ln = [sha256(raw.last_name)]
  if (raw.city) out.ct = [sha256(raw.city)]
  if (raw.country) out.country = [sha256(raw.country)]
  if (raw.fbp) out.fbp = raw.fbp
  if (raw.fbc) out.fbc = raw.fbc
  if (raw.ctwa_clid) out.ctwa_clid = raw.ctwa_clid
  if (raw.external_id) out.external_id = [sha256(raw.external_id)]
  if (raw.client_ip_address) out.client_ip_address = raw.client_ip_address
  if (raw.client_user_agent) out.client_user_agent = raw.client_user_agent
  return out
}
