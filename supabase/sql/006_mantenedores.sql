-- MANTENEDORES-001: Create mantenedores table for the /apoie page.
-- Mantenedores are supporters who register via the public form
-- or are added manually by admin from physical cards collected at events.
--
-- id: auto-generated UUID
-- created_at: timestamp of registration
-- nome: supporter name (required)
-- whatsapp: phone number
-- email: email address
-- valor_mensal: monthly contribution amount

CREATE TABLE IF NOT EXISTS public.mantenedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  whatsapp text,
  email text,
  valor_mensal decimal,
  CONSTRAINT mantenedores_pkey PRIMARY KEY (id)
);

-- Allow public insert (for the /apoie form) and public read (for the counter)
ALTER TABLE public.mantenedores ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can insert mantenedores"
  ON public.mantenedores
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read (for the social proof counter)
CREATE POLICY "Anyone can read mantenedores"
  ON public.mantenedores
  FOR SELECT
  USING (true);

-- Admin can update/delete (authenticated users)
CREATE POLICY "Authenticated users can update mantenedores"
  ON public.mantenedores
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete mantenedores"
  ON public.mantenedores
  FOR DELETE
  USING (auth.role() = 'authenticated');