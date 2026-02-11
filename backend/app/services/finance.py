"""
Serviço de lógica financeira.
Funções utilitárias para cálculos e análises.
"""

from datetime import datetime, timedelta


def calculate_cash_flow(records: list[dict]) -> dict:
    """Calcula fluxo de caixa a partir dos registros financeiros."""
    total_income = sum(
        float(r["amount"]) for r in records if r["type"] == "entrada"
    )
    total_expenses = sum(
        float(r["amount"]) for r in records if r["type"] == "saida"
    )
    balance = total_income - total_expenses

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2),
        "record_count": len(records),
    }


def get_financial_summary(records: list[dict]) -> str:
    """Gera um resumo textual para injetar no contexto da IA."""
    if not records:
        return "O usuário ainda não possui registros financeiros."

    flow = calculate_cash_flow(records)

    # Agrupar por categoria
    categories: dict[str, float] = {}
    for r in records:
        cat = r.get("category", "Sem categoria") or "Sem categoria"
        amount = float(r["amount"])
        if r["type"] == "saida":
            amount = -amount
        categories[cat] = categories.get(cat, 0) + amount

    cat_summary = "\n".join(
        f"  - {cat}: R$ {abs(val):,.2f} ({'entrada' if val > 0 else 'saída'})"
        for cat, val in sorted(categories.items(), key=lambda x: abs(x[1]), reverse=True)
    )

    # Período
    dates = [
        r.get("record_date") for r in records if r.get("record_date")
    ]
    period = ""
    if dates:
        period = f"Período: {min(dates)} a {max(dates)}"

    return f"""Resumo Financeiro do Empreendedor:
- Entradas totais: R$ {flow['total_income']:,.2f}
- Saídas totais: R$ {flow['total_expenses']:,.2f}
- Saldo: R$ {flow['balance']:,.2f}
- Total de registros: {flow['record_count']}
{period}

Por categoria:
{cat_summary}
"""
