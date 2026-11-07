-- Fathom calls + sales cockpit primitives for managed client dashboards.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS fathom_config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.client_closers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  fathom_email text NOT NULL,
  crm_user_id text,
  country_code text NOT NULL DEFAULT 'CL',
  role text NOT NULL DEFAULT 'closer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_closers_role_check CHECK (role IN ('closer', 'owner', 'sdr')),
  CONSTRAINT client_closers_country_code_check CHECK (country_code IN ('CL', 'MX', 'US', 'CO', 'PE', 'AR', 'EC')),
  CONSTRAINT client_closers_email_unique UNIQUE (client_id, fathom_email)
);

CREATE TABLE IF NOT EXISTS public.fathom_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  closer_id uuid REFERENCES public.client_closers(id) ON DELETE SET NULL,
  fathom_meeting_id text NOT NULL UNIQUE,
  share_url text,
  recorded_at timestamptz NOT NULL,
  duration_seconds int,
  prospect_email text,
  prospect_name text,
  prospect_phone text,
  transcript_raw text,
  score int CHECK (score BETWEEN 0 AND 100),
  outcome text NOT NULL DEFAULT 'pendiente' CHECK (outcome IN ('ganada', 'perdida', 'no-show', 'pendiente')),
  tier_quoted text CHECK (tier_quoted IN ('plan_a', 'plan_b', 'plan_c', 'plan_d')),
  trigger_arrival text,
  trigger_outcome text,
  objection_main text,
  talk_ratio_closer int CHECK (talk_ratio_closer BETWEEN 0 AND 100),
  questions_count int,
  price_mentioned_min int,
  cases_mentioned int,
  silences_count int,
  ai_recommendation text,
  matched_gatillo text,
  matched_objection text,
  crm_opportunity_id text,
  crm_contact_id text,
  processed_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fathom_calls_client_idx ON public.fathom_calls (client_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS fathom_calls_closer_idx ON public.fathom_calls (closer_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS fathom_calls_outcome_idx ON public.fathom_calls (outcome, recorded_at DESC);
CREATE INDEX IF NOT EXISTS fathom_calls_opp_idx ON public.fathom_calls (crm_opportunity_id);
CREATE INDEX IF NOT EXISTS client_closers_client_idx ON public.client_closers (client_id, is_active);

ALTER TABLE public.client_closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fathom_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_closers_admin_select ON public.client_closers;
CREATE POLICY client_closers_admin_select ON public.client_closers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS fathom_calls_admin_select ON public.fathom_calls;
CREATE POLICY fathom_calls_admin_select ON public.fathom_calls
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- (El seed con los closers reales se quitó del kit. Cada closer se registra con su correo de Fathom:
--  INSERT INTO public.client_closers (client_id, full_name, fathom_email, country_code, role)
--  VALUES ('<client_id>', 'Nombre', 'correo@dominio.com', 'CL', 'closer');)
