
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais Supabase não encontradas.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PHONE = "34-99775-3495"

def check_profile():
    print(f"Verificando perfil para: {PHONE}")
    resp = supabase.table("profiles").select("*").eq("phone_number", PHONE).execute()
    
    if not resp.data:
        print("Perfil NÃO ENCONTRADO.")
    else:
        profile = resp.data[0]
        print(f"Perfil encontrado:")
        print(f"- Nome: {profile.get('name')}")
        print(f"- Terms Accepted: {profile.get('terms_accepted')}")
        print(f"- Created At: {profile.get('created_at')}")
        print(f"- Full Data: {profile}")

if __name__ == "__main__":
    check_profile()
