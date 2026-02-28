# Engenharia Meu MEI

Este diretório contém a implementação técnica da plataforma **Meu MEI**, dividida entre o servidor de API (Backend) e a interface do usuário (Frontend).

## Estrutura
- `/backend`: Orquestrador em FastAPI, lógica de IA e integração com Supabase.
- `/frontend`: Interface Web construída com Next.js 15 e React 19.
- `/docs`: Documentações técnicas adicionais, incluindo o [**Contrato de API**](./docs/api_reference.md).

---

## 🚀 Como Rodar Localmente

### 1. Backend (FastAPI)
O backend é responsável por processar as requisições de IA e gerenciar o banco de dados.

**Pré-requisitos:** Python 3.10+

1. Entre na pasta do backend:
   ```bash
   cd engenharia/backend
   ```
2. Crie e ative o ambiente virtual:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # venv\Scripts\activate  # Windows
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure o arquivo `.env` (use o `.env.example` como base).
5. Inicie o servidor:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
O backend estará disponível em `http://localhost:8000`.

### 2. Frontend (Next.js)
Interface moderna para interação do usuário com o mentor.

**Pré-requisitos:** Node.js 18+ e npm/yarn.

1. Entre na pasta do frontend:
   ```bash
   cd engenharia/frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env` (use o `.env.example` como base).
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
O frontend estará disponível em `http://localhost:3000`.

---

## 🛠️ Tecnologias Utilizadas
- **Backend:** FastAPI, Python, Google GenAI SDK (Gemini).
- **Frontend:** Next.js 15, React 19, Tailwind CSS.
- **Banco de Dados:** Supabase (PostgreSQL + pgvector para RAG).

---

## 📝 Variáveis de Ambiente Necessárias

| Variável | Descrição |
|----------|-----------|
| `GEMINI_API_KEY` | Chave da API do Google Gemini. |
| `SUPABASE_URL` | URL do seu projeto Supabase. |
| `SUPABASE_KEY` / `ANON_KEY` | Chave pública do Supabase. |
| `NEXT_PUBLIC_API_URL` | URL do backend (geralmente `http://localhost:8000`). |
