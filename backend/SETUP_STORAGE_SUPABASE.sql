-- RODE ESTE SCRIPT NO EDITOR SQL DO SUPABASE PARA HABILITAR O STORAGE
-- Isso criará um bucket público chamado 'uploads' para salvar imagens, PDFs e Áudios do Meu MEI.

-- 1. Criar o bucket 'uploads' (se não existir)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- 2. Política de Acesso: Permitir que QUALQUER UM veja os arquivos (necessário para o Frontend tocar áudio/ver imagem)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'uploads' );

-- 3. Política de Upload: Permitir que apenas usuários autenticados (ou a API via chave Service Role) façam upload
-- Como nossa API usa a Service Role Key no backend, ela terá permissão total, mas é bom deixar explícito.
create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'uploads' );

-- 4. Política de Delete: Permitir deletar (caso precisemos limpar)
create policy "Authenticated Delete"
on storage.objects for delete
using ( bucket_id = 'uploads' );
