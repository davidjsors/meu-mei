
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:8000"
TEST_PHONE = "00-00000-0000"

def test_onboarding_flow():
    print("--- INICIANDO TESTE DE ONBOARDING ---")
    
    # 1. Submeter Maturidade
    payload = {
        "phone_number": TEST_PHONE,
        "name": "Testador Felipe",
        "business_type": "Desenvolvedor de Testes",
        "dream": "Ser um robô de elite",
        "revenue_goal": 10000.0,
        "initial_balance": 1500.50,
        "answers": [5, 5, 5, 5, 5]
    }
    
    print(f"Enviando maturidade para {TEST_PHONE}...")
    resp = requests.post(f"{API_URL}/api/user/maturity", json=payload)
    if resp.status_code != 200:
        print(f"ERRO: Status {resp.status_code} - {resp.text}")
        return
    
    profile = resp.json()
    print(f"DEBUG: Profile name={profile.get('name')}, Bal={profile.get('initial_balance')}")
    
    # 2. Verificar Resumo Financeiro
    print("Verificando resumo financeiro...")
    resp = requests.get(f"{API_URL}/api/user/finance/{TEST_PHONE}")
    summary = resp.json()
    print(f"DEBUG: Resumo: {summary}")
    
    # 3. Testar Chat (awareness do nome)
    print("Testando Chat...")
    chat_payload = {
        "phone_number": TEST_PHONE,
        "message": "Qual é o meu nome e qual o meu saldo inicial?"
    }
    resp = requests.post(f"{API_URL}/api/chat/send", data=chat_payload, stream=True)
    
    full_text = ""
    for line in resp.iter_lines():
        if line:
            line_str = line.decode('utf-8', errors='ignore')
            if line_str.startswith("data: "):
                try:
                    data_json = json.loads(line_str[6:])
                    if isinstance(data_json, dict) and "text" in data_json:
                        full_text += data_json["text"]
                        print(data_json["text"], end="", flush=True)
                except:
                    pass
    
    print("\n--- FIM DO CHAT ---")
    
    name_ok = "Felipe" in full_text
    balance_ok = "1.500" in full_text or "1500" in full_text
    
    if name_ok: print("✅ AI reconheceu o nome!")
    else: print(f"❌ AI NÃO usou o nome no texto. Texto: {full_text[:50]}...")

    if balance_ok: print("✅ AI reconheceu o saldo inicial!")
    else: print(f"❌ AI NÃO mencionou o saldo inicial.")

if __name__ == "__main__":
    test_onboarding_flow()
