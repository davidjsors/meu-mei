# 💰 Meu MEI - Seu Mentor Financeiro 24/7

**Finanças em dia, dinheiro no bolso.**

Meu MEI é um mentor financeiro digital baseado em IA generativa, desenhado para o microempreendedor individual (MEI) brasileiro.

## 🏗️ Arquitetura

| Camada | Tecnologia | Hospedagem |
|--------|-----------|------------|
| Frontend | Next.js 15 + React 19 | Vercel (grátis) |
| Backend | FastAPI (Python) | Render (grátis) |
| Banco de Dados | PostgreSQL | Supabase (grátis) |
| IA | Google Gemini API | Free tier |

> ⚠️ **Cold Start:** O backend no Render dorme após 15 min de inatividade. A primeira requisição pode levar ~30 segundos.

## 🚀 Setup Local

### Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- Conta no [Supabase](https://supabase.com) (grátis)
- Chave da [Google AI Studio](https://aistudio.google.com/) (grátis)

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Configurar variáveis de ambiente
copy .env.example .env
# Edite .env com suas chaves

# Rodar
uvicorn app.main:app --reload --port 8000
```

### 2. Banco de Dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, execute o conteúdo de `supabase_schema.sql`
3. Em Storage, crie um bucket chamado `attachments` (público)
4. Copie a URL e a anon key para os `.env`

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
# Edite .env.local com suas chaves

npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## 📚 Knowledge Base (Grounding)

Adicione documentos de referência na pasta `backend/knowledge/`:

- PDFs de produtos financeiros Bradesco
- Regras MEI do Banco Central
- Guias de gestão financeira do Sebrae

Esses documentos são usados pela IA para fundamentar suas respostas.

## 🌐 Deploy (Custo Zero)

### Frontend → Vercel
1. Conecte o repositório no [Vercel](https://vercel.com)
2. Configure o Root Directory: `frontend`
3. Adicione as variáveis de ambiente

### Backend → Render
1. Conecte o repositório no [Render](https://render.com)
2. O `render.yaml` configura o deploy automaticamente
3. Adicione as variáveis de ambiente

## 📖 Documentação

| Documento | Descrição |
|-----------|-----------|
| [agente-base.md](agente-base.md) | Persona, tom de voz, limitações do agente |
| [solução-meu-mei.md](solução-meu-mei.md) | Proposta de valor e diferenciais |
| [maturidade-mei.md](maturidade-mei.md) | Questionário IAMF-MEI |
| [desafios-oportunidades-mei.md](desafios-oportunidades-mei.md) | Contexto, dados e referências |

---

<p align="center">
  <sub>Meu MEI - Finanças em dia, dinheiro no bolso. © 2026</sub>
</p>