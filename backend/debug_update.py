
import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime
import json

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
PHONE = "34-99775-3495"

def test_update():
    print(f"Tentando atualizar terms_accepted E DATA para: {PHONE}")
    
    data = {
        "terms_accepted": True,
        "terms_accepted_at": datetime.utcnow().isoformat()
    }
    
    try:
        resp = supabase.table("profiles").update(data).eq("phone_number", PHONE).execute()
        if resp.data:
            print("Atualização SUCESSO via script direto.")
            print(resp.data[0])
        else:
            print("Atualização falhou (sem dados retornados).")
    except Exception as e:
        print(f"Erro ao atualizar: {e}")
        if hasattr(e, 'code'): print(f"Code: {e.code}")
        if hasattr(e, 'message'): print(f"Message: {e.message}")

if __name__ == "__main__":
    test_update()
