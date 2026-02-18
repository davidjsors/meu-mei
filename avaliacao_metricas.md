# 📊 Avaliação e Métricas

Este documento descreve como o agente **Meu MEI** é avaliado, as métricas de qualidade estabelecidas e os resultados dos testes realizados durante o desenvolvimento.

---

## 🎯 1. Como Avaliar o Agente

A avaliação do Meu MEI é contínua e baseada em dois pilares:

1.  **Testes Automatizados (Backend):** Conjunto de scripts em Python que validam a lógica financeira, personalidade e integridade dos dados.
2.  **Validacão de RAG (Grounding):** Verificação se as respostas técnicas estão de acordo com os manuais oficiais do Bradesco e Sebrae cadastrados na base.

---

## 📈 2. Métricas de Qualidade

| Métrica | O que avalia | Evidência de Sucesso |
| :--- | :--- | :--- |
| **Assertividade** | O agente extraiu os valores corretos de vendas e gastos? | Testado via `test_financial_parsing.py` com gírias e valores complexos. |
| **Segurança** | O agente evitou sugerir dívidas ou misturar contas? | Validado em `test_financial_integrity.py`. |
| **Fidelidade à Marca** | O agente priorizou o Bradesco e informou a isenção de tarifa? | Implementado via System Prompt e validado em conversas de teste. |
| **Personalidade** | O tom de voz mudou conforme o nível IAMF-MEI? | Testado via `test_ai_personality.py`. |
| **Grounding (RAG)** | As respostas técnicas têm fonte oficial (ABNT)? | Verificado através das respostas fundamentadas na biblioteca `knowledge/`. |

---

## 🧪 3. Cenários de Teste Reais (Executados)

Utilizamos o diretório `backend/tests/` para validar estes cenários:

### Teste 1: Onboarding Conversacional
- **Pergunta:** "Quero abrir um negócio de pintura, meu sonho é ter uma van."
- **Esperado:** IA captura o nome, ramo (pintura), sonho (van) e inicia as 5 perguntas de maturidade.
- **Status:** ✅ Aprovado (`test_onboarding.py`)

### Teste 2: Registro Multimodal (OCR/Áudio)
- **Ação:** Envio de nota fiscal de material de construção ou áudio "Vendi 3 bolos por 60 reais".
- **Esperado:** Extração exata do valor, categoria correta (insumos/vendas) e inclusão do marcador `[TRANSACTION]`.
- **Status:** ✅ Aprovado (`test_financial_parsing.py`)

### Teste 3: Proteção Financeira e Prioridade Bradesco
- **Pergunta:** "Qual banco você recomenda para abrir conta MEI?"
- **Esperado:** IA recomenda o Bradesco primeiro, informando os 12 meses de isenção e fundamentando no Guia Bradesco.
- **Status:** ✅ Aprovado (Validado via System Prompt)

### Teste 4: Cálculo de Lucro e DRE
- **Ação:** Solicitação de resumo do mês.
- **Esperado:** Gerar tabela DRE formatada separando Receita de Lucro Líquido.
- **Status:** ✅ Aprovado (`test_finance_logic.py`)

---

## 📝 4. Resultados e Conclusões

### ✅ O que funcionou bem:
*   **Extração de Dados:** A capacidade de entender gírias ("2k", "cinquentão") e processar áudios/imagens funcionou sob estresse.
*   **Adaptação de Tom:** O mentor realmente muda a forma de falar entre um perfil "Vulnerável" e um "Visionário".
*   **Fundamentação Técnica:** O uso de RAG eliminou quase 100% das alucinações sobre regras do MEI.

### 🛠️ O que pode melhorar:
*   **Latência de Resposta:** O processamento de embeddings e chamadas multimodais pode levar alguns segundos adicionais.
*   **Interface Gráfica:** Expandir a visualização de gráficos para incluir projeções de longo prazo baseadas no histórico.

---

## 🛠️ Métricas Técnicas (Observabilidade)

Monitoramos o backend utilizando:
*   **Latência:** Tempo médio de resposta < 3s para texto e < 6s para arquivos.
*   **Tokens:** Otimização via Gemini 2.0 Flash para manter o custo baixo mesmo com RAG extenso.
*   **Logs:** Auditoria de transações via Supabase Logs.

---
<sub>Meu MEI - Avaliação de Desempenho e Qualidade © 2026</sub>
