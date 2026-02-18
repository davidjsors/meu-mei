import requests
from bs4 import BeautifulSoup
import re
import time
import os
from pathlib import Path

# Configuração de Caminhos
BASE_DIR = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BASE_DIR / 'knowledge'
OUTPUT_MD = KNOWLEDGE_DIR / 'faq_bradesco_empresas.md'

def limpar_texto(texto):
    """Remove espaços duplos, quebras de linha e caracteres invisíveis."""
    if not texto: return ""
    texto = re.sub(r'[\n\t\r]+', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()

def limpar_markdown(texto):
    """Formata texto básico para markdown"""
    if not texto: return ""
    # Remove espaços múltiplos
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto

def extrair_dados():
    url = "https://banco.bradesco/html/pessoajuridica/app-empresas-e-negocios/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
    
    try:
        print(f"Acessando {url}...")
        resposta = requests.get(url, headers=headers)
        resposta.raise_for_status()
        
        soup = BeautifulSoup(resposta.content, 'html.parser')
        
        # Estrutura baseada na inspeção visual
        # Container principal das perguntas
        perguntas_container = soup.find('ul', class_='section-faq__content')
        
        if not perguntas_container:
            print("Erro: Não foi possível encontrar o container de perguntas (ul.section-faq__content)")
            # Tentar fallback ou imprimir o HTML para debug
            # print(soup.prettify()[:2000])
            return

        perguntas_items = perguntas_container.find_all('li', class_='question')
        print(f"Encontradas {len(perguntas_items)} perguntas potenciais.")
        
        # Garante que o diretório existe
        os.makedirs(os.path.dirname(OUTPUT_MD), exist_ok=True)
        
        with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
            f.write("# FAQ Bradesco Empresas e Negócios - Base de Conhecimento\n\n")
            
            # Formatar data para ABNT (dd mmm. yyyy)
            meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
            agora = time.localtime()
            dia = agora.tm_mday
            mes = meses[agora.tm_mon - 1]
            ano = agora.tm_year
            data_abnt = f"{dia} {mes}. {ano}"
            
            f.write(f"> **Fonte:** BANCO BRADESCO. *App Bradesco Empresas e Negócios*. Disponível em: <{url}>. Acesso em: {data_abnt}.\n\n")
            f.write("## Perguntas e Respostas\n\n")
            
            count = 0
            for item in perguntas_items:
                # Extrair Pergunta
                # Estrutura: li.question > div.head > button > h3
                head_div = item.find('div', class_='head')
                if not head_div: continue
                
                h3 = head_div.find('h3')
                if not h3: continue
                
                pergunta = limpar_texto(h3.get_text())
                
                # Extrair Resposta contextualmente
                # Estrutura: li.question > div.expansivel-content
                resposta_div = item.find('div', class_='expansivel-content')
                
                if not resposta_div:
                    continue
                
                f.write(f"### {pergunta}\n\n")
                
                # Processar conteúdo da resposta (pode ter parágrafos, listas, links)
                elementos = resposta_div.find_all(['p', 'ul', 'ol', 'li'], recursive=True)
                
                if not elementos:
                    # Se não tiver tags estruturadas, pega o texto puro
                    txt = limpar_markdown(resposta_div.get_text())
                    if txt: f.write(f"{txt}\n\n")
                else:
                    for el in elementos:
                        # Ignora containers de lista para processar apenas os itens LI
                        if el.name in ['ul', 'ol']: continue
                        
                        txt = limpar_markdown(el.get_text())
                        if not txt: continue
                        
                        prefixo = "- " if el.name == 'li' else ""
                        
                        # Verifica se é um link
                        link = el.find('a')
                        if link and link.get('href'):
                            url_link = link.get('href')
                            if not url_link.startswith('http'):
                                url_link = f"https://banco.bradesco{url_link}"
                            txt = f"[{txt}]({url_link})"
                        
                        f.write(f"{prefixo}{txt}\n\n")
                
                count += 1
            
            print(f"Sucesso! {count} perguntas extraídas e salvas em: {OUTPUT_MD}")

    except Exception as e:
        print(f"Erro durante a extração: {e}")

if __name__ == "__main__":
    extrair_dados()
