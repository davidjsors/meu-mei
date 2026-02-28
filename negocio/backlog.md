# Backlog do Projeto Meu MEI

Este documento centraliza todas as tarefas, correções de bugs, vulnerabilidades e melhorias arquiteturais identificadas no projeto. **Sempre que identificarmos o que precisa ser feito, adicionaremos neste arquivo, por ordem de prioridade.**

## 🟥 Prioridade Crítica (Alta Severidade)
Tarefas que precisam ser resolvidas imediatamente para garantir a integridade e segurança do sistema em produção.

- [ ] **SEC-01: Implementar Middleware de Autenticação (Mitigação de IDOR)**
  - *Contexto:* Atualmente, a API confia no parâmetro `phone_number` das requisições sem validação de sessão.
  - *Ação:* Usar JWT (OAuth2Bearer) para validar requisições nos endpoints privados (`/delete-account`, `/finance`, chat, etc.).
- [ ] **SEC-02: Refatorar Criptografia do PIN e Adicionar Rate Limiting**
  - *Contexto:* O PIN (6 dígitos) usa SHA-256 com salt estático e a rota `/login-pin` não tem bloqueio contra ataques de força bruta.
  - *Ação:* Substituir SHA-256 por `bcrypt` e adicionar middleware de Rate Limit (ex: `slowapi` limitando 5 tentativas/min).
- [ ] **SEC-INFRA-01: Habilitar Supabase RLS (Row Level Security) (CRÍTICO)**
  - *Contexto:* O schema SQL inicializou tabelas sem RLS. Sendo a `anon_key` pública no frontend, ocorrem vazamentos via REST API.
  - *Ação:* Criar `ALTER TABLE x ENABLE ROW LEVEL SECURITY` e criar Policy bloqueando conexões que não venham da `service_role_key` (FastAPI).
- [ ] **SEC-INFRA-02: Trancar a Política de CORS (Cross-Origin)**
  - *Contexto:* A regra CORS no `main.py` aceita `https://.*\.vercel\.app`, permitindo spoof de origens.
  - *Ação:* Remover regex e validar estritamente as strings autorizadas carregadas via var de ambiente de Produção.

## 🟨 Prioridade Média (Estabilidade e Resiliência)
Tarefas importantes para prevenir travamentos, vazamentos de recursos ou inconsistência de dados.

- [ ] **SEC-03: Implementar Limites de Tamanho para Upload de Arquivos**
  - *Contexto:* O endpoint de chat aceita arquivos multimídia sem validação de limite de MB, abrindo brecha para Memory DoS e explosão de Storage.
  - *Ação:* Adicionar validação de tamanho máximo do `file_bytes` (ex: 15MB) antes de iniciar upload pro Supabase.
- [ ] **BUG-01: Corrigir Condição de Corrida (TOCTOU) na Aceitação de Termos**
  - *Contexto:* A lógica de checar `existing = select...` seguida de `insert/update` pode gerar exceção no banco caso haja requisições paralelas.
  - *Ação:* Trocar a lógica manual inteira por uma instrução `.upsert()` nativa com `on_conflict="phone_number"`.

## 🟦 Prioridade Baixa (Débito Técnico e Code Quality)
Otimizações de código e melhorias não-bloqueantes.

- [ ] **TECH-01: Refatorar Lógica de Recuperação via Social ID**
  - *Contexto:* A verificação em `recover_pin_check` falha silenciosamente caso o payload contenha valores `null` contra colunas `null` do banco.
  - *Ação:* Verificar explicitamente se `user.get("social_id") is not None` antes de validar matching.
- [ ] **TECH-SEC-02: Gestão Strict de Supply Chain do Backend**
  - *Contexto:* `requirements.txt` permite Minor Updates autônomos (`==0.115.*`), abrindo porta para infecções de dependência não auditada.
  - *Ação:* Trocar por gerenciamento com lock determinístico (Poetry ou uv) ou fixar versão pontual com `pip freeze`.

## 🟪 Prioridade Estrutural (Arquitetura de Agentes de IA)
Evoluções arquiteturais para aumentar a resiliência e a capacidade cognitiva do mentor. Baseado na avaliação de agentes (`relatorio_agentes.md`).

- [ ] **AI-01: Quebrar Monólito em Orquestração Multi-Agente (*Plan-and-Execute*)**
  - *Contexto:* Atualmente, o `system.py` carrega todo o peso cognitivo de finanças, onboarding e geração de áudio. O modelo sofre "overload" cognitivo.
  - *Ação:* Implementar Roteador Cérebro para classificar a intenção e subagentes separados ("Agente Onboarding", "Agente Financeiro") com prompts mais limpos e curtos.
- [ ] **AI-02: Otimizar Gestão de Memória (Chunking e Contexto Direcionado)**
  - *Contexto:* O `search_knowledge` joga o texto inteiro (`full_content`) do FAQ no prompt, sobrecarregando a Janela de Contexto (Working Memory Hoarding).
  - *Ação:* Limitar a injeção do RAG apenas quando o roteador julgar ser uma pergunta educacional, e não misturar nos tickets financeiros.
- [ ] **AI-03: Implementar Framework de Avaliação Local (Behavioral Contracts)**
  - *Contexto:* Não há detecção de regressão em atualizações de Prompt (se mudarmos uma vírgula, pode quebrar o parsing de transações silenciosamente).
  - *Ação:* Criar `LLM-as-a-judge` e rodar datasets de testes automatizados locais antes do deploy simulando Golden Paths de Finanças (Teste Unitário para o Agente).

---

> **Regra de Manutenção:** Toda nova vulnerability review, bug report ou feature strategy discutida no decorrer das Sprints deve ser categorizada e registrada nesta lista antes de ser executada.
