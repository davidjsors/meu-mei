
import pytest
from app.routers.chat import _parse_transactions

def test_messy_response_parsing():
    text = """
    Aqui estão os lançamentos que você pediu:
    
    [TRANSACTION]
    tipo: entrada
    valor: 15.00
    descricao: Venda A
    categoria: vendas
    [/TRANSACTION] Olá DAVID! Aqui tem outro: [TRANSACTION] tipo: saida valor: 5.00 descricao: Bala categoria: outros [/TRANSACTION]
    
    Espero que ajude!
    """
    txs = _parse_transactions(text)
    assert len(txs) == 2
    assert txs[0]["amount"] == 15.0
    assert txs[1]["amount"] == 5.0
    assert txs[1]["type"] == "saida"

def test_incomplete_transaction_ignored():
    text = """
    [TRANSACTION]
    tipo: entrada
    valor: 10.00
    [/TRANSACTION]
    """
    txs = _parse_transactions(text)
    assert len(txs) == 0 # Falta descricao e categoria

def test_bold_markdown_fields():
    text = """
    [TRANSACTION]
    **tipo:** entrada
    **valor:** 100,00
    **descricao:** Venda com negrito
    **categoria:** vendas
    [/TRANSACTION]
    """
    txs = _parse_transactions(text)
    assert len(txs) == 1
    assert txs[0]["amount"] == 100.0
    assert txs[0]["description"] == "Venda com negrito"
