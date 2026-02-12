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

/**
 * Sidebar — Painel lateral com branding, resumo financeiro e sonho.
 * Dois modos: "home" (resumo) e "finance" (histórico detalhado).
 */
export default function Sidebar({ profile, phoneNumber, refreshKey = 0 }) {
    const [finance, setFinance] = useState({ entradas: 0, saidas: 0, saldo: 0 });
    const [view, setView] = useState("home"); // "home" | "finance"

    // Finance detail state
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);
    const [category, setCategory] = useState("todas");

    const monthRange = getMonthRange(monthOffset);

    const levelLabels = {
        vulneravel: "🚩 Vulnerável",
        organizacao: "📊 Em Organização",
        visionario: "🚀 Visionário",
    };

    // Buscar resumo financeiro
    useEffect(() => {
        if (!phoneNumber) return;

        const fetchFinance = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
                const resp = await fetch(`${API_BASE}/api/user/finance/${phoneNumber}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setFinance(data);
                }
            } catch (err) {
                console.error("Erro ao buscar dados financeiros:", err);
            }
        };

        fetchFinance();
        const interval = setInterval(fetchFinance, 30000);
        return () => clearInterval(interval);
    }, [phoneNumber, refreshKey]);

    // Buscar registros detalhados (quando na view "finance")
    useEffect(() => {
        if (view !== "finance" || !phoneNumber) return;
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
    }, [view, phoneNumber, monthRange.start, monthRange.end, category]);

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
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <img src="/logo.svg" alt="MeuMEI" width={48} height={48} style={{ objectFit: 'contain' }} />
                <div className="sidebar-title">
                    <h1>Meu MEI</h1>
                    <p>finanças em dia, dinheiro no bolso</p>
                </div>
            </div>

            {view === "home" ? (
                /* ═══ HOME VIEW ═══ */
                <div className="sidebar-content">
                    {/* Saudação */}
                    {profile?.name && (
                        <div style={{ padding: "0 16px 8px", color: "var(--text-secondary)", fontSize: 13 }}>
                            Olá, <strong>{profile.name}</strong>! 👋
                        </div>
                    )}

                    {/* Resumo Financeiro — clicável */}
                    <div className="finance-card" onClick={() => setView("finance")} style={{ cursor: 'pointer' }}>
                        <h3>📊 Resumo Financeiro</h3>
                        <div className="finance-row positive">
                            <span>Entradas</span>
                            <span>{formatCurrency(finance.entradas)}</span>
                        </div>
                        <div className="finance-row negative">
                            <span>Saídas</span>
                            <span>{formatCurrency(finance.saidas)}</span>
                        </div>
                        <div className="finance-row" style={{
                            borderTop: "1px solid var(--border-color)",
                            paddingTop: 10, marginTop: 6, fontWeight: 600,
                        }}>
                            <span>Saldo</span>
                            <span style={{
                                fontSize: 16,
                                color: finance.saldo >= 0 ? "var(--green)" : "var(--red-light)",
                            }}>
                                {formatCurrency(finance.saldo)}
                            </span>
                        </div>
                        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                            Toque para ver detalhes →
                        </div>
                    </div>

                    {/* Objetivo do Empreendedor */}
                    {profile?.dream && (
                        <div className="dream-card">
                            <h3>🌟 Meu Objetivo</h3>
                            <p>{profile.dream}</p>
                            {profile.maturity_level && (
                                <span className={`maturity-badge ${profile.maturity_level}`}>
                                    {levelLabels[profile.maturity_level] || "—"}
                                    {profile.maturity_score && ` (${profile.maturity_score}/25)`}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ═══ FINANCE DETAIL VIEW ═══ */
                <div className="sidebar-content sidebar-finance-view">
                    {/* Back button */}
                    <button className="finance-back-btn" onClick={() => setView("home")}>
                        ← Voltar
                    </button>

                    {/* Month navigation */}
                    <div className="finance-detail-filters">
                        <div className="finance-month-nav">
                            <button onClick={() => setMonthOffset((o) => o - 1)}>◀</button>
                            <span className="finance-month-label">{monthRange.label}</span>
                            <button onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0}>▶</button>
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

                    {/* Period summary */}
                    <div className="finance-detail-summary">
                        <div className="finance-detail-summary-item positive">
                            <span>Entradas</span>
                            <span>{formatCurrency(totals.entradas)}</span>
                        </div>
                        <div className="finance-detail-summary-item negative">
                            <span>Saídas</span>
                            <span>{formatCurrency(totals.saidas)}</span>
                        </div>
                        <div className="finance-detail-summary-item balance">
                            <span>Saldo</span>
                            <span>{formatCurrency(totals.entradas - totals.saidas)}</span>
                        </div>
                    </div>

                    {/* Transaction list */}
                    <div className="finance-detail-list">
                        {loading ? (
                            <div className="finance-detail-empty">Carregando...</div>
                        ) : records.length === 0 ? (
                            <div className="finance-detail-empty">
                                Nenhuma transação neste período.
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
            )}
        </aside>
    );
}
