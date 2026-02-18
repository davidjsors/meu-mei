
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

resp = supabase.table("profiles").select("*").execute()
print("--- PROFILES ---")
for row in resp.data:
    print(f"Phone: {row.get('phone_number')}")
    print(f"  Name: {row.get('name')}")
    print(f"  Dream: {row.get('dream')}")
    print(f"  Bal: {row.get('initial_balance')}")
    print(f"  Goal: {row.get('revenue_goal')}")
    print(f"  Score: {row.get('maturity_score')}")

resp = supabase.table("financial_records").select("*").order("created_at", desc=True).limit(5).execute()
print("\n--- RECENT RECORDS ---")
for row in resp.data:
    print(f"  {row.get('type')} | {row.get('amount')} | {row.get('category')} | {row.get('description')}")
