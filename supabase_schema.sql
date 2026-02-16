-- ═══════════════════════════════════════════════════════
-- MeuMEI — Schema SQL para Supabase (Atualizado)
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.profiles (
  phone_number text NOT NULL PRIMARY KEY,
  name text,
  dream text,
  business_type text,
  initial_balance numeric DEFAULT 0,
  revenue_goal numeric DEFAULT 0,
  maturity_score integer CHECK (maturity_score >= 5 AND maturity_score <= 25),
  maturity_level text CHECK (maturity_level = ANY (ARRAY['vulneravel'::text, 'organizacao'::text, 'visionario'::text])),
  summary text,
  last_summary_at timestamp with time zone,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamp with time zone,
  pin_hash text,
  social_provider text,
  social_id text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text REFERENCES public.profiles(phone_number) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text,
  content_type text DEFAULT 'text'::text CHECK (content_type = ANY (ARRAY['text'::text, 'image'::text, 'audio'::text, 'pdf'::text])),
  file_url text,
  file_name text,
  processed boolean DEFAULT false,
  parent_id uuid REFERENCES public.messages(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.financial_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text REFERENCES public.profiles(phone_number) ON DELETE CASCADE,
  type text NOT NULL CHECK (type = ANY (ARRAY['entrada'::text, 'saida'::text])),
  category text,
  amount numeric NOT NULL,
  description text,
  record_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_phone ON financial_records(phone_number, created_at);
