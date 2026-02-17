"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
    TrendingUp, TrendingDown, ShieldCheck, LogOut, Quote, Hand, BarChart3, Target, PencilLine, Trash2, CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Smartphone,
    Sparkles,
    Rocket,
    Smile,
    Fingerprint,
    Trophy,
    ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from "lucide-react";
import { MOTIVATIONAL_QUOTES } from "../data/quotes";
import Modal from "./Modal";
import { formatCurrency } from "../lib/utils";

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

    const label = start.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
        .replace(" de ", "/")
        .replace(".", "");

    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: label.charAt(0).toUpperCase() + label.slice(1),
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

    // Revenue Goal State
    const [revenueGoal, setRevenueGoal] = useState(null);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState("");
    const [goalLoading, setGoalLoading] = useState(false);

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
    const [shortcutCategory, setShortcutCategory] = useState("");
    const [isShortcutCategoryOpen, setIsShortcutCategoryOpen] = useState(false);

    // Finance detail state (filtered)
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);
    const [category, setCategory] = useState("todas");
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Goal/Chart state (always current month, unfiltered)
    const [goalRecords, setGoalRecords] = useState([]);

    // Delete account state
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Modal State
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
        confirmText: "Confirmar",
        cancelText: "Cancelar"
    });

    // Inline Deletion State
    const [deletingRecordId, setDeletingRecordId] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

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
                console.warn("Erro ao buscar dados financeiros (ouvindo backend):", err);
            }
        };

        fetchFinance();
        const interval = setInterval(fetchFinance, 30000);
        return () => clearInterval(interval);
    }, [phoneNumber, refreshKey]);

    // Buscar Meta de Faturamento
    useEffect(() => {
        if (!phoneNumber) return;
        const fetchProfile = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
                const resp = await fetch(`${API_BASE}/api/user/profile/${phoneNumber}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.revenue_goal) setRevenueGoal(parseFloat(data.revenue_goal));
                }
            } catch (err) {
                console.error("Erro ao buscar perfil:", err);
            }
        };
        fetchProfile();
    }, [phoneNumber]);

    // Sincronizar registros para a META (Sempre mês atual, todas categorias)
    useEffect(() => {
        if (!phoneNumber) return;
        const fetchGoalData = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
                const current = getMonthRange(0);
                const params = new URLSearchParams({
                    start_date: current.start,
                    end_date: current.end,
                });
                const resp = await fetch(`${API_BASE}/api/user/finance/${phoneNumber}/records?${params}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setGoalRecords(data.records || []);
                }
            } catch (err) {
                console.error("Erro ao buscar dados da meta:", err);
            }
        };
        fetchGoalData();
    }, [phoneNumber, refreshKey]);

    // Buscar registros detalhados (FILTRADOS - para a view "finance")
    useEffect(() => {
        if (view !== "finance" || !phoneNumber) return;

        let active = true;
        setLoading(true);

        const fetchRecords = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
                const params = new URLSearchParams({
                    start_date: monthRange.start,
                    end_date: monthRange.end,
                });
                if (category !== "todas") params.append("category", category);

                const resp = await fetch(`${API_BASE}/api/user/finance/${phoneNumber}/records?${params}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (active) setRecords(data.records || []);
                } else {
                    if (active) setRecords([]);
                }
            } catch (err) {
                console.error("Erro ao buscar registros:", err);
                if (active) setRecords([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchRecords();
        return () => { active = false; };
    }, [view, phoneNumber, monthRange.start, monthRange.end, category, refreshKey]);


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

    const performLogout = () => {
        localStorage.removeItem("meumei_phone");
        localStorage.removeItem("meumei_login_at");
        localStorage.removeItem("meumei_onboarding_progress");
        router.push("/onboarding");
    };

    const confirmDeleteAccount = async () => {
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

    const handleDeleteAccount = () => {
        setModal({
            isOpen: true,
            title: "Excluir Conta",
            message: "Tem certeza absoluta? Isso apagará todos os seus dados e histórico financeiro permanentemente. Essa ação não pode ser desfeita.",
            type: "danger",
            confirmText: "Excluir Definitivamente",
            onConfirm: () => {
                confirmDeleteAccount();
                closeModal();
            }
        });
    };

    const handleDeleteRecord = (id) => {
        setDeletingRecordId(id);
    };

    const processDeleteRecord = async (id) => {
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const resp = await fetch(`${API_BASE}/api/user/finance/record/${id}?phone_number=${phoneNumber}`, {
                method: "DELETE",
            });

            if (resp.ok) {
                // Remove from local state immediately
                setRecords(prev => prev.filter(r => r.id !== id));
                setGoalRecords(prev => prev.filter(r => r.id !== id)); // Updates Sales Goal

                // Update finance summary locally or refetch
                const financeResp = await fetch(`${API_BASE}/api/user/finance/${phoneNumber}`);
                if (financeResp.ok) {
                    const data = await financeResp.json();
                    setFinance(data);
                }
            } else {
                // alert("Erro ao excluir transação.");
            }
        } catch (err) {
            console.error("Erro ao excluir transação:", err);
            // alert("Erro ao excluir transação.");
        } finally {
            setDeletingRecordId(null);
            closeModal();
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleTransaction = (type) => {
        setIsSubmitting(false); // Reset/ensure logic
        if (activeTransaction === type) {
            setActiveTransaction(null);
        } else {
            setActiveTransaction(type);
            setAmount("");
            setDescription("");
            setShortcutCategory("");
            setIsShortcutCategoryOpen(false);
        }
    };

    const INCOME_CATEGORIES = [
        { value: "vendas", label: "Vendas" },
        { value: "servicos", label: "Serviços" },
        { value: "outros_receita", label: "Outros (Receita)" },
    ];

    const EXPENSE_CATEGORIES = [
        { value: "insumos", label: "Insumos" },
        { value: "aluguel", label: "Aluguel" },
        { value: "transporte", label: "Transporte" },
        { value: "marketing", label: "Marketing" },
        { value: "salarios", label: "Salários" },
        { value: "impostos", label: "Impostos" },
        { value: "utilidades", label: "Utilidades" },
        { value: "outros_despesa", label: "Outros (Despesa)" },
    ];

    const submitTransaction = (e) => {
        e.preventDefault();
        if (isSubmitting || !amount || !shortcutCategory) return;

        setIsSubmitting(true);

        if (onSendTransaction) {
            onSendTransaction({
                type: activeTransaction,
                amount,
                description: description || null,
                categoryLabel: CATEGORY_LABELS[shortcutCategory]
            });
        }

        // Slight delay or immediate close
        setActiveTransaction(null);
        setAmount("");
        setDescription("");
        setShortcutCategory("");
        setIsShortcutCategoryOpen(false);
        setIsSubmitting(false);
    };

    const handleSaveGoal = async () => {
        if (!tempGoal) return;
        setGoalLoading(true);
        const val = parseFloat(tempGoal.replace(/\./g, '').replace(',', '.'));

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const resp = await fetch(`${API_BASE}/api/user/profile/goal`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phoneNumber, revenue_goal: val })
            });
            if (resp.ok) {
                setRevenueGoal(val);
                setIsEditingGoal(false);
                setTempGoal("");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGoalLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!goalRecords || !goalRecords.length) return [];

        // Filter for income only and sort by date
        const incomeRecords = goalRecords
            .filter(r => r.type === "entrada")
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Create cumulative data
        let cumulative = 0;
        const data = [];

        // Group by day to avoid too many points? Or just exact points?
        // Let's group by day for smoother chart
        const byDay = {};
        incomeRecords.forEach(r => {
            const day = new Date(r.created_at).getDate();
            if (!byDay[day]) byDay[day] = 0;
            byDay[day] += parseFloat(r.amount);
        });

        const days = Object.keys(byDay).sort((a, b) => parseInt(a) - parseInt(b));

        // Fill days 1 to today (or end of month)
        // Actually, just showing progress points is enough

        days.forEach(day => {
            cumulative += byDay[day];
            data.push({ day: parseInt(day), value: cumulative });
        });

        // Ensure we have a point for today if not present? 
        // Or just let it be.

        return data;
    }, [goalRecords]);

    const percentAchieved = revenueGoal ? ((chartData.length > 0 ? chartData[chartData.length - 1].value : 0) / revenueGoal * 100) : 0;

    const currentQuote = useMemo(() => {
        const hour = new Date().getHours();
        return MOTIVATIONAL_QUOTES[hour % MOTIVATIONAL_QUOTES.length];
    }, []);

    return (
        <aside className="sidebar">
            {/* Header */}
            <div className="sidebar-header">
                <img src="/logo.svg" alt="MeuMEI" width={32} height={32} style={{ objectFit: 'contain' }} />
                <div className="sidebar-title">
                    <h1>Meu MEI</h1>
                    <p>finanças em dia, dinheiro no bolso</p>
                </div>
            </div>

            {view === "home" ? (
                /* ═══ HOME VIEW ═══ */
                <div className="sidebar-content">
                    {/* Saudação */}
                    <div style={{ padding: "0 0 8px", display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: 16, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span><strong style={{ color: "var(--red-primary)" }}>{profile.name?.trim().split(' ')[0]}</strong>!</span>
                            <Fingerprint size={14} style={{ color: "var(--green)" }} />
                        </div>

                        {profile.business_type && (
                            <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4, lineHeight: '1.4' }}>
                                <span>
                                    Eu sou {profile.business_type}
                                    {profile.dream ? (
                                        <> e meu sonho é <strong>{(() => {
                                            let d = profile.dream.trim();
                                            d = d.charAt(0).toLowerCase() + d.slice(1);
                                            if (!/[.!?]$/.test(d)) d += '.';
                                            return d;
                                        })()}</strong></>
                                    ) : '.'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Resumo Financeiro — clicável */}
                    <div
                        className={`finance-card ${finance.saldo >= 0 ? 'positive-bg' : 'negative-bg'}`}
                        onClick={() => setView("finance")}
                        id="tour-sidebar-balance"
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <BarChart3 size={18} color={finance.saldo >= 0 ? "var(--green)" : "var(--outflow-light)"} />
                            <h3 style={{ margin: 0 }}>Resumo Financeiro</h3>
                        </div>


                        <div className="finance-row positive">
                            <span>Entradas</span>
                            <span>{formatCurrency(finance.entradas)}</span>
                        </div>
                        <div className="finance-row negative">
                            <span>Saídas</span>
                            <span style={{ color: "var(--outflow-light)" }}>{formatCurrency(finance.saidas)}</span>
                        </div>
                        <div className="finance-row" style={{
                            borderTop: "1px solid var(--border-color)",
                            paddingTop: 10, marginTop: 6, fontWeight: 600,
                        }}>
                            <span>Saldo</span>
                            <span style={{
                                fontSize: 16,
                                color: finance.saldo >= 0 ? "var(--green)" : "var(--outflow-light)",
                            }}>
                                {formatCurrency(finance.saldo)}
                            </span>
                        </div>
                        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                            Toque para ver detalhes →
                        </div>
                    </div>

                    {/* META DE FATURAMENTO */}
                    <div className="finance-card goal-bg" id="tour-sidebar-goal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Target size={18} color="var(--green)" />
                                <h3 style={{ margin: 0, color: 'var(--green)' }}>Meta de Vendas</h3>
                            </div>
                            {revenueGoal && !isEditingGoal && (
                                <button onClick={() => {
                                    setIsEditingGoal(true);
                                    setTempGoal(revenueGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                                    <PencilLine size={16} color="var(--text-muted)" />
                                </button>
                            )}
                        </div>

                        {!revenueGoal || isEditingGoal ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Defina sua meta de vendas para este mês:</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>R$</span>
                                        <input
                                            type="text"
                                            placeholder="0,00"
                                            value={tempGoal}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, "");
                                                if (!v) {
                                                    setTempGoal("");
                                                    return;
                                                }
                                                const floatValue = parseInt(v) / 100;
                                                const formatted = floatValue.toLocaleString("pt-BR", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                });
                                                setTempGoal(formatted);
                                            }}
                                            style={{
                                                width: '100%', padding: '8px 8px 8px 32px', borderRadius: 6, border: '1px solid var(--border-color)',
                                                background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: 14
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveGoal}
                                        disabled={goalLoading}
                                        style={{
                                            padding: '8px 12px', background: 'var(--green)', border: 'none',
                                            borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        {goalLoading ? "..." : "Salvar"}
                                    </button>
                                </div>
                                {isEditingGoal && <button onClick={() => setIsEditingGoal(false)} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', alignSelf: 'start' }}>Cancelar</button>}
                            </div>
                        ) : (
                            <div>


                                <div style={{ display: 'flex', alignItems: 'center', marginTop: -10 }}>
                                    {/* Esquerda: Velocímetro */}
                                    <div style={{ height: 110, width: '60%', position: 'relative', marginLeft: -15 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    dataKey="value"
                                                    startAngle={180}
                                                    endAngle={0}
                                                    data={[
                                                        { name: 'Achieved', value: Math.min(percentAchieved, 100), fill: 'var(--red-primary)' },
                                                        { name: 'Remaining', value: Math.max(100 - percentAchieved, 0), fill: 'rgba(255,255,255,0.1)' },
                                                    ]}
                                                    cx="50%"
                                                    cy="85%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    stroke="none"
                                                >
                                                    <Cell key="achieved" fill="var(--red-primary)" />
                                                    <Cell key="remaining" fill="rgba(255,255,255,0.1)" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Needle */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '15%',
                                            left: 'calc(50% - 2px)',
                                            width: '4px',
                                            height: '65px',
                                            background: 'var(--green)',
                                            borderRadius: '2px 2px 0 0',
                                            transformOrigin: 'bottom center',
                                            transform: `rotate(${-90 + (Math.min(percentAchieved, 100) * 1.8)}deg)`,
                                            transition: 'transform 0.5s ease-out',
                                            zIndex: 5,
                                            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                                        }} />
                                        {/* Needle Pivot */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 'calc(15% - 4px)',
                                            left: 'calc(50% - 4px)',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--green)',
                                            zIndex: 6,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                        }} />
                                    </div>

                                    {/* Direita: Info consolidada */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingRight: 10 }}>
                                        <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                                {formatCurrency(goalRecords.filter(r => r.type === 'entrada').reduce((acc, r) => acc + parseFloat(r.amount), 0))}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>{" | "}</span>
                                            {formatCurrency(revenueGoal)}
                                        </div>
                                        <div style={{ fontSize: 18, color: 'var(--red-primary)', fontWeight: 'bold', marginTop: 5 }}>
                                            {percentAchieved.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Quick Actions Layout: Lado-a-Lado */}
                    <div className="sidebar-quick-actions" id="tour-sidebar-actions">
                        <div className="quick-actions-layout">
                            {/* Stack de Botões */}
                            <div className="quick-actions-btns-stack">
                                <button
                                    className={`btn-quick-action entry ${activeTransaction === "entry" ? "active" : ""}`}
                                    onClick={() => toggleTransaction("entry")}
                                >
                                    <TrendingUp size={24} />
                                    <span>Entrou Dindin</span>
                                </button>
                                <button
                                    className={`btn-quick-action exit ${activeTransaction === "exit" ? "active" : ""}`}
                                    onClick={() => toggleTransaction("exit")}
                                >
                                    <TrendingDown size={24} />
                                    <span>Saiu Dindin</span>
                                </button>
                            </div>

                            {/* Form ao lado */}
                            {activeTransaction && (
                                <form onSubmit={submitTransaction} className={`quick-action-inline-form ${activeTransaction}`}>
                                    <div style={{ marginBottom: 6 }}>
                                        <label style={{ display: "block", fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>
                                            Valor (R$) *
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="0,00"
                                            value={amount}
                                            onChange={handleAmountChange}
                                            style={{
                                                width: "100%", padding: "8px", borderRadius: 6,
                                                border: "1px solid var(--border-color)",
                                                background: "var(--bg-app)",
                                                color: "var(--text-primary)",
                                                fontSize: 13
                                            }}
                                            autoFocus
                                        />
                                    </div>

                                    <div style={{ marginBottom: 6 }}>
                                        <label style={{ display: "block", fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>
                                            Categoria *
                                        </label>
                                        <div className="custom-dropdown">
                                            <button
                                                type="button"
                                                className="dropdown-trigger"
                                                onClick={() => setIsShortcutCategoryOpen(!isShortcutCategoryOpen)}
                                                style={{ height: '36px', background: 'var(--bg-app)', padding: '0 8px' }}
                                            >
                                                <span style={{ fontSize: 12 }}>
                                                    {shortcutCategory
                                                        ? (activeTransaction === "entry" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).find(c => c.value === shortcutCategory)?.label
                                                        : "Selecione..."}
                                                </span>
                                                {isShortcutCategoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {isShortcutCategoryOpen && (
                                                <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', marginBottom: '8px' }}>
                                                    {(activeTransaction === "entry" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                                                        <div
                                                            key={cat.value}
                                                            className={`dropdown-item ${shortcutCategory === cat.value ? 'active' : ''}`}
                                                            style={{ padding: '8px 12px', fontSize: 12 }}
                                                            onClick={() => {
                                                                setShortcutCategory(cat.value);
                                                                setIsShortcutCategoryOpen(false);
                                                            }}
                                                        >
                                                            {cat.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: "block", fontSize: 10, color: "var(--text-secondary)", marginBottom: 2 }}>
                                            Descrição (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={activeTransaction === "entry" ? "Ex: Venda" : "Ex: Conta"}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            style={{
                                                width: "100%", padding: "8px", borderRadius: 6,
                                                border: "1px solid var(--border-color)",
                                                background: "var(--bg-app)",
                                                color: "var(--text-primary)",
                                                fontSize: 13
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTransaction(null)}
                                            style={{
                                                flex: 1, padding: "8px",
                                                background: "transparent",
                                                border: "1px solid var(--border-color)",
                                                color: "var(--text-secondary)",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontSize: 12
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!amount || !shortcutCategory}
                                            style={{
                                                flex: 1, padding: "8px",
                                                background: activeTransaction === "entry" ? "var(--green)" : "var(--outflow-primary)",
                                                border: "none",
                                                color: "#fff",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: 12,
                                                opacity: (!amount || !shortcutCategory) ? 0.5 : 1
                                            }}
                                        >
                                            Enviar
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* REMOVED DREAM CARD */}
                    {/* 3) Motive-se — Moved inside content for spacing consistency */}
                    <div className="quote-card" id="tour-sidebar-quote">
                        <div className="quote-header">
                            <Trophy size={14} color="currentColor" />
                            <h3>
                                Motive-se para alcançar o seu sonho
                            </h3>
                        </div>
                        <p>{currentQuote.text}</p>
                        {currentQuote.author && <span className="quote-author">— {currentQuote.author}</span>}
                    </div>

                    {/* ═══ SIDEBAR FOOTER (Moved inside Home content) ═══ */}
                    <div className="sidebar-footer">
                        <button className="sidebar-footer-btn" onClick={() => setView(view === "terms" ? "home" : "terms")}>
                            <ShieldCheck size={18} /> Termos
                        </button>
                        {showLogoutConfirm ? (
                            <div className="delete-confirm-inline" style={{ marginLeft: '12px' }}>
                                <span>Sair?</span>
                                <button className="confirm-yes" onClick={performLogout}>Sim</button>
                                <button className="confirm-no" onClick={() => setShowLogoutConfirm(false)}>Não</button>
                            </div>
                        ) : (
                            <button className="sidebar-footer-btn sidebar-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                                <LogOut size={18} /> Sair
                            </button>
                        )}
                    </div>
                </div>
            ) : view === "finance" ? (
                /* ═══ FINANCE DETAIL VIEW ═══ */
                <div className="sidebar-content sidebar-finance-view">
                    <button className="finance-back-btn" onClick={() => setView("home")}>
                        ← Voltar
                    </button>

                    <div className="finance-detail-filters">
                        <div className="finance-month-nav">
                            <button onClick={() => setMonthOffset((o) => o - 1)}>
                                <ChevronLeft size={16} />
                            </button>
                            <span className="finance-month-label">{monthRange.label}</span>
                            <button onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="custom-dropdown">
                            <button
                                className="dropdown-trigger"
                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            >
                                <span>{ALL_CATEGORIES.find(c => c.value === category)?.label}</span>
                                {isCategoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {isCategoryOpen && (
                                <div className="dropdown-menu">
                                    {ALL_CATEGORIES.map((c) => (
                                        <div
                                            key={c.value}
                                            className={`dropdown-item ${category === c.value ? 'active' : ''}`}
                                            onClick={() => {
                                                setCategory(c.value);
                                                setIsCategoryOpen(false);
                                            }}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="finance-detail-summary">
                        <div className="finance-detail-summary-item positive">
                            <span>Entradas</span>
                            <span>{formatCurrency(totals.entradas)}</span>
                        </div>
                        <div className="finance-detail-summary-item negative">
                            <span>Saídas</span>
                            <span style={{ color: "var(--outflow-light)" }}>{formatCurrency(totals.saidas)}</span>
                        </div>
                        <div className={`finance-detail-summary-item balance ${(totals.entradas - totals.saidas) >= 0 ? 'positive' : 'negative'}`}>
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
                                        <span className="finance-record-desc">
                                            {r.description.charAt(0).toUpperCase() + r.description.slice(1)}
                                        </span>
                                        <span className="finance-record-meta">
                                            {CATEGORY_LABELS[r.category] || r.category}
                                            {r.created_at && ` · ${formatDate(r.created_at)}`}
                                        </span>
                                    </div>
                                    <div className={`finance-record-amount ${r.type}`} style={{ color: r.type === "saida" ? "var(--outflow-light)" : "var(--green)" }}>
                                        {r.type === "saida" ? "- " : "+ "}
                                        {formatCurrency(r.amount)}

                                        {deletingRecordId === r.id ? (
                                            <div className="delete-confirm-inline" onClick={(e) => e.stopPropagation()}>
                                                <span>Excluir?</span>
                                                <button
                                                    className="confirm-yes"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        processDeleteRecord(r.id);
                                                    }}
                                                >
                                                    Sim
                                                </button>
                                                <button
                                                    className="confirm-no"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingRecordId(null);
                                                    }}
                                                >
                                                    Não
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRecord(r.id);
                                                }}
                                                className="finance-record-delete-btn"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
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
            )
            }


            <Modal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                confirmText={modal.confirmText}
                cancelText={modal.cancelText}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
            />
        </aside >
    );
}
