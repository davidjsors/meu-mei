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

## 🛠️ Manutenção

Para adicionar novos documentos:
1.  **PDFs:** Execute `scripts/convert_pdfs_to_md.py` (genérico) ou scripts específicos como `scripts/extract_pdf_bradesco_ai.py`.
2.  **Web Scraping:** Utilize scripts como `scripts/extract_bradesco_mei.py` ou `scripts/extract_faq_bradesco.py` para extrair de portais.
3.  **Manual:** Crie arquivos Markdown diretamente, seguindo o padrão de cabeçalho ABNT.
4.  Execute `scripts/index_knowledge.py` para atualizar a base vetorial do RAG.
5.  Atualize esta tabela no `README.md`.
