import requests
from bs4 import BeautifulSoup
from docx import Document
import re
import time
import os
from pathlib import Path

# Configuração de Caminhos
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BASE_DIR / 'knowledge'
OUTPUT_MD = KNOWLEDGE_DIR / 'faq_mei.md'
OUTPUT_DOCX = KNOWLEDGE_DIR / 'faq_mei_coleta.docx'

def limpar_texto(texto):
    """Remove espaços duplos, quebras de linha e caracteres invisíveis."""
    if not texto: return ""
    texto = re.sub(r'[\n\t\r]+', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()

def formatar_glossario(texto):
    """Formata o texto corrido do glossário em uma lista markdown."""
    if not texto: return ""
    
    # 1. Normaliza quebras de sentença que parecem definições grudadas
    padrão_divisao_ponto = r'(\.\s+)(?=[A-Za-z0-9\-/]{2,15}(?:\s*:|\s+é\s+))'
    texto = re.sub(padrão_divisao_ponto, r'.\n', texto)
    
    # 2. Força quebra para definições no meio da linha
    padrão_divisao_meio = r'(\s+)(?=[A-Za-z0-9\-/]{2,15}:\s*)'
    texto = re.sub(padrão_divisao_meio, r'\n', texto)

    lines = texto.split('\n')
    formatted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        match = re.match(r'^([A-Za-z0-9\-\s/]{2,20}?)(:\s*|\s+é\s+)(.+)$', line)
        
        if match:
            sigla = match.group(1).strip()
            is_definition = True
            if ' ' in sigla and len(sigla.split()) > 3: 
                is_definition = False
            
            if is_definition:
                definicao = match.group(3).strip()
                definicao = definicao[0].upper() + definicao[1:] if definicao else ""
                formatted_lines.append(f"- **{sigla}**: {definicao}")
            else:
                formatted_lines.append(line)
        else:
            formatted_lines.append(line)
                
    return "\n".join(formatted_lines)

def salvar_markdown(soup, container, caminho_md, url):
    """Extrai e salva o conteúdo em Markdown."""
    print(f"Salvando Markdown em: {caminho_md}")
    
    # Garante que o diretório existe
    os.makedirs(os.path.dirname(caminho_md), exist_ok=True)
    
    with open(caminho_md, 'w', encoding='utf-8') as f:
        f.write("# FAQ MEI - Base de Conhecimento\n\n")
        f.write(f"> Data de extração: {time.strftime('%d/%m/%Y')}\n")
        f.write(f"> Fonte: [Portal do Empreendedor]({url})\n\n")

        # Glossário
        glossario_detectado = False
        for tag in container.find_all(['h2', 'h3', 'a', 'strong']):
            if tag.get_text() and 'glossário' in tag.get_text().lower():
                f.write("## Glossário / Siglas\n\n")
                glossario_detectado = True
                proximo = tag.find_next_sibling()
                
                texto_acumulado = ""
                while proximo and proximo.name not in ['h1', 'h2', 'h3', 'a']:
                    txt = limpar_texto(proximo.get_text())
                    if txt:
                        texto_acumulado += txt + "\n"
                    proximo = proximo.find_next_sibling()
                
                f.write(formatar_glossario(texto_acumulado))
                f.write("\n\n")
                break
        
        # Perguntas
        f.write("## Perguntas e Respostas\n\n")
        toggles = container.find_all('a', class_='toggle')
        if not toggles:
             toggles = container.select('.ui-accordion-header > a')
        
        perguntas_vistas = set()
        
        for toggle in toggles:
            pergunta = limpar_texto(toggle.get_text())
            if not pergunta or pergunta in perguntas_vistas:
                continue
            
            perguntas_vistas.add(pergunta)
            f.write(f"### {pergunta}\n\n")
            
            resposta_div = toggle.find_next_sibling('div', class_='conteudo')
            if not resposta_div:
                target_id = toggle.get('href', '').replace('#', '')
                if target_id: resposta_div = container.find(id=target_id)
            
            if not resposta_div:
                proximo = toggle.find_next_sibling()
                if proximo and proximo.name == 'div': resposta_div = proximo

            if resposta_div:
                elementos = resposta_div.find_all(['p', 'ul', 'ol', 'li'], recursive=True)
                if not elementos:
                    txt = limpar_texto(resposta_div.get_text())
                    if txt: f.write(f"{txt}\n\n")
                else:
                    for el in elementos:
                        if el.name in ['ul', 'ol']: continue 
                        txt = limpar_texto(el.get_text())
                        if not txt: continue
                        prefixo = "- " if el.name == 'li' else ""
                        f.write(f"{prefixo}{txt}\n\n")

def extrair_dados():
    url = "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
    
    try:
        print(f"Acessando {url}...")
        resposta = requests.get(url, headers=headers)
        resposta.raise_for_status()
        
        soup = BeautifulSoup(resposta.content, 'html.parser')
        container = soup.find(id='parent-fieldname-text') or soup.find(id='content-core') or soup.find('main') or soup.body
        
        # Gera o Markdown
        salvar_markdown(soup, container, OUTPUT_MD, url)
        print(f"Sucesso! Arquivo gerado em: {OUTPUT_MD}")
        
    except Exception as e:
        print(f"Erro durante a extração: {e}")

if __name__ == "__main__":
    extrair_dados()
