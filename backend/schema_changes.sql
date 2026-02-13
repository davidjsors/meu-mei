-- SQL para configurar o telefone como chave única/primária na tabela profiles
-- Execute este comando no SQL Editor do seu console Supabase para garantir a integridade dos dados.

-- 1. Se a tabela profiles ainda não tem uma chave primária baseada no telefone:
ALTER TABLE profiles ADD PRIMARY KEY (phone_number);

-- OU, se você preferir manter um ID serial e apenas garantir a unicidade:
-- ALTER TABLE profiles ADD CONSTRAINT unique_phone_number UNIQUE (phone_number);

-- 2. Garantir que as tabelas relacionadas usem o phone_number como chave estrangeira (opcional, mas recomendado para integridade)
-- ALTER TABLE financial_records 
-- ADD CONSTRAINT fk_profile_records 
-- FOREIGN KEY (phone_number) REFERENCES profiles(phone_number)
-- ON DELETE CASCADE;

-- ALTER TABLE messages 
-- ADD CONSTRAINT fk_profile_messages 
-- FOREIGN KEY (phone_number) REFERENCES profiles(phone_number)
-- ON DELETE CASCADE;
