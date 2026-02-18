# 📖 Dicionário de Erros — Meu MEI

Este documento descreve o mapeamento entre os erros técnicos gerados pelo Backend (FastAPI) ou APIs externas (Gemini/Supabase) e as mensagens amigáveis exibidas ao usuário final no Chat.

## 🎯 Objetivo
Evitar que o usuário veja mensagens técnicas ininteligíveis (ex: "Quota exceeded", "Invalid API Key", "Failed to fetch") e garantir que ele receba uma instrução clara ou uma mensagem de conforto que mantenha o engajamento.

## 🛠️ Localização no Código
A lógica de tradução reside na função `getFriendlyErrorMessage` dentro de:
`frontend/src/app/chat/page.js`

---

## 📊 Mapeamento de Erros

| Erro Técnico (String/Código) | Categoria | Mensagem ao Usuário | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `429`, `quota`, `limit exceeded` | **Limite de Cota** | "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅" | **Automático:** O sistema tentará rodar uma nova chave da lista antes de exibir esta mensagem ao usuário. |
| `400`, `api key`, `invalid_argument` | **Autenticação** | "Parece que há um problema com a minha chave de acesso (API Key). Por favor, verifique as configurações do sistema! 🔑" | Desenvolvedor deve atualizar a `GEMINI_API_KEY` no `.env`. |
| `404`, `model not found` | **Configuração** | "Estou tentando usar um modelo de inteligência que parece estar indisponível ou em manutenção agora. 🛠️" | Verificar se o `GEMINI_MODEL` no `.env` ainda é válido na API da Google. |
| `fetch`, `network`, `failed to connect` | **Conexão** | "Hmm, não consegui me conectar ao servidor. Verifique sua internet ou tente novamente em instantes. 🌐" | Verificar se o Backend está rodando ou se há internet. |
| *Qualquer outro erro* | **Genérico** | "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊" | Tentar novamente ou contatar o suporte. |

---

## 📝 Como Adicionar Novos Erros

1.  Identifique a mensagem de erro que aparece no log do console do navegador (F12).
2.  Adicione uma nova constante no objeto `ERROR_DICTIONARY` em `ChatPage.js`.
3.  Atualize a lógica da função `getFriendlyErrorMessage` com um novo `.includes()` para capturar a palavra-chave do erro técnico.
4.  Atualize esta documentação para manter o projeto organizado.

---
*Última atualização: Fevereiro de 2026*
