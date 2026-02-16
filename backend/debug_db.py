
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

resp = supabase.table("profiles").select("*").execute()
print("PROFILES:")
for row in resp.data:
    print(f"Phone: {row.get('phone_number')}, Name: {row.get('name')}, Dream: {row.get('dream')}, Bal: {row.get('initial_balance')}, Score: {row.get('maturity_score')}")

resp = supabase.table("financial_records").select("*").limit(10).execute()
print("\nFINANCIAL RECORDS (last 10):")
for row in resp.data:
    print(row)
