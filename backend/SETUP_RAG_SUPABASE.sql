-- Execute este script no SQL Editor do seu Supabase para ativar o RAG (Busca Vetorial)

-- 1. Ativar a extensão de vetores
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar a tabela para armazenar os fragmentos de conhecimento e seus embeddings
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(3072), -- Dimensão 3072 para o modelo gemini-embedding-001
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. (Opcional) Limpar antes de recriar
-- DROP TABLE IF EXISTS knowledge_embeddings CASCADE;

-- 4. Criar a função de busca (RPC) que o backend irá chamar
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding VECTOR(3072),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_embeddings.id,
    knowledge_embeddings.content,
    knowledge_embeddings.metadata,
    1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE 1 - (knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
