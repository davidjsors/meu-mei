# Scripts de Backend do MeuMEI

Este diretório contém scripts utilitários para manutenção e atualização do projeto.

## 1. Extrator de FAQ do Governo (`extract_faq_gov.py`)

Este script realiza a coleta automática das Perguntas Frequentes (FAQ) do Portal do Empreendedor e as converte para Markdown, formato utilizado pela Base de Conhecimento do agente de IA do MeuMEI.

### Funcionalidades
- Acessa a página oficial do gov.br.
- Extrai o conteúdo hierárquico (Perguntas e Respostas).
- Identifica e formata o Glossário/Siglas.
- Salva o resultado em `backend/knowledge/faq_mei.md`.

### Como Usar

1. Certifique-se de estar no ambiente virtual (venv) ou ter as dependências instaladas:
   ```bash
   pip install requests beautifulsoup4 python-docx
   ```

2. Execute o script a partir da raiz do projeto ou da pasta scripts:
   ```bash
   python backend/scripts/extract_faq_gov.py
   ```
   
3. O arquivo `backend/knowledge/faq_mei.md` será atualizado automaticamente.

### Estrutura de Saída
O Markdown gerado segue o padrão:
```markdown
# FAQ MEI
> Data: ...
> Fonte: ...

## Glossário
- **SIGLA**: Definição...

## Perguntas e Respostas
### Pergunta?
Resposta...
```
