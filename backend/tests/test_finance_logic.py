
import pytest
from app.services.finance import calculate_cash_flow, get_financial_summary

def test_calculate_cash_flow_basic():
    records = [
        {"amount": 100.0, "type": "entrada"},
        {"amount": 50.0, "type": "saida"},
        {"amount": 20.0, "type": "entrada"}
    ]
    # (100 + 20 + 500) - 50 = 570
    flow = calculate_cash_flow(records, initial_balance=500.0)
    assert flow["total_income"] == 620.0
    assert flow["total_expenses"] == 50.0
    assert flow["balance"] == 570.0

def test_get_financial_summary_content():
    records = [
        {"amount": 100.0, "type": "entrada", "category": "vendas", "record_date": "2024-02-01"},
        {"amount": 30.0, "type": "saida", "category": "impostos", "record_date": "2024-02-05"}
    ]
    summary = get_financial_summary(records, initial_balance=1000.0)
    
    assert "Saldo Inicial (Onboarding): R$ 1,000.00" in summary
    assert "vendas: R$ 100.00 (entrada)" in summary
    assert "impostos: R$ 30.00 (saída)" in summary
    assert "Saldo Atual: R$ 1,070.00" in summary
    assert "Período: 2024-02-01 a 2024-02-05" in summary

def test_summary_empty():
    summary = get_financial_summary([], initial_balance=0.0)
    assert "ainda não possui registros" in summary
