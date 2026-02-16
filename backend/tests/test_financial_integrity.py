import pytest
from app.services.finance import calculate_cash_flow, get_financial_summary

def test_calculate_cash_flow_mixed():
    records = [
        {"type": "entrada", "amount": 100.50},
        {"type": "saida", "amount": 30.20},
        {"type": "entrada", "amount": 200.00},
        {"type": "saida", "amount": 50.00},
    ]
    flow = calculate_cash_flow(records)
    
    assert flow["total_income"] == 300.50
    assert flow["total_expenses"] == 80.20
    assert flow["balance"] == 220.30
    assert flow["record_count"] == 4

def test_calculate_cash_flow_empty():
    records = []
    flow = calculate_cash_flow(records)
    
    assert flow["total_income"] == 0.0
    assert flow["total_expenses"] == 0.0
    assert flow["balance"] == 0.0
    assert flow["record_count"] == 0

def test_calculate_cash_flow_precision():
    # Teste de precisão de ponto flutuante
    records = [
        {"type": "entrada", "amount": 0.1},
        {"type": "entrada", "amount": 0.2},
    ]
    flow = calculate_cash_flow(records)
    
    # 0.1 + 0.2 normalmente seria 0.30000000000000004
    # A função deve arredondar para 2 casas decimais
    assert flow["total_income"] == 0.30

def test_get_financial_summary_content():
    records = [
        {"type": "entrada", "amount": 1000, "category": "Vendas", "record_date": "2023-01-01"},
        {"type": "saida", "amount": 200, "category": "Aluguel", "record_date": "2023-01-05"},
    ]
    summary = get_financial_summary(records)
    
    assert "Entradas totais: R$ 1,000.00" in summary
    assert "Saídas totais: R$ 200.00" in summary
    assert "Saldo: R$ 800.00" in summary
    assert "Vendas: R$ 1,000.00 (entrada)" in summary
    assert "Aluguel: R$ 200.00 (saída)" in summary
    assert "Período: 2023-01-01 a 2023-01-05" in summary

def test_get_financial_summary_empty():
    records = []
    summary = get_financial_summary(records)
    assert "O usuário ainda não possui registros financeiros." in summary
