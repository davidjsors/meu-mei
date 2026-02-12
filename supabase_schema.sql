-- ═══════════════════════════════════════════════════════
-- MeuMEI — Schema SQL para Supabase
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- Perfil do usuário
-- ID = número de telefone no formato DD-XXXXX-XXXX
CREATE TABLE IF NOT EXISTS profiles (
  phone_number TEXT PRIMARY KEY,
  name TEXT,
  dream TEXT,
  maturity_score INT CHECK (maturity_score BETWEEN 5 AND 25),
  maturity_level TEXT CHECK (maturity_level IN ('vulneravel', 'organizacao', 'visionario')),
  revenue_goal DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens do chat (suporta multimodal)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT REFERENCES profiles(phone_number) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'pdf')),
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registros financeiros extraídos das conversas
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT REFERENCES profiles(phone_number) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  category TEXT,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  record_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_phone ON financial_records(phone_number, created_at);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: acesso público para o MVP (backend autenticado via service key)
-- Em produção, trocar por políticas baseadas em auth.uid()
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on financial_records" ON financial_records FOR ALL USING (true) WITH CHECK (true);
