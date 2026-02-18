import requests
from bs4 import BeautifulSoup

url = "https://banco.bradesco/mei/"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

res = requests.get(url, headers=headers)
soup = BeautifulSoup(res.content, 'html.parser')

# Procura o texto da primeira resposta
texto_alvo = "O MEI é a abreviação de Microempreendedor Individual"
elementos = soup.find_all(string=lambda text: text and texto_alvo in text)

print(f"Encontrados {len(elementos)} elementos com o texto alvo.")

for el in elementos:
    parent = el.parent
    print(f"\n--- Elemento Pai: {parent.name} | Classes: {parent.get('class')} ---")
    
    # Sobe na árvore para achar o container da pergunta/resposta
    grandparent = parent.parent
    print(f"Avô: {grandparent.name} | Classes: {grandparent.get('class')}")
    
    # Tenta achar o irmão anterior (possível pergunta)
    prev = parent.find_previous_sibling()
    if prev:
        print(f"Irmão Anterior (Tag): {prev.name} | Texto: {prev.get_text(strip=True)[:50]}...")
    else:
        # Se não tem irmão anterior, talvez a pergunta esteja no avô
        prev_gp = grandparent.find_previous_sibling()
        if prev_gp:
             print(f"Irmão Anterior do Avô (Tag): {prev_gp.name} | Texto: {prev_gp.get_text(strip=True)[:50]}...")

    # Imprime estrutura próxima
    print(f"HTML Próximo:\n{grandparent.prettify()[:500]}")
