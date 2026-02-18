
import pytest
from app.services.finance import calculate_cash_flow, get_financial_summary

def test_calculate_cash_flow_basic():
    records = [
        {"amount": 500.0, "type": "entrada", "description": "Saldo Inicial"},
        {"amount": 100.0, "type": "entrada"},
        {"amount": 50.0, "type": "saida"},
    ]
    # (500 + 100) - 50 = 550
    flow = calculate_cash_flow(records)
    assert flow["total_income"] == 600.0
    assert flow["total_expenses"] == 50.0
    assert flow["balance"] == 550.0

def test_get_financial_summary_content():
    records = [
        {"amount": 1000.0, "type": "entrada", "category": "vendas", "description": "Saldo Inicial"},
        {"amount": 100.0, "type": "entrada", "category": "vendas"},
        {"amount": 30.0, "type": "saida", "category": "impostos"}
    ]
    summary = get_financial_summary(records)
    
    # Agora o Saldo Inicial entra como "vendas" (ou Geral)
    assert "vendas: R$ 1,100.00 (entrada)" in summary
    assert "impostos: R$ 30.00 (saída)" in summary
    assert "Saldo Atual: R$ 1,070.00" in summary

def test_summary_empty():
    summary = get_financial_summary([])
    assert "não possui registros" in summary
