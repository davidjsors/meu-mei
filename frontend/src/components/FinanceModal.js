"use client";

import { useState, useEffect } from "react";

const CATEGORY_LABELS = {
    vendas: "Vendas",
    servicos: "Serviços",
    outros_receita: "Outros (Receita)",
    insumos: "Insumos",
    aluguel: "Aluguel",
    transporte: "Transporte",
    marketing: "Marketing",
    salarios: "Salários",
    impostos: "Impostos",
    utilidades: "Utilidades",
    outros_despesa: "Outros (Despesa)",
};

const ALL_CATEGORIES = [
    { value: "todas", label: "Todas as categorias" },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

function getMonthRange(offset = 0) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + offset;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
}

export default function FinanceModal({ phoneNumber, onClose }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthOffset, setMonthOffset] = useState(0);
    const [category, setCategory] = useState("todas");

    const monthRange = getMonthRange(monthOffset);

    useEffect(() => {
        if (!phoneNumber) return;
        setLoading(true);

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
        const params = new URLSearchParams({
            start_date: monthRange.start,
            end_date: monthRange.end,
        });
        if (category !== "todas") params.append("category", category);

        fetch(`${API_BASE}/api/user/finance/${phoneNumber}/records?${params}`)
            .then((r) => r.json())
            .then((data) => setRecords(data.records || []))
            .catch((err) => console.error("Erro ao buscar registros:", err))
            .finally(() => setLoading(false));
    }, [phoneNumber, monthRange.start, monthRange.end, category]);

    const formatCurrency = (value) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    const formatDate = (iso) =>
        new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    const totals = records.reduce(
        (acc, r) => {
            const amt = parseFloat(r.amount || 0);
            if (r.type === "entrada") acc.entradas += amt;
            else acc.saidas += amt;
            return acc;
        },
        { entradas: 0, saidas: 0 }
    );

    return (
        <div className="finance-modal-overlay" onClick={onClose}>
            <div className="finance-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="finance-modal-header">
                    <h2>📊 Histórico Financeiro</h2>
                    <button className="finance-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Filters */}
                <div className="finance-modal-filters">
                    <div className="finance-month-nav">
                        <button onClick={() => setMonthOffset((o) => o - 1)}>◀</button>
                        <span className="finance-month-label">{monthRange.label}</span>
                        <button
                            onClick={() => setMonthOffset((o) => o + 1)}
                            disabled={monthOffset >= 0}
                        >▶</button>
                    </div>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="finance-category-select"
                    >
                        {ALL_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Summary for filtered period */}
                <div className="finance-modal-summary">
                    <div className="finance-modal-summary-item positive">
                        <span>Entradas</span>
                        <span>{formatCurrency(totals.entradas)}</span>
                    </div>
                    <div className="finance-modal-summary-item negative">
                        <span>Saídas</span>
                        <span>{formatCurrency(totals.saidas)}</span>
                    </div>
                    <div className="finance-modal-summary-item balance">
                        <span>Saldo</span>
                        <span>{formatCurrency(totals.entradas - totals.saidas)}</span>
                    </div>
                </div>

                {/* Transaction list */}
                <div className="finance-modal-list">
                    {loading ? (
                        <div className="finance-modal-empty">Carregando...</div>
                    ) : records.length === 0 ? (
                        <div className="finance-modal-empty">
                            Nenhuma transação encontrada neste período.
                        </div>
                    ) : (
                        records.map((r, i) => (
                            <div key={r.id || i} className={`finance-record ${r.type}`}>
                                <div className="finance-record-icon">
                                    {r.type === "entrada" ? "↑" : "↓"}
                                </div>
                                <div className="finance-record-info">
                                    <span className="finance-record-desc">{r.description}</span>
                                    <span className="finance-record-meta">
                                        {CATEGORY_LABELS[r.category] || r.category}
                                        {r.created_at && ` · ${formatDate(r.created_at)}`}
                                    </span>
                                </div>
                                <div className={`finance-record-amount ${r.type}`}>
                                    {r.type === "saida" ? "- " : "+ "}
                                    {formatCurrency(r.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
