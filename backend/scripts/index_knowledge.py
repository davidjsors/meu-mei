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

def chunk_text(text, size=1500, overlap=200):
    """Divide o texto em pedaços menores para melhor precisão no RAG."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += (size - overlap)
    return chunks

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
        # Deleta tudo que não seja o registro de placeholder (se houver)
        db.table("knowledge_embeddings").delete().neq("id", 0).execute() 
    except Exception as e:
        print(f"[WARN] Erro ao limpar base (pode estar vazia): {e}")

    for filename in os.listdir(knowledge_dir):
        if filename.endswith((".txt", ".md")):
            print(f"[LOG] Processando: {filename}")
            filepath = os.path.join(knowledge_dir, filename)
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Divide em pedaços para o Gemini focar melhor
            chunks = chunk_text(content)
            print(f"   [LOG] Gerados {len(chunks)} fragmentos.")
            
            for i, chunk in enumerate(chunks):
                try:
                    # Gera embedding
                    embedding_raw = get_embedding(chunk)
                    embedding = list(embedding_raw) # Garante que seja uma lista simples
                    
                    # Salva no Supabase
                    db.table("knowledge_embeddings").insert({
                        "content": chunk,
                        "embedding": embedding,
                        "metadata": {
                            "filename": filename,
                            "chunk_index": i
                        }
                    }).execute()
                    print(f"   [OK] Fragmento {i+1}/{len(chunks)} salvo.")
                    
                    # Pequeno delay para evitar Rate Limit
                    time.sleep(0.5)
                except Exception as e:
                    print(f"   [ERRO] No fragmento {i+1}: {str(e)}")

    print("[INFO] Indexação concluída com sucesso!")

if __name__ == "__main__":
    index_all()
