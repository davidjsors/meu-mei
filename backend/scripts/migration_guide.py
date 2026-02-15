
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: SUPABASE_URL ou SUPABASE_KEY não configurados no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def migrate():
    print("Iniciando migração da tabela 'messages'...")
    try:
        # Tenta disparar um comando SQL via RPC ou uma query que force a criação (se o supabase permitir via Python)
        # Como o SDK de Python não tem comando direto 'ALTER TABLE', sugerimos rodar o SQL abaixo no painel do Supabase.
        
        sql = """
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
        UPDATE messages SET processed = TRUE; -- Mark old messages as processed
        """
        
        print("\n--- ATENÇÃO: COMANDO SQL REQUERIDO ---")
        print("Para garantir a segurança, por favor, copie e cole o comando abaixo no 'SQL Editor' do seu painel Supabase:\n")
        print(sql)
        print("\n--------------------------------------")
        
    except Exception as e:
        print(f"Erro ao tentar migrar: {e}")

if __name__ == "__main__":
    migrate()
