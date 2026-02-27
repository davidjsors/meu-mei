"""
Script para indexar arquivos da pasta knowledge/ no Supabase usando embeddings do Gemini.
Autor: Meu MEI
"""

import os
import sys
import io
import time

# Garante que a saída do terminal suporte UTF-8 no Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Adiciona o diretório backend ao path para importar as configurações
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.services.ai import get_embedding
from supabase import create_client
import re

def chunk_by_page(text):
    """
    Divide o texto em 'páginas' semânticas baseadas em cabeçalhos Markdown (# ou ##).
    Retorna uma lista de dicionários com 'title' e 'content'.
    """
    # Regex para capturar cabeçalhos (# ou ##) e o conteúdo até o próximo cabeçalho
    # Pattern: ^(#{1,2}\s+.*?)\n(.*?)(?=^#{1,2}\s+|\Z) com re.MULTILINE e re.DOTALL
    pattern = re.compile(r'^(#{1,2}\s+[^\n]+)\n(.*?)(?=^#{1,2}\s+|\Z)', re.MULTILINE | re.DOTALL)
    
    matches = pattern.finditer(text)
    chunks = []
    
    # Se o texto não comecar com Header, capturamos a introdução
    intro_match = re.match(r'\A(.*?)(?=^#{1,2}\s+)', text, re.MULTILINE | re.DOTALL)
    if intro_match and intro_match.group(1).strip():
        chunks.append({
            "title": "Introdução",
            "content": intro_match.group(1).strip()
        })

    for match in matches:
        title = match.group(1).strip()
        content = match.group(2).strip()
        if content: # Ignora headers sem conteúdo
             chunks.append({"title": title, "content": title + "\n\n" + content}) # Mantém o título no contexto do chunk inteiro
             
    # Fallback se não achar divisões Markdown (arquivos texto simples)
    if not chunks and text.strip():
        chunks.append({"title": "Conteúdo Geral", "content": text.strip()})
        
    return chunks

def generate_page_summary(page_title, page_content):
    """
    Gera um resumo conciso da página para ajudar o Multi-Vector Retriever
    a encontrar focar no contexto chave durante a busca vetorial.
    """
    from app.services.ai import manager
    from google.genai import types
    
    prompt = f"Gere um resumo altamente descritivo e conciso (máximo de 3 frases) do seguinte trecho de documentação chamado '{page_title}'. Este resumo será convertido em embedding para um sistema RAG focado em apoiar Microempreendedores Individuais (MEI).\n\nConteúdo:\n{page_content[:4000]}"
    
    max_retries = len(manager.api_keys)
    for _ in range(max_retries):
        try:
            response = manager.client.models.generate_content(
                model=settings.GEMINI_MODEL, # Voltando ao modelo do env (gemini-2.5-flash)
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=256),
            )
            return response.text.strip() if response and response.text else "Resumo indisponível"
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "quota" in err_msg:
                print(f"      [RATE LIMIT] Limite da API atingido. Aguardando 15 segundos...")
                import time
                time.sleep(15)
            
            if manager.is_rotatable_error(e) and manager.rotate_key():
                continue
            
            print(f"Erro ao gerar resumo para {page_title}: {e}")
            break
            
    # Se falhar a IA, usamos fallback: apenas parte do conteúdo extraído para o vetor não quebrar.
    return (page_title + ": " + page_content)[:500] 

def index_all():
    print("[INFO] Iniciando indexação da base de conhecimento...")
    
    # Inicializa clientes
    db = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge")
    
    if not os.path.exists(knowledge_dir):
        print(f"[ERRO] Pasta {knowledge_dir} não encontrada.")
        return

    # Limpa indexação anterior para garantir que tudo esteja fresco e sem duplicatas
    try:
        print("[INFO] Limpando base antiga...")
        # Deleta as linhas enviando um UUID fake na query negada (já que "not null" direto da erro na lib)
        db.table("knowledge_embeddings").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute() 
    except Exception as e:
        print(f"[WARN] Erro ao limpar base (pode estar vazia): {e}")

    for filename in os.listdir(knowledge_dir):
        if filename.endswith((".txt", ".md")):
            print(f"[LOG] Processando: {filename}")
            filepath = os.path.join(knowledge_dir, filename)
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            pages = chunk_by_page(content)
            print(f"   [LOG] Geradas {len(pages)} páginas semânticas.")
            
            for i, page in enumerate(pages):
                try:
                    title = page["title"]
                    full_content = page["content"]
                    
                    print(f"   [{i+1}/{len(pages)}] Gerando resumo para: {title[:30]}...")
                    summary = generate_page_summary(title, full_content)
                    
                    # O Embedding é focado APENAS no resumo curado pela IA (Multi-Vector)
                    embedding_raw = get_embedding(summary)
                    embedding = list(embedding_raw)
                    
                    # Salva no Supabase (coluna "content" é o resumo de busca, e o "full_content" vai pro metadata)
                    db.table("knowledge_embeddings").insert({
                        "content": summary,
                        "embedding": embedding,
                        "metadata": {
                            "filename": filename,
                            "page_number": i + 1,
                            "page_title": title,
                            "full_content": full_content
                        }
                    }).execute()
                    print(f"   [OK] Página salva.")
                    
                    time.sleep(15) # Delay agressivo (4 requests por minuto máx = 15s) para o Free Tier
                except Exception as e:
                    print(f"   [ERRO] Na página {str(i+1)}: {str(e)}")

    print("[INFO] Indexação concluída com sucesso!")

if __name__ == "__main__":
    index_all()
