"use client";

/**
 * Sidebar — Painel lateral com branding, resumo financeiro e sonho.
 * Visível apenas em desktop.
 */
export default function Sidebar({ profile }) {
    const levelLabels = {
        vulneravel: "🚩 Vulnerável",
        organizacao: "📊 Em Organização",
        visionario: "🚀 Visionário",
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
                {/* Resumo Financeiro */}
                <div className="finance-card">
                    <h3>📊 Resumo Financeiro</h3>
                    <div className="finance-row positive">
                        <span>Entradas</span>
                        <span>R$ 0,00</span>
                    </div>
                    <div className="finance-row negative">
                        <span>Saídas</span>
                        <span>R$ 0,00</span>
                    </div>
                    <div className="finance-row" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: 6 }}>
                        <span>Saldo</span>
                        <span style={{ fontSize: 16 }}>R$ 0,00</span>
                    </div>
                </div>

                {/* Sonho do Empreendedor */}
                {profile && (
                    <div className="dream-card">
                        <h3>🌟 Meu Sonho</h3>
                        <p>{profile.dream || "Ainda não definido"}</p>
                        <span className={`maturity-badge ${profile.maturity_level || ""}`}>
                            {levelLabels[profile.maturity_level] || "—"}
                            {profile.maturity_score && ` (${profile.maturity_score}/25)`}
                        </span>
                    </div>
                )}
            </div>
        </aside>
    );
}
