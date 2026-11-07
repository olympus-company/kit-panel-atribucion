// Identidad para las páginas INTERNAS del panel (rutas internas del equipo) y sus
// acciones: ahora SOLO por sesión de Supabase (admin o equipo). Desde la Fase 0 · D2 (2-oct-2026) estas páginas
// ya no aceptan `?k=` (la llave maestra abría el panel de todos los clientes a quien la viera en un Custom Menu Link).

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sesionActual } from '@/lib/auth/sesion'
import { loginUrl } from '@/lib/auth/safe-next'

export type Viewer = { name: string; keyId: string; isAdmin: boolean; role?: string }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-app.example'

// Persona con sesión → Viewer (admin o rol del equipo; el partner comercial queda fuera). null si no hay sesión válida.
export async function getSessionViewer(): Promise<Viewer | null> {
  const sesion = await sesionActual()
  if (!sesion) return null
  const p = sesion.perfil
  if (!p?.role || p.is_active === false) return null
  return { name: p.full_name || sesion.email || 'Equipo', keyId: sesion.userId, isAdmin: p.role === 'admin', role: p.role }
}

// Para páginas: sin sesión → /login (y vuelve a `nextPath` al entrar); con sesión pero sin rol de equipo → 404.
export async function requireSessionViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getSessionViewer()
  if (viewer) return viewer
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(nextPath ? loginUrl(nextPath) : '/login')
  notFound()
}

// Paneles de CLIENTE (embebidos en el CRM, sin login): aceptan SOLO la llave propia de ese cliente (ya no hay
// llave maestra). `envPropia` es el nombre de la variable con la llave de ESE cliente.
export function aceptaLlavePanel(k: string | null | undefined, envPropia: string): boolean {
  if (!k) return false
  const validas = [process.env[envPropia]].filter(Boolean)
  return validas.includes(k)
}

// Variable con la llave propia de cada panel de cliente, por el slug de /panel/<slug>.
const ENV_LLAVE_PANEL: Record<string, string> = {
  'cliente-ejemplo': 'CLIENTE_PANEL_KEY',
  'cliente-ejemplo-v2': 'CLIENTE_PANEL_KEY',
  // agrega aquí un slug por cliente → nombre de su variable de llave
}

// Link completo al panel de un cliente con SU llave (para mensajes). Acepta "/panel/ejemplo" o "ejemplo". null si no hay llave.
export function enlacePanelCliente(rutaOSlug: string, baseUrl: string): string | null {
  const slug = rutaOSlug.replace(/^\/?panel\//, '').replace(/^\//, '').split('?')[0]
  const env = ENV_LLAVE_PANEL[slug]
  const llave = env ? process.env[env] : undefined
  return llave ? `${baseUrl}/panel/${slug}?k=${encodeURIComponent(llave)}` : null
}

// Link interno a la ficha/entrega de un cliente para correos, tareas y botones del equipo: pasa por
// /ir/cliente/<slug> (sin llave en el link).
export function enlaceClienteInterno(slug: string, tab?: string): string {
  return `${APP_URL}/ir/cliente/${slug}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`
}
