"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
 * Sidebar — Painel lateral com branding, resumo financeiro, ações rápidas (inline) e navegação.
 * Três views: "home" (resumo), "finance" (histórico detalhado), "terms" (termos + deletar conta).
 */
export default function Sidebar({ profile, phoneNumber, refreshKey = 0, onSendTransaction }) {
    const router = useRouter();
    const [finance, setFinance] = useState({ entradas: 0, saidas: 0, saldo: 0 });
    const [view, setView] = useState("home"); // "home" | "finance" | "terms"

    // Transaction Inline Form State
    const [activeTransaction, setActiveTransaction] = useState(null); // "entry" | "exit" | null
    const [amount, setAmount] = useState("");

    const handleAmountChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (!value) {
            setAmount("");
            return;
        }
        const floatValue = parseInt(value) / 100;
        const formatted = floatValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        setAmount(formatted);
    };
    const [description, setDescription] = useState("");

    // Finance detail state
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);
    const [category, setCategory] = useState("todas");

    // Delete account state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const monthRange = getMonthRange(monthOffset);

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

    const handleLogout = () => {
        localStorage.removeItem("meumei_phone");
        localStorage.removeItem("meumei_login_at");
        router.push("/onboarding");
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            await fetch(`${API_BASE}/api/user/delete-account`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });
        } catch (err) {
            console.error("Erro ao deletar conta:", err);
        }
        localStorage.removeItem("meumei_phone");
        localStorage.removeItem("meumei_login_at");
        router.push("/onboarding");
    };

    const toggleTransaction = (type) => {
        if (activeTransaction === type) {
            setActiveTransaction(null);
        } else {
            setActiveTransaction(type);
            setAmount("");
            setDescription("");
        }
    };

    const submitTransaction = (e) => {
        e.preventDefault();
        if (!amount || !description) return;

        if (onSendTransaction) {
            onSendTransaction({
                type: activeTransaction,
                amount,
                description
            });
        }
        setActiveTransaction(null); // Close form
        setAmount("");
        setDescription("");
    };

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

                    {/* Quick Actions */}
                    <div className="sidebar-quick-actions" style={{ padding: "0 16px", marginTop: 16, display: 'flex', gap: 10 }}>
                        <button
                            className="btn-quick-entry"
                            onClick={() => toggleTransaction("entry")}
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: "8px",
                                background: activeTransaction === "entry" ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                                border: `1px solid ${activeTransaction === "entry" ? "#4ade80" : "rgba(34, 197, 94, 0.3)"}`,
                                color: "#4ade80",
                                fontWeight: "bold",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                transition: "all 0.2s"
                            }}
                        >
                            <span style={{ fontSize: "1.2em" }}>💰</span> Entrou Dindin
                        </button>
                        <button
                            className="btn-quick-exit"
                            onClick={() => toggleTransaction("exit")}
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: "8px",
                                background: activeTransaction === "exit" ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                                border: `1px solid ${activeTransaction === "exit" ? "#f87171" : "rgba(239, 68, 68, 0.3)"}`,
                                color: "#f87171",
                                fontWeight: "bold",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                transition: "all 0.2s"
                            }}
                        >
                            <span style={{ fontSize: "1.2em" }}>💸</span> Saiu Dindin
                        </button>
                    </div>

                    {/* INLINE FORM */}
                    {activeTransaction && (
                        <form onSubmit={submitTransaction} style={{
                            marginTop: 12,
                            padding: "16px",
                            background: "rgba(0,0,0,0.2)",
                            borderTop: "1px solid var(--border-color)",
                            borderBottom: "1px solid var(--border-color)",
                            animation: "slideDown 0.2s ease-out"
                        }}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                    Valor (R$)
                                </label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="0,00"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: 6,
                                        border: "1px solid var(--border-color)",
                                        background: "var(--bg-app)",
                                        color: "var(--text-primary)",
                                        fontSize: 14
                                    }}
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    placeholder={activeTransaction === "entry" ? "Ex: Venda de bolo" : "Ex: Conta de luz"}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: 6,
                                        border: "1px solid var(--border-color)",
                                        background: "var(--bg-app)",
                                        color: "var(--text-primary)",
                                        fontSize: 14
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTransaction(null)}
                                    style={{
                                        flex: 1, padding: "10px",
                                        background: "transparent",
                                        border: "1px solid var(--border-color)",
                                        color: "var(--text-secondary)",
                                        borderRadius: 6,
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!amount || !description}
                                    style={{
                                        flex: 1, padding: "10px",
                                        background: activeTransaction === "entry" ? "var(--green)" : "#ef4444",
                                        border: "none",
                                        color: "#fff",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        opacity: (!amount || !description) ? 0.5 : 1
                                    }}
                                >
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}

                    {/* REMOVED DREAM CARD */}
                </div>
            ) : view === "finance" ? (
                /* ═══ FINANCE DETAIL VIEW ═══ */
                <div className="sidebar-content sidebar-finance-view">
                    <button className="finance-back-btn" onClick={() => setView("home")}>
                        ← Voltar
                    </button>

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
            ) : (
                /* ═══ TERMS VIEW ═══ */
                <div className="sidebar-content sidebar-terms-view">
                    <button className="finance-back-btn" onClick={() => { setView("home"); setShowDeleteConfirm(false); }}>
                        ← Voltar
                    </button>

                    <div className="sidebar-terms-body">
                        <h2 className="sidebar-terms-title">📜 Termos de Uso e Política de Privacidade</h2>
                        <p className="sidebar-terms-subtitle"><strong>Meu MEI: Gestão Orientada ao Sonho</strong></p>

                        <p>
                            Bem-vindo ao <strong>Meu MEI</strong>. Ao utilizar nossa plataforma,
                            você confia a nós a gestão de dados importantes para o seu crescimento.
                            Este documento explica como protegemos seus dados, quais são seus
                            direitos e as regras para o uso da nossa tecnologia de mentoria financeira.
                        </p>

                        <h3>1. Termos de Uso (Regras de Convivência)</h3>

                        <h4>1.1. Objeto e Aceite</h4>
                        <p>
                            O Meu MEI é uma ferramenta de auxílio à gestão financeira e educação
                            para Microempreendedores Individuais. Ao clicar em &quot;Aceito os Termos&quot;,
                            você declara ter lido e concordado com estas regras.
                        </p>

                        <h4>1.2. Elegibilidade e Cadastro</h4>
                        <p>
                            A plataforma é destinada exclusivamente a MEIs devidamente registrados
                            no território brasileiro. O usuário é responsável pela veracidade dos
                            dados inseridos (CNPJ, faturamento, despesas).
                        </p>

                        <h4>1.3. Limitações da Inteligência Artificial</h4>
                        <p>O Meu MEI atua como um mentor educativo. Você declara estar ciente de que:</p>
                        <ul>
                            <li>As recomendações da IA são baseadas em dados inseridos por você e em modelos estatísticos.</li>
                            <li>O agente não substitui o aconselhamento profissional de um contador ou advogado.</li>
                            <li>O sistema não realiza transações bancárias nem investimentos em seu nome.</li>
                        </ul>

                        <h4>1.4. Uso Proibido</h4>
                        <p>
                            É terminantemente proibido utilizar a plataforma para registrar atividades
                            ilícitas, sonegação fiscal ou práticas que configurem lavagem de dinheiro ou fraude.
                        </p>

                        <h3>2. Política de Privacidade (LGPD)</h3>

                        <h4>2.1. Quais dados coletamos?</h4>
                        <ul>
                            <li><strong>Dados Cadastrais:</strong> Nome, e-mail, CPF e CNPJ.</li>
                            <li><strong>Dados Financeiros:</strong> Registros de entradas, saídas, boletos e fluxo de caixa.</li>
                            <li><strong>Dados Multimodais:</strong> Áudios enviados para registro de voz e imagens/PDFs de recibos.</li>
                            <li><strong>Dados de Diagnóstico:</strong> Respostas ao instrumento IAMF-MEI.</li>
                        </ul>

                        <h4>2.2. Para que usamos seus dados?</h4>
                        <p>
                            As finalidades incluem a personalização da linguagem conforme sua maturidade
                            financeira, processamento automatizado de recibos e análise de progresso rumo
                            ao seu &quot;Caminho para o Sonho&quot;.
                        </p>

                        <h4>2.3. Compartilhamento de Dados</h4>
                        <p>
                            Seus dados financeiros não são vendidos. Compartilhamos apenas com parceiros
                            essenciais (Google Cloud/Vertex AI) ou com o ecossistema Bradesco mediante
                            sua autorização prévia.
                        </p>

                        <h3>3. Segurança da Informação</h3>
                        <p>
                            Adotamos criptografia rigorosa em trânsito e em repouso, isolamento de domínio
                            e monitoramento constante de logs para garantir a integridade do sistema.
                        </p>

                        <h3>4. Atualizações</h3>
                        <p>
                            Este documento pode ser atualizado para refletir melhorias técnicas.
                            Notificaremos você sobre alterações importantes.
                        </p>

                        <p className="sidebar-terms-footer-note">Última atualização: 12 de Fevereiro de 2026.</p>

                        {/* Delete account section */}
                        <div className="sidebar-delete-section">
                            <h3>⚠️ Exclusão de Conta</h3>
                            <p>
                                Conforme a LGPD, você tem o direito de solicitar a exclusão de todos os seus dados pessoais.
                                Essa ação é <strong>irreversível</strong> e apagará permanentemente seu perfil,
                                conversas e registros financeiros.
                            </p>
                            {!showDeleteConfirm ? (
                                <button
                                    className="sidebar-delete-btn"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    🗑️ Solicitar exclusão da minha conta
                                </button>
                            ) : (
                                <div className="sidebar-delete-confirm">
                                    <p><strong>Tem certeza?</strong> Todos os seus dados serão apagados permanentemente.</p>
                                    <div className="sidebar-delete-confirm-btns">
                                        <button
                                            className="sidebar-delete-confirm-yes"
                                            onClick={handleDeleteAccount}
                                            disabled={deleting}
                                        >
                                            {deleting ? "Excluindo..." : "Sim, excluir minha conta"}
                                        </button>
                                        <button
                                            className="sidebar-delete-confirm-no"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SIDEBAR FOOTER ═══ */}
            <div className="sidebar-footer">
                <button className="sidebar-footer-btn" onClick={() => setView(view === "terms" ? "home" : "terms")}>
                    📜 Termos
                </button>
                <button className="sidebar-footer-btn sidebar-logout-btn" onClick={handleLogout}>
                    🚪 Sair
                </button>
            </div>
        </aside>
    );
}
