
import pytest
from app.services.finance import calculate_cash_flow
import random

def test_financial_integrity_bulk():
    # Simulando 100 transações
    initial_balance = 1000.0
    records = []
    expected_balance = initial_balance
    
    for _ in range(100):
        amount = round(random.uniform(1.0, 500.0), 2)
        if random.choice(["entrada", "saida"]) == "entrada":
            records.append({"amount": amount, "type": "entrada"})
            expected_balance += amount
        else:
            records.append({"amount": amount, "type": "saida"})
            expected_balance -= amount
            
    flow = calculate_cash_flow(records, initial_balance=initial_balance)
    
    # Tolerância para erros de float (apesar do round no calculo)
    assert flow["balance"] == pytest.approx(expected_balance, 0.01)
    assert flow["total_income"] >= initial_balance

def test_integrity_edge_cases():
    # Tudo zero
    flow = calculate_cash_flow([], initial_balance=0.0)
    assert flow["balance"] == 0.0
    
    # Saídas maiores que entradas
    records = [{"amount": 1000.0, "type": "saida"}]
    flow = calculate_cash_flow(records, initial_balance=50.0)
    assert flow["balance"] == -950.0
