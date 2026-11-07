-- 037_ctwa_attribution.sql
-- Captura del ctwa_clid (Click-to-WhatsApp Click ID) que Meta inyecta en el `referral` del PRIMER mensaje
-- de un lead que llegó por un anuncio Click-to-WhatsApp. Lo recibe nuestro webhook propio
-- (/api/whatsapp-webhook), suscrito en PARALELO a la WABA del cliente — porque GHL/Sharp lo despoja.
-- Se usa al convertir (CompleteRegistration / Purchase / AddPaymentInfo) para que Meta atribuya al anuncio.
create table if not exists public.ctwa_attribution (
  id uuid primary key default gen_random_uuid(),
  location_id text not null,
  phone text not null,           -- wa_id del lead (su número), clave de búsqueda al convertir
  ctwa_clid text not null,       -- referral.ctwa_clid (el "ticket" del clic)
  source_id text,                -- referral.source_id = ad id del anuncio
  headline text,                 -- referral.headline (contexto/debug)
  captured_at timestamptz not null default now(),
  unique (location_id, phone)
);

create index if not exists idx_ctwa_attribution_lookup on public.ctwa_attribution (location_id, phone);

-- Solo el service role (server-side) lee/escribe esta tabla. RLS encendido sin políticas públicas =
-- nadie accede salvo el service role (que omite RLS). Consistente con las demás tablas internas del bot.
alter table public.ctwa_attribution enable row level security;
