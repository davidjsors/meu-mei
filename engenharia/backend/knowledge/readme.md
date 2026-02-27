# 📚 Knowledge Base — MeuMEI Grounding

Esta pasta contém documentos de referência processados e padronizados, usados pela IA para fundamentar suas respostas. O conteúdo inclui guias financeiros, cartilhas educativas e manuais operacionais extraídos de fontes confiáveis (Sebrae, Bradesco, Banco do Nordeste, Governo Federal).

---

## 📂 Índice de Arquivos

Abaixo está a lista dos documentos disponíveis e seus respectivos conteúdos:

| Arquivo | Descrição | Fonte Principal |
| :--- | :--- | :--- |
| `bradesco_mei_geral.md` | Informações gerais sobre abertura de conta, maquininha, benefícios e FAQ do Portal MEI. | Banco Bradesco |
| `cartilha_educacao_financeira_adultos_bradesco.md` | Cartilha com 10 passos para organização financeira pessoal, investimentos e aposentadoria. | Bradesco (Unibrad) |
| `faq_bradesco_empresas.md` | Perguntas e respostas sobre o App Bradesco Empresas e Negócios. | Banco Bradesco |
| `faq_mei_portal_gov.md` | Perguntas e respostas frequentes sobre obrigações, benefícios e regras do MEI. | Portal do Empreendedor (Gov.br) |
| `faq_mei_portal_gov_parte1.md` | (Fragmento do FAQ) Base de conhecimento e pontos de atenção antes da formalização. | Portal do Empreendedor |
| `faq_mei_portal_gov_parte2.md` | (Fragmento do FAQ) Dispensa de Alvarás, Nota Fiscal e faturamento. | Portal do Empreendedor |
| `faq_mei_portal_gov_parte3.md` | (Fragmento do FAQ) Declaração Anual de Faturamento, Empregado do MEI e Benefícios. | Portal do Empreendedor |
| `guia_diagnostico_empresarial_sebrae.md` | Questionários e análises para avaliar a saúde financeira, marketing, vendas e gestão de pessoas. | Sebrae PR |
| `guia_educacao_financeira_fornecedores_bradesco.md` | Orientações para separação de contas PF/PJ, precificação e gestão de custos para fornecedores. | Bradesco (Unibrad) |
| `guia_fluxo_caixa_sebrae.md` | Guia completo sobre gestão de fluxo de caixa, DRE e controle financeiro. | Sebrae PR |
| `guia_gestao_financeira_bn.md` | Conceitos de gestão financeira focados no microempreendedor (Banco do Nordeste). | Banco do Nordeste |
| `guia_gestao_financeira_mei_sebrae.md` | E-book abrangente sobre gestão financeira para MEI (fluxo de caixa, capital de giro). | Sebrae |
| `guia_planejamento_financeiro_sebrae.md` | Passo a passo para elaborar um planejamento financeiro eficiente, orçamentos e análise SWOT. | Sebrae PR |
| `perfil_autonomo_bradesco.md` | Infográfico sobre o perfil dos profissionais autônomos no Brasil e desafios financeiros. | Bradesco (Unibrad) |
| `planejamento_autonomo_bradesco.md` | Infográfico com dicas rápidas de planejamento financeiro para autônomos. | Bradesco (Unibrad) |
| `lista_ocupacoes_permitidas_mei_gov.md` | Lista oficial de ocupações permitidas ao MEI (Anexo XI) com CNAE e incidência de ISS/ICMS. | Receita Federal (Gov.br) |
| `manual_tarifas_bancarias_bradesco.md` | Tabela de tarifas e serviços das Cestas MEI e PJ Fácil do Bradesco. | Banco Bradesco |
| `trusted_ai_bradesco.md` | Princípios de Inteligência Artificial Confiável e Responsável do Bradesco. | Banco Bradesco |

---

## 🛠️ Manutenção e RAG (PageIndex)

Neste projeto utilizamos a estratégia **PageIndex (Multi-Vector Retriever)**. O fluxo vetoriza apenas um resumo gerado para cada página/sessão, vinculando-o ao conteúdo integral armazenado nos metadados. Isso melhora drasticamente a precisão da recuperação e evita perda de contexto.

Para atualizar ou adicionar novos manuais à base vetorial do Supabase:

1. **Extração Inicial:** Extraia o texto bruto dos arquivos PDF ou raspe as informações dos Portais (usando scripts como `convert_pdfs_to_md.py` ou copiando manualmente).
2. **Armazenamento em Markdown:** Coloque toda a informação extraída dentro de arquivos `.md` nesta mesma pasta (ex: `novo_manual.md`), para podermos ter o histórico do documento original na base do código.
3. **Processamento Inicial:** Leia o arquivo `.md` construído e gere um arquivo unificado contendo os resumos através de um LLM. O formato final deve conter o array com objetos JSON (`filename`, `page_number`, `page_title`, `summary`, `full_content`).
4. **Validação:** Garanta que a matriz estruturada esteja contida e seja um JSON perfeitamente válido no arquivo `conhecimento_processado.json`.
5. **Ingestão Lote:** Execute o script inteligente na raiz do backend:
   ```bash
   python scripts/import_rag_json.py
   ```
6. O script conectará ao Supabase, limpará os embeddings atrelados àqueles arquivos (baseado no `filename`) e inserirá os novos registros na tabela `knowledge_embeddings` via *batching*, utilizando o modelo `text-embedding-004`.
7. Atualize a tabela de Índice neste `readme.md`.
