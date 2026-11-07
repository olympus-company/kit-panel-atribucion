-- 040_capi_send_log.sql
-- Bitácora de cada envío CAPI → Meta (todos los clientes). Da visibilidad de "¿está llegando la
-- conversión a Meta?" sin abrir Events Manager: cada fila = un evento enviado, con su atribución
-- (business_messaging vs system_generated), el anuncio (source_id/ctwa_clid), el status, y CLAVE: test_mode
-- (¿llevó test_event_code? = Test Events, no cuenta · vs LIVE = cuenta real). La escribe logCapiSend()
-- (best-effort, nunca rompe el envío). Se ve en /qa/capi-log.
create table if not exists public.capi_send_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null,                  -- cliente CAPI (un slug por cliente)
  location_id text,                    -- location GHL
  event_name text not null,            -- CompleteRegistration / AddPaymentInfo / Purchase
  event_id text,
  source_id text,                      -- Ad ID (de ctwa_attribution)
  ctwa_clid text,                      -- click-id CTWA (atribución al anuncio exacto)
  action_source text,                  -- business_messaging (atribuido) vs system_generated
  test_mode boolean not null default false, -- ¿llevó test_event_code? true = Test Events (no cuenta)
  status int,                          -- HTTP status de Meta
  ok boolean,
  events_received int,
  value numeric
);

create index if not exists idx_capi_send_log_created on public.capi_send_log (created_at desc);
create index if not exists idx_capi_send_log_slug on public.capi_send_log (slug, created_at desc);

-- Service-role only (RLS on, sin políticas = nadie accede salvo el service role).
alter table public.capi_send_log enable row level security;
