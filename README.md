# <img src="./engenharia/frontend/public/logo.svg" width="40" height="40"> Sobre o Projeto

**Meu MEI: finanças em dia, dinheiro no bolso.**

## O Meu MEI

O **Meu MEI** é um mentor financeiro digital desenhado para transformar a vida do microempreendedor individual brasileiro. Mais do que um simples chatbot, é um agente proativo que utiliza IA Generativa para:

- **Antecipar necessidades:** Alerta sobre riscos de mistura de contas antes que o lucro seja comprometido.
- **Personalizar sugestões:** Adapta o tom de voz e as recomendações com base no nível de maturidade IAMF-MEI.
- **Cocriar soluções:** Atua de forma consultiva para ajudar a precificar produtos e gerenciar o fluxo de caixa.
- **Garantir confiabilidade:** Implementa estratégias anti-alucinação através de RAG (Grounding) em fontes oficiais.

🌐 **Acesse a aplicação:** [mentormei.vercel.app](https://mentormei.vercel.app)

---

## Estrutura do Repositório

Organizamos o projeto em dois pilares principais para manter a clareza entre a estratégia de negócio e a execução técnica:

### 📁 [negocio/](./negocio/)
Contém toda a documentação estratégica, definições da persona e métricas de sucesso.
- **[`agente-base.md`](./negocio/agente-base.md):** Persona, tom de voz e limitações.
- **[`arquitetura_sistema.md`](./negocio/arquitetura_sistema.md):** Fluxo lógico de dados e orquestração Multi-Agentes.
- **[`avaliacao_metricas.md`](./negocio/avaliacao_metricas.md):** Avaliação de assertividade e segurança.
- **[`solução-meu-mei.md`](./negocio/solução-meu-mei.md):** Proposta de valor e solução do problema.
- **Outros:** Desafios do setor, maturidade financeira e auditoria.

### 📁 [engenharia/](./engenharia/)
Contém a implementação funcional da aplicação (Front e Backend).
- **[`frontend/`](./engenharia/frontend/):** Interface em Next.js 15 com suporte multimodal.
- **[`backend/`](./engenharia/backend/):** Orquestrador em FastAPI integrado ao Google Gemini.
- **[`docs/`](./engenharia/docs/):** Documentação técnica complementar.
- **[`supabase_schema.sql`](./engenharia/supabase_schema.sql):** Estrutura do banco de dados.

---

## Fundamentos do Agente

### 1. Documentação e Caso de Uso
Resolvemos o problema da solidão na gestão financeira do MEI através de um mentor sempre disponível e proativo.
📄 **Detalhes:** [`negocio/agente-base.md`](./negocio/agente-base.md)

### 2. Base de Conhecimento
O agente fundamenta suas respostas em manuais do Bradesco, Sebrae e Governo Federal.
📄 **Índice:** [`engenharia/backend/knowledge/readme.md`](./engenharia/backend/knowledge/readme.md)

### 3. Engenharia de Prompts
Instruções rígidas garantem que a IA priorize saúde financeira e a parceria com o Bradesco.
📄 **Código:** [`engenharia/backend/app/prompts/system.py`](./engenharia/backend/app/prompts/system.py)

### 4. Avaliação e Métricas
Testamos o agente sob estresse para garantir que ele não alucine e mantenha a segurança.
📄 **Relatório:** [`negocio/avaliacao_metricas.md`](./negocio/avaliacao_metricas.md)

---

## Pilha Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| **LLM** | Google Gemini 2.0 Flash |
| **Backend** | FastAPI (Python) |
| **Frontend** | Next.js 15 (React 19) |
| **Banco/Vetores** | Supabase (PostgreSQL + pgvector) |
| **Hospedagem** | Vercel & Render |

---

## Pitch

O **Meu MEI** elimina o atrito burocrático através da inteligência artificial, permitindo que o empreendedor foque no que realmente importa: **o seu sonho**. Seja através de um áudio, uma foto de nota fiscal ou um texto simples, nós cuidamos dos números para que eles cuidem do seu futuro.

---
<sub>Meu MEI - Finanças em dia, dinheiro no bolso. © 2026</sub>
