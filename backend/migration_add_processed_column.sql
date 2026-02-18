-- Adiciona coluna 'processed' para controle de mensagens já tratadas pela IA/backend
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Marca mensagens antigas como processadas para evitar reprocessamento
UPDATE messages SET processed = TRUE; 
