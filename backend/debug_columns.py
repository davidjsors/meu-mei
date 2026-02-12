
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
PHONE = "34-99775-3495"

def check_keys():
    resp = supabase.table("profiles").select("*").eq("phone_number", PHONE).execute()
    if resp.data:
        keys = resp.data[0].keys()
        print(f"Colunas encontradas: {list(keys)}")
        if "terms_accepted_at" in keys:
            print("terms_accepted_at EXISTE.")
        else:
            print("terms_accepted_at NÃO EXISTE (CAUSA PROVÁVEL DO ERRO).")

if __name__ == "__main__":
    check_keys()
