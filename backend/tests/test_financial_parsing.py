
import pytest
from app.routers.chat import _parse_transactions, _parse_onboarding

def test_financial_parsing_formats():
    # Teste de formatos brasileiros e gírias
    text = """
    [TRANSACTION]
    tipo: entrada
    valor: 1.234,56
    descricao: Venda Grande
    categoria: vendas
    [/TRANSACTION]
    
    [TRANSACTION]
    tipo: saida
    valor: 50,00
    descricao: Cafezinho
    categoria: outros_despesa
    [/TRANSACTION]
    
    [TRANSACTION]
    tipo: receita
    valor: 1k
    descricao: Consultoria
    categoria: servicos
    [/TRANSACTION]
    """
    txs = _parse_transactions(text)
    assert len(txs) == 3
    assert txs[0]["amount"] == 1234.56
    assert txs[1]["amount"] == 50.0
    assert txs[2]["amount"] == 1000.0

def test_financial_parsing_types():
    # Teste de normalização de tipos
    text = """
    [TRANSACTION]
    tipo: receita
    valor: 100
    descricao: Item 1
    categoria: vendas
    [/TRANSACTION]
    
    [TRANSACTION]
    tipo: despesa
    valor: 50
    descricao: Item 2
    categoria: aluguel
    [/TRANSACTION]
    """
    txs = _parse_transactions(text)
    assert txs[0]["type"] == "entrada"
    assert txs[1]["type"] == "saida"

def test_deduplication():
    # Teste para garantir que tags repetidas idênticas são ignoradas
    text = """
    [TRANSACTION]
    tipo: entrada
    valor: 100
    descricao: Venda
    categoria: vendas
    [/TRANSACTION]
    
    [TRANSACTION]
    tipo: entrada
    valor: 100
    descricao: Venda
    categoria: vendas
    [/TRANSACTION]
    """
    txs = _parse_transactions(text)
    assert len(txs) == 1

def test_onboarding_parsing():
    # Teste de parse de conclusão de onboarding
    text = """
    Parabéns! Você concluiu.
    [ONBOARDING_COMPLETE]
    nome: Felipe Testador
    negocio: Desenvolvedor
    sonho: Viajar o mundo
    score: 15
    [/ONBOARDING_COMPLETE]
    """
    data = _parse_onboarding(text)
    assert data["name"] == "Felipe Testador"
    assert data["score"] == 15
    assert data["business_type"] == "Desenvolvedor"
