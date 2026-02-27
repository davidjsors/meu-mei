import os
import sys
import json
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from supabase import create_client
from app.services.ai import get_embedding

async def import_json():
    print("[1] Lendo arquivo JSON...")
    try:
        with open("conhecimento_processado.json", "r", encoding="utf-8") as f:
            data = json.load(f, strict=False)
    except Exception as e:
        print(f"Erro ao ler JSON: {e}")
        return

    print(f"[2] Conectando ao Banco. Total de páginas para indexar: {len(data)}")
    db = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # 1. Obter filenames únicos para deletar antes de inserir
    filenames_to_delete = set()
    for item in data:
        fname = item.get("filename")
        if fname:
            filenames_to_delete.add(fname)
            
    if filenames_to_delete:
        print(f"[3] Deletando embeddings antigos dos arquivos: {filenames_to_delete}")
        for fname in filenames_to_delete:
            try:
                # Filtrando e removendo pelo JSON metadata do supabase
                db.table("knowledge_embeddings").delete().eq("metadata->>filename", fname).execute()
            except Exception as e:
                print(f"  [AVISO] Nao foi possivel deletar {fname}: {e}")
    
    print("\n[4] Iniciando vetorização...")
    # Prepare batch records
    records = []
    for item in data:
        filename = item.get("filename")
        page_num = item.get("page_number")
        title = item.get("page_title")
        summary = item.get("summary")
        full_text = item.get("full_content")
        print(f"  -> Vetorizando e preparando registro: {filename} (Pág {page_num})")
        try:
            embedding_raw = get_embedding(summary)
            records.append({
                "content": summary,
                "embedding": embedding_raw,
                "metadata": {
                    "filename": filename,
                    "page_number": page_num,
                    "page_title": title,
                    "full_content": full_text
                }
            })
        except Exception as e:
            print(f"   [ERRO] Falha ao gerar embedding para página {page_num} de {filename}: {e}")
    # Batch insert
    if records:
        try:
            db.table("knowledge_embeddings").insert(records).execute()
            sucesso = len(records)
        except Exception as e:
            print(f"   [ERRO] Falha na inserção em lote: {e}")
            sucesso = 0
    else:
        sucesso = 0

    print(f"\n[5] Concluído! {sucesso} registros inseridos com sucesso na base RAG.")

if __name__ == "__main__":
    asyncio.run(import_json())
