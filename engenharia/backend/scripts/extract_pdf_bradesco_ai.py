import requests
import pdfplumber
import re
import os
import time
from pathlib import Path
import io

# Configuração de Caminhos
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BASE_DIR / 'knowledge'
PDF_URL = "https://assets.bradesco/content/dam/portal-bradesco/assets/classic/pdf/sustentabilidade/trusted-ai.pdf"
OUTPUT_MD = KNOWLEDGE_DIR / 'trusted_ai_bradesco.md'

def table_to_markdown(table):
    """Converte uma lista de listas (representando uma tabela) em Markdown."""
    if not table or not any(table):
        return ""
    
    # Remove linhas vazias e limpa None
    table = [[(str(cell).replace('\n', ' ').strip() if cell is not None else "") for cell in row] for row in table]
    table = [row for row in table if any(cell.strip() for cell in row)]
    
    if not table: return ""

    cols = len(table[0])
    md_table = []
    
    # Cabeçalho
    md_table.append("| " + " | ".join(table[0]) + " |")
    # Separador
    md_table.append("| " + " | ".join(["---"] * cols) + " |")
    
    # Dados
    for row in table[1:]:
        if len(row) < cols:
            row.extend([""] * (cols - len(row)))
        md_table.append("| " + " | ".join(row[:cols]) + " |")
        
    return "\n".join(md_table) + "\n\n"

def clean_text_block(text):
    """Aplica heurísticas de limpeza de texto para Markdown."""
    if not text: return ""
    
    # Remove Form Feed (FF)
    text = text.replace('\x0c', '').replace('\f', '')

    # Remoção específica de cabeçalhos/rodapés deste PDF
    text = re.sub(r'IA\s+c\s+onfiável', '', text, flags=re.IGNORECASE) # "IA c onfiável"
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE) # Números de página isolados (multiline)
    
    # Corrigir palavras quebradas comuns neste documento
    text = text.replace('c onfiável', 'confiável')
    text = text.replace('r esponsável', 'responsável')

    # Remove sequências de números que parecem eixos de gráfico
    text = re.sub(r'\b(?:\d{1,4}(?:\s+|,)?\s?){3,}\b', '', text)
    
    # Remove hífens de quebra de linha (ex: "sus-\ntentável" -> "sustentável")
    text = re.sub(r'(\w)-\s*\n\s*([a-zà-ú])', r'\1\2', text)
    
    # Une quebras de linha no meio de frases
    text = re.sub(r'([a-zà-ú,;])\n+([a-zà-ú])', r'\1 \2', text)
    
    # Remove espaços duplos
    text = re.sub(r' +', ' ', text)
    # Remove linhas em branco extras (mais de 3)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def download_pdf(url):
    print(f"Baixando PDF de: {url}")
    response = requests.get(url)
    response.raise_for_status()
    return io.BytesIO(response.content)

def extract_content(pdf_file):
    print("Processando PDF...")
    full_content = []
    
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            # Tentar extrair tabelas
            tables = page.extract_tables()
            
            # Extrair texto
            text = page.extract_text()
            
            if text:
                cleaned_text = clean_text_block(text)
                full_content.append(cleaned_text)
            
            # Adicionar tabelas se houver
            for table in tables:
                md_table = table_to_markdown(table)
                full_content.append(md_table)
                
    return "\n\n".join(full_content)

def save_markdown(content, url):
    # Formatar data para ABNT
    meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    agora = time.localtime()
    dia = agora.tm_mday
    mes = meses[agora.tm_mon - 1]
    ano = agora.tm_year
    data_abnt = f"{dia} {mes}. {ano}"

    print(f"Salvando em: {OUTPUT_MD}")
    os.makedirs(os.path.dirname(OUTPUT_MD), exist_ok=True)
    
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write("# Trusted AI Bradesco - Inteligência Artificial Confiável\n\n")
        f.write(f"> **Fonte:** BANCO BRADESCO. *Trusted AI*. Disponível em: <{url}>. Acesso em: {data_abnt}.\n\n")
        f.write(content)

def main():
    try:
        pdf_bytes = download_pdf(PDF_URL)
        content = extract_content(pdf_bytes)
        save_markdown(content, PDF_URL)
        print("Extração concluída com sucesso!")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    main()
