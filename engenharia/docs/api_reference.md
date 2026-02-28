# Meu MEI - API Reference

Esta é a documentação técnica dos endpoints expostos no backend FastAPI para a interação do frontend com o motor do projeto **Meu MEI**.

Todos os requests assumem o `Content-Type: application/json`, a não ser explicitamente formulados como `multipart/form-data`.

A URL Base local (Desenv.) é `http://127.0.0.1:8000`.

---

## 🔒 1. Autenticação (Auth)

Endpoints de controle de acesso (Baseado em senhas SIMPLES / PIN para maior acessibilidade do Microempreendedor).

### `POST /api/auth/social-login`
Registra / Efetua o login via plataformas sociais.

### `POST /api/auth/set-pin`
Salva ou altera o PIN Criptografado (6 dígitos numéricos) contido no perfil do usuário no Onboarding.
- **Payload:** `{"phone_number": "5511999999999", "pin": "123456"}`

### `POST /api/auth/login-pin`
Verifica a autenticação do número de celular via PIN no momento que a sessão expira.
- **Payload:** `{"phone_number": "string", "pin": "string"}`

### `POST /api/auth/recover-pin-check`
Fluxo de checagem para recuperação segura do PIN.

---

## 💬 2. Chat e Inteligência Artificial

A interface mestre com o Mentor Inteligente suportada pelo Google Gemini. 

### `POST /api/chat/send`
Envia as mensagens do frontend (incluindo texto nativo, voz decodificada ou arquivos) em stream. A resposta injeta **Server Sent Events (SSE)** em blocos que permitem a renderização rápida do chat frame a frame.
- O endpoint também orquestra Ferramentas / `Function Calls` que manipulam a API Financeira internamente.

### `GET /api/chat/history/{phone_number}`
Retorna a árvore inteira de histórico de chat relacionada a esse celular. Usado para persistência ao vivo entre reloads e perdas de conexão.

---

## 👤 3. Gerenciamento do Usuário e Finanças

Controlers vitais para Dashboard e Perfil do Usuário na barra lateral.

### `POST /api/user/maturity`
Processa a resposta das 5 perguntas sobre Maturidade Financeira (IAMF-MEI) no ato de onboarding e gera o Profile atrelado para uso do modelo de base (`agente-base.md`).

### `GET /api/user/profile/{phone_number}`
Recupera o perfil geral de negócio e os dados agregados para renderizar na Sidebar (Meta de Faturamento, Perfil de Maturidade, Sonho).

### `PUT /api/user/profile/goal`
Grava/atualiza individualmente a Meta de Vendas ou Sonho do usuário.
- **Payload:** `{"phone_number": "string", "revenue_goal": 25000.0, "dream": "string"}`

### `POST /api/user/accept-terms`
Sinaliza que o usuário concluiu as Políticas de LGPD e Compliance da arquitetura.

### `DELETE /api/user/delete-account`
Exclui todos os dados da Tabela `profiles`, `financial_records` e `chat_history`. Ação irreversível regida por "Right to Erasure".

### `GET /api/user/finance/{phone_number}`
Retorna o Agregado Financeiro Mensal (Entradas vs Saídas) consolidadas para uso ágil nos mini-gráficos/widgets da Dashboard. 

### `GET /api/user/finance/{phone_number}/records`
Lista completa com paginação e filtragem. Permite buscar records por data específica ou por filtro de tipo de lançamento contábil. Suporta query-strings como `?category=insumos&start_date=2024-01-01`.

### `POST /api/user/finance/record`
Insere manualmente ou via quick-actions da Interface Web uma transação forçada pelo usuário sem necessitar do workflow conversacional guiado do LLM.

### `DELETE /api/user/finance/record/{record_id}`
Estorno. Deleta uma ocorrência financeira do Livro Caixa pelo seu Index de ID.
