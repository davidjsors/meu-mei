# 📚 Knowledge Base — MeuMEI Grounding

Esta pasta contém documentos de referência processados e padronizados, usados pela IA para fundamentar suas respostas. O conteúdo inclui guias financeiros, cartilhas educativas e manuais operacionais extraídos de fontes confiáveis (Sebrae, Bradesco, Banco do Nordeste, Governo Federal).

---

## 📂 Índice de Arquivos

Abaixo está a lista dos documentos disponíveis e seus respectivos conteúdos:

| Arquivo | Descrição | Fonte Principal |
| :--- | :--- | :--- |
| `cartilha_educacao_financeira_adultos_bradesco.md` | Cartilha com 10 passos para organização financeira pessoal, investimentos e aposentadoria. | Bradesco (Unibrad) |
| `faq_mei_portal_gov.md` | Perguntas e respostas frequentes sobre obrigações, benefícios e regras do MEI. | Portal do Empreendedor (Gov.br) |
| `guia_diagnostico_empresarial_sebrae.md` | Questionários e análises para avaliar a saúde financeira, marketing, vendas e gestão de pessoas. | Sebrae PR |
| `guia_educacao_financeira_fornecedores_bradesco.md` | Orientações para separação de contas PF/PJ, precificação e gestão de custos para fornecedores. | Bradesco (Unibrad) |
| `guia_fluxo_caixa_sebrae.md` | Guia completo sobre gestão de fluxo de caixa, DRE e controle financeiro. | Sebrae PR |
| `guia_gestao_financeira_bn.md` | Conceitos de gestão financeira focados no microempreendedor (Banco do Nordeste). | Banco do Nordeste |
| `guia_gestao_financeira_mei_sebrae.md` | E-book abrangente sobre gestão financeira para MEI (fluxo de caixa, capital de giro). | Sebrae |
| `guia_planejamento_financeiro_sebrae.md` | Passo a passo para elaborar um planejamento financeiro eficiente, orçamentos e análise SWOT. | Sebrae PR |
| `infografico_perfil_autonomo_bradesco.md` | Infográfico sobre o perfil dos profissionais autônomos no Brasil e desafios financeiros. | Bradesco (Unibrad) |
| `infografico_planejamento_autonomo_bradesco.md` | Infográfico com dicas rápidas de planejamento financeiro para autônomos. | Bradesco (Unibrad) |
| `lista_ocupacoes_permitidas_mei_gov.md` | Lista oficial de ocupações permitidas ao MEI (Anexo XI) com CNAE e incidência de ISS/ICMS. | Receita Federal (Gov.br) |
| `manual_tarifas_bancarias_bradesco.md` | Tabela de tarifas e serviços das Cestas MEI e PJ Fácil do Bradesco. | Banco Bradesco |

---

## 🛠️ Manutenção

Para adicionar novos documentos:
1.  Adicione o arquivo PDF original na pasta.
2.  Execute o script `scripts/convert_pdfs_to_md.py` para gerar a versão Markdown limpa.
3.  Revise o conteúdo gerado e adicione a fonte ABNT no topo.
4.  Renomeie o arquivo seguindo o padrão `tipo_conteudo_instituicao.md` (ex: `guia_marketing_sebrae.md`).
5.  Atualize esta tabela no `README.md`.
