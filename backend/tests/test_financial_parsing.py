import pytest
from app.routers.chat import _parse_transactions

def test_parse_simple_transaction():
    text = "[TRANSACTION]\ntipo: entrada\nvalor: 100.00\ndescricao: Venda de bolo\ncategoria: vendas\n[/TRANSACTION]"
    txs = _parse_transactions(text)
    assert len(txs) == 1
    assert txs[0]["amount"] == 100.0
    assert txs[0]["type"] == "entrada"

def test_parse_brazilian_format():
    text = "[TRANSACTION]\ntipo: saída\nvalor: 1.234,56\ndescricao: Aluguel\ncategoria: aluguel\n[/TRANSACTION]"
    txs = _parse_transactions(text)
    assert len(txs) == 1
    assert txs[0]["amount"] == 1234.56
    assert txs[0]["type"] == "saida"

def test_parse_k_suffix():
    text = "[TRANSACTION]\ntipo: entrada\nvalor: 2k\ndescricao: Investimento\ncategoria: outros_receita\n[/TRANSACTION]"
    txs = _parse_transactions(text)
    assert txs[0]["amount"] == 2000.0

def test_parse_multiple_transactions():
    text = """
[TRANSACTION]
tipo: entrada
valor: 50,0
descricao: Venda 1
categoria: vendas
[/TRANSACTION]

[TRANSACTION]
tipo: saida
valor: 20
descricao: Cafezinho
categoria: transporte
[/TRANSACTION]
"""
    txs = _parse_transactions(text)
    assert len(txs) == 2
    assert txs[0]["amount"] == 50.0
    assert txs[1]["amount"] == 20.0

def test_parse_deduplication():
    # Mesma transação repetida no texto
    text = "[TRANSACTION]\ntipo: entrada\nvalor: 10\ndescricao: Bala\ncategoria: vendas\n[/TRANSACTION]" * 2
    txs = _parse_transactions(text)
    assert len(txs) == 1

def test_parse_invalid_format_graceful_fail():
    text = "[TRANSACTION]\ntipo: erro\nvalor: abc\ndescricao: x\ncategoria: y\n[/TRANSACTION]"
    txs = _parse_transactions(text)
    assert len(txs) == 0
