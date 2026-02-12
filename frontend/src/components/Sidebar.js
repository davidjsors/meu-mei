"use client";

import { useState, useEffect } from "react";

/**
 * Sidebar — Painel lateral com branding, resumo financeiro e sonho.
 * Busca dados financeiros reais do backend.
 */
export default function Sidebar({ profile, phoneNumber, refreshKey = 0 }) {
    const [finance, setFinance] = useState({ entradas: 0, saidas: 0, saldo: 0 });

    const levelLabels = {
        vulneravel: "🚩 Vulnerável",
        organizacao: "📊 Em Organização",
        visionario: "🚀 Visionário",
    };

    // Buscar dados financeiros
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
        // Atualizar a cada 30 segundos
        const interval = setInterval(fetchFinance, 30000);
        return () => clearInterval(interval);
    }, [phoneNumber, refreshKey]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value || 0);
    };

    return (
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">M</div>
                <div className="sidebar-title">
                    <h1>Meu MEI</h1>
                    <p>Finanças em dia, dinheiro no bolso</p>
                </div>
            </div>

            <div className="sidebar-content">
                {/* Saudação */}
                {profile?.name && (
                    <div style={{ padding: "0 16px 8px", color: "var(--text-secondary)", fontSize: 13 }}>
                        Olá, <strong>{profile.name}</strong>! 👋
                    </div>
                )}

                {/* Resumo Financeiro */}
                <div className="finance-card">
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
                        paddingTop: 10,
                        marginTop: 6,
                        fontWeight: 600,
                    }}>
                        <span>Saldo</span>
                        <span style={{
                            fontSize: 16,
                            color: finance.saldo >= 0 ? "var(--green)" : "var(--red-light)",
                        }}>
                            {formatCurrency(finance.saldo)}
                        </span>
                    </div>
                </div>

                {/* Sonho do Empreendedor */}
                {profile?.dream && (
                    <div className="dream-card">
                        <h3>🌟 Meu Sonho</h3>
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
        </aside>
    );
}
