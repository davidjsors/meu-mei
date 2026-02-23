# <img src="./engenharia/frontend/public/logo.svg" width="40" valign="middle"> **Meu MEI: finanças em dia, dinheiro no bolso.**

## O Meu MEI

O **Meu MEI** é um mentor financeiro digital desenhado para transformar a vida do(a) microempreendedor(a) individual (MEI) brasileiro(a). Mais do que um simples chatbot, é um agente proativo que utiliza IA Generativa para:

- **Antecipar necessidades:** Alerta sobre riscos de mistura de contas antes que o lucro seja comprometido.
- **Personalizar sugestões:** Adapta o tom de voz e as recomendações com base no nível de maturidade IAMF-MEI.
- **Cocriar soluções:** Atua de forma consultiva para ajudar a gerenciar as finanças da empresa.
- **Garantir confiabilidade:** Implementa estratégias anti-alucinação através de RAG (Grounding) em fontes oficiais.

🌐 **Acesse a aplicação:** [mentormei.vercel.app](https://mentormei.vercel.app)

 <img src="./engenharia/frontend/public/logo2.svg" width="400" valign="middle"> 

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
  - **[`guia_responsividade.md`](./engenharia/docs/guia_responsividade.md):** Guia técnico de design mobile-first e padrões de UI.
- **[`supabase_schema.sql`](./engenharia/supabase_schema.sql):** Estrutura do banco de dados.

---

## Fundamentos do Agente

### 1. Documentação e Caso de Uso
Resolvemos o problema da solidão na gestão financeira do MEI através de um mentor sempre disponível e proativo.
📄 **Detalhes:**[`negocio/agente-base.md`](./negocio/agente-base.md)

### 2. Base de Conhecimento
O agente fundamenta suas respostas em manuais do Bradesco, Sebrae e Governo Federal.
📄 **Índice:**[`engenharia/backend/knowledge/readme.md`](./engenharia/backend/knowledge/readme.md)

### 3. Engenharia de Prompts
Instruções rígidas garantem que a IA priorize saúde financeira e a parceria com o **Bradesco**.
📄 **Código:**[`engenharia/backend/app/prompts/system.py`](./engenharia/backend/app/prompts/system.py)

### 4. Avaliação e Métricas
Testamos o agente sob estresse para garantir que ele não alucine e mantenha a segurança.
📄 **Relatório:**[`negocio/avaliacao_metricas.md`](./negocio/avaliacao_metricas.md)

---

## Stack Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| **LLM** | Google Gemini 2.5 Flash |
| **Backend** | FastAPI (Python) |
| **Frontend** | Next.js 15 (React 19) |
| **Banco/Vetores** | Supabase (PostgreSQL + pgvector) |
| **Hospedagem** | Vercel (Frontend & Backend) |

---


## Pitch

 > Imagine trabalhar de domingo a domingo, sendo o vendedor, o entregador e o gerente do seu negócio, e sentir que o seu esforço serve apenas para pagar boleto. Essa é a solidão financeira que assombra um dos pilares da nossa economia, os MEIs. O **Meu MEI** ajuda os microempreendedores e microempreendedoras a retomar o controle e voltar a sonhar, através de um mentor inteligente que descomplica a gestão do dinheiro.

🌐[mentormei.vercel.app/pitch](https://mentormei.vercel.app/pitch)

---
<sub>Meu MEI - Finanças em dia, dinheiro no bolso. © 2026</sub>

<sub>Este projeto contou com a assistência de Inteligência Artificial (**Gemini** e **Claude**) em seu desenvolvimento e foi potencializado pela ferramenta **Antigravity** do Google.<sub>
