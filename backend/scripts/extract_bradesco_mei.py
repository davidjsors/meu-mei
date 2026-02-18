import requests
from bs4 import BeautifulSoup
import re
import os
import time
from pathlib import Path

# Configuração
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BASE_DIR / 'knowledge'
OUTPUT_MD = KNOWLEDGE_DIR / 'bradesco_mei_geral.md' # Sobrescreve o anterior
URL = "https://banco.bradesco/mei/"

def limpar_texto(texto):
    if not texto: return ""
    return re.sub(r'\s+', ' ', texto).strip()

def main():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    
    print(f"Acessando {URL}...")
    res = requests.get(URL, headers=headers)
    soup = BeautifulSoup(res.content, 'html.parser')

    # Remove elementos indesejados
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'noscript', 'iframe']):
        tag.decompose()

    faqs = []
    
    # Estrutura Bradesco (Típica): .accordion-item -> .accordion-title (pergunta) + .accordion-content (resposta)
    # Ou listas DL/DT/DD
    
    # 1. Tenta identificar containers de FAQ
    # Procura por itens que tenham "pergunta" ou "faq" ou "accordion" nas classes
    items = soup.find_all(lambda tag: tag.name in ['div', 'li'] and 
                          any(x in (tag.get('class') or []) for x in ['accordion-item', 'card', 'faq-item', 'pergunta']))
    
    if not items:
        # Tenta achar items pelo conteúdo (texto com "?")
        print("Nenhum container explícito encontrado. Buscando por texto...")
        botoes = soup.find_all(lambda tag: tag.name in ['button', 'h3', 'h4', 'a'] and "?" in tag.get_text())
        for botao in botoes:
            pergunta = limpar_texto(botao.get_text())
            if len(pergunta) < 10: continue
            
            # A resposta deve ser o próximo elemento irmão ou próximo div
            resposta_tag = botao.find_next_sibling('div')
            if not resposta_tag:
                 # Tenta subir um nível e pegar o próximo div
                 resposta_tag = botao.parent.find_next_sibling('div')
            
            if resposta_tag:
                resposta = limpar_texto(resposta_tag.get_text())
                if len(resposta) > 20:
                     faqs.append((pergunta, resposta))
    else:
        print(f"Encontrados {len(items)} itens de FAQ potenciais.")
        for item in items:
            # Tenta extrair a pergunta (primeiro elemento de texto relevante)
            pergunta_el = item.find(['h3', 'h4', 'strong', 'button', 'span', 'div'], class_=re.compile(r'title|header|pergunta'))
            if not pergunta_el:
                 pergunta_el = item.find('button')
            
            if not pergunta_el: continue
            
            pergunta = limpar_texto(pergunta_el.get_text())
            
            # Tenta extrair resposta (elemento content/body)
            resposta_el = item.find(class_=re.compile(r'content|body|resposta|panel'))
            if not resposta_el:
                 resposta_el = pergunta_el.find_next_sibling('div')
            
            if resposta_el:
                resposta = limpar_texto(resposta_el.get_text())
                faqs.append((pergunta, resposta))

    # Conteúdo Geral (excluindo FAQ para não duplicar)
    conteudo_geral = []
    # Pega seções principais
    secoes = soup.find_all(['section', 'article'])
    for secao in secoes:
        # Se parecer seção de FAQ, ignora
        if 'faq' in (secao.get('class') or []) or 'duvidas' in (secao.get('id') or ''):
             continue
        
        titulo_secao = secao.find(['h2', 'h3'])
        if titulo_secao:
             t = limpar_texto(titulo_secao.get_text())
             if t: conteudo_geral.append(f"## {t}")
        
        paragrafos = secao.find_all('p')
        for p in paragrafos:
            txt = limpar_texto(p.get_text())
            if len(txt) > 20 and txt not in [r for _, r in faqs]: # Evita duplicar respostas
                conteudo_geral.append(txt)

    # Salva
    os.makedirs(os.path.dirname(OUTPUT_MD), exist_ok=True)
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        # Data ABNT
        t = time.localtime()
        meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
        data_abnt = f"{t.tm_mday} {meses[t.tm_mon-1]}. {t.tm_year}"
        
        f.write("# Bradesco MEI - Informações Gerais e FAQ\n\n")
        f.write(f"> **Fonte:** BANCO BRADESCO. *Portal MEI*. Disponível em: <{URL}>. Acesso em: {data_abnt}.\n\n")
        
        if faqs:
            f.write("## Perguntas e Respostas Frequentes (FAQ)\n\n")
            seen = set()
            for p, r in faqs:
                if p in seen: continue
                seen.add(p)
                f.write(f"### {p}\n\n{r}\n\n")
        
        f.write("## Outras Informações\n\n")
        for linha in conteudo_geral:
             f.write(f"{linha}\n\n")
             
    print(f"Sucesso! Salvo em {OUTPUT_MD}")
    print(f"Extraídas {len(faqs)} perguntas.")

if __name__ == "__main__":
    main()
