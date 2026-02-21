"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Target, TrendingUp, Mic, Trophy, Menu } from "lucide-react";

// ─── Desktop Tour Steps (spotlight-based) ───────────────────────────────────
const DESKTOP_STEPS = [
    {
        id: "welcome",
        title: "Bem-vindo ao Meu MEI! 👋",
        content: "Parabéns por dar esse passo! Eu sou seu mentor e vou te ajudar a organizar suas finanças de um jeito simples e rápido. Vamos conhecer as ferramentas?",
        targetId: null,
        icon: <Sparkles size={24} className="tour-icon" style={{ color: "var(--yellow)" }} />
    },
    {
        id: "balance",
        title: "Seu Resumo Financeiro",
        content: "Aqui você acompanha o que entra e o que sai em tempo real. Toque nos valores para ver o histórico detalhado do mês!",
        targetId: "tour-sidebar-balance",
        icon: <TrendingUp size={24} className="tour-icon" style={{ color: "var(--green)" }} />
    },
    {
        id: "goal",
        title: "Sua Meta de Vendas",
        content: "Defina quanto você quer faturar este mês. O gráfico mostra o quanto você já caminhou para realizar seus sonhos!",
        targetId: "tour-sidebar-goal",
        icon: <Target size={24} className="tour-icon" style={{ color: "#FFD700" }} />
    },
    {
        id: "actions",
        title: "Registros Rápidos",
        content: "Vendeu algo ou teve um gasto? Use estes botões para registrar em segundos.",
        targetId: "tour-sidebar-actions",
        icon: <TrendingUp size={24} className="tour-icon" style={{ color: "var(--green)" }} />
    },
    {
        id: "chat",
        title: "Fale Comigo!",
        content: "Você pode me enviar mensagens, áudios ou até fotos de comprovantes. Eu entendo tudo e organizo para você!",
        targetId: "tour-chat-input",
        icon: <Mic size={24} className="tour-icon" style={{ color: "var(--primary-color)" }} />
    },
    {
        id: "motivation",
        title: "Lembre-se do seu Sonho",
        content: "Sempre que precisar de um incentivo, olhe aqui. Estou aqui para garantir que você chegue lá!",
        targetId: "tour-sidebar-quote",
        icon: <Trophy size={24} className="tour-icon" style={{ color: "var(--yellow)" }} />
    }
];

// ─── Mobile Tour Steps (card-based, no spotlight needed) ─────────────────────
// Estratégia: o usuário chega no chat. A sidebar está oculta.
// Ensinamos tudo via cards informativos sequenciais, sem depender de elementos visíveis.
const MOBILE_STEPS = [
    {
        id: "welcome",
        emoji: "👋",
        title: "Bem-vindo ao Meu MEI!",
        content: "Sou seu mentor financeiro. Vou te ajudar a organizar as finanças do seu negócio de um jeito simples. Vamos dar uma olhada rápida?",
        highlight: null,
    },
    {
        id: "chat",
        emoji: "💬",
        title: "Converse Comigo",
        content: "Esta é a tela principal. Você pode me mandar mensagens de texto, áudios ou até fotos de comprovantes. Eu entendo tudo!",
        highlight: "chat", // hint visual
    },
    {
        id: "menu",
        emoji: "☰",
        title: "Seu Painel Financeiro",
        content: "Toque no ícone de menu (☰) no canto superior esquerdo para ver seu saldo, metas e registrar entradas e saídas rapidinho.",
        highlight: "menu",
    },
    {
        id: "balance",
        emoji: "💰",
        title: "Saldo e Metas",
        content: "No painel lateral você acompanha quanto entrou, quanto saiu e o progresso da sua meta mensal em tempo real.",
        highlight: null,
    },
    {
        id: "quick",
        emoji: "⚡",
        title: "Registros em 1 Toque",
        content: "No painel lateral há botões rápidos para registrar uma venda ou gasto. Rápido e fácil!",
        highlight: null,
    },
    {
        id: "ready",
        emoji: "🚀",
        title: "Tudo Pronto!",
        content: "Agora você já sabe tudo. Comece me contando como foi seu dia no negócio, ou registre sua primeira transação!",
        highlight: null,
    }
];

export default function GuidanceTour({ onClose, phoneNumber }) {
    const [isMobile, setIsMobile] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const [spotlightStyle, setSpotlightStyle] = useState({});

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
    const currentStep = steps[stepIndex];

    // ─── Desktop: spotlight positioning ──────────────────────────────────────
    const updatePosition = useCallback(() => {
        if (isMobile) return; // Mobile uses its own layout

        if (!currentStep.targetId) {
            setTooltipStyle({
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                position: "fixed", width: "400px", maxWidth: "400px", zIndex: 10001
            });
            setSpotlightStyle({
                position: "fixed", inset: 0,
                background: "rgba(0, 0, 0, 0.85)", zIndex: 10000
            });
            return;
        }

        const element = document.getElementById(currentStep.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 8;

            setSpotlightStyle({
                top: rect.top - padding, left: rect.left - padding,
                width: rect.width + padding * 2, height: rect.height + padding * 2,
                position: "fixed", borderRadius: "12px", display: "block",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.85)",
                border: "2px solid var(--green)", zIndex: 10000
            });

            const tooltipPadding = 24;
            let top, left;

            if (currentStep.targetId.startsWith("tour-sidebar")) {
                top = rect.top + (rect.height / 2) - 100;
                left = rect.right + tooltipPadding;
                if (top + 250 > window.innerHeight) top = window.innerHeight - 270;
                if (top < 20) top = 20;
            } else {
                top = rect.top - 220 - tooltipPadding;
                left = rect.left + (rect.width / 2) - 160;
                if (top < 20) top = rect.bottom + tooltipPadding;
            }

            if (left + 340 > window.innerWidth) left = window.innerWidth - 350;
            if (left < 10) left = 10;

            setTooltipStyle({ top, left, position: "fixed", zIndex: 10001 });
        }
    }, [currentStep, isMobile]);

    useEffect(() => {
        if (!isMobile) {
            updatePosition();
            window.addEventListener("resize", updatePosition);
            return () => window.removeEventListener("resize", updatePosition);
        }
    }, [updatePosition, isMobile]);

    const handleNext = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1);
    };

    const handleFinish = () => {
        if (phoneNumber) {
            localStorage.setItem(`meumei_tour_completed_${phoneNumber}`, "true");
        }
        onClose();
    };

    // ─── Mobile: Card-based tour ──────────────────────────────────────────────
    if (isMobile) {
        return (
            <div style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.75)",
                display: "flex", alignItems: "flex-end",
                justifyContent: "center",
                padding: "0 0 24px 0",
            }}>
                <div style={{
                    background: "var(--bg-sidebar)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "24px 24px 16px 16px",
                    width: "calc(100% - 32px)",
                    maxWidth: "420px",
                    padding: "28px 24px 24px",
                    position: "relative",
                    animation: "slideUpCard 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}>
                    {/* Close */}
                    <button onClick={handleFinish} style={{
                        position: "absolute", top: "16px", right: "16px",
                        background: "rgba(255,255,255,0.08)", border: "none",
                        color: "var(--text-muted)", cursor: "pointer",
                        width: "32px", height: "32px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <X size={16} />
                    </button>

                    {/* Emoji + Title */}
                    <div style={{ marginBottom: "12px" }}>
                        <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>
                            {currentStep.emoji}
                        </span>
                        <h3 style={{
                            margin: 0, fontSize: "18px", fontWeight: "700",
                            color: "var(--text-primary)"
                        }}>
                            {currentStep.title}
                        </h3>
                    </div>

                    {/* Content */}
                    <p style={{
                        fontSize: "14px", lineHeight: "1.6",
                        color: "var(--text-secondary)", margin: "0 0 24px 0"
                    }}>
                        {currentStep.content}
                    </p>

                    {/* Highlight hint */}
                    {currentStep.highlight === "menu" && (
                        <div style={{
                            background: "rgba(227, 38, 54, 0.1)",
                            border: "1px solid rgba(227, 38, 54, 0.3)",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            marginBottom: "20px",
                            display: "flex", alignItems: "center", gap: "10px",
                            fontSize: "13px", color: "var(--text-secondary)"
                        }}>
                            <Menu size={18} style={{ color: "var(--red-primary)", flexShrink: 0 }} />
                            <span>Procure o ícone <strong style={{ color: "var(--text-primary)" }}>☰</strong> no canto superior esquerdo da tela</span>
                        </div>
                    )}
                    {currentStep.highlight === "chat" && (
                        <div style={{
                            background: "rgba(0, 210, 106, 0.08)",
                            border: "1px solid rgba(0, 210, 106, 0.2)",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            marginBottom: "20px",
                            display: "flex", alignItems: "center", gap: "10px",
                            fontSize: "13px", color: "var(--text-secondary)"
                        }}>
                            <Mic size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
                            <span>Use o campo de texto abaixo para começar a conversar</span>
                        </div>
                    )}

                    {/* Footer: dots + buttons */}
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        {/* Progress dots */}
                        <div style={{ display: "flex", gap: "6px" }}>
                            {steps.map((_, i) => (
                                <span key={i} style={{
                                    width: i === stepIndex ? "20px" : "6px",
                                    height: "6px",
                                    borderRadius: "3px",
                                    background: i === stepIndex
                                        ? "var(--red-primary)"
                                        : i < stepIndex
                                            ? "var(--green)"
                                            : "var(--border-color)",
                                    transition: "all 0.3s ease",
                                    display: "inline-block",
                                }} />
                            ))}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            {stepIndex > 0 && (
                                <button onClick={handleBack} style={{
                                    background: "none",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-secondary)",
                                    borderRadius: "10px",
                                    padding: "8px 14px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "4px"
                                }}>
                                    <ChevronLeft size={16} />
                                </button>
                            )}
                            <button onClick={handleNext} style={{
                                background: stepIndex === steps.length - 1
                                    ? "var(--red-primary)"
                                    : "var(--green)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "10px",
                                padding: "8px 20px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                                transition: "filter 0.2s",
                            }}>
                                {stepIndex === steps.length - 1 ? "Vamos lá! 🚀" : "Próximo"}
                                {stepIndex < steps.length - 1 && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes slideUpCard {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // ─── Desktop: Spotlight tour (original behavior) ──────────────────────────
    return (
        <div className="tour-overlay" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            <div className="tour-spotlight" style={spotlightStyle}></div>

            <div className={`tour-tooltip`} style={tooltipStyle}>
                <button className="tour-close" onClick={handleFinish} style={{ top: '16px', right: '16px' }}>
                    <X size={18} />
                </button>

                <div className="tour-header" style={{ marginTop: '4px' }}>
                    <div className="tour-icon-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                        {currentStep.icon}
                    </div>
                    <h3 style={{ fontSize: '18px' }}>{currentStep.title}</h3>
                </div>

                <p className="tour-content" style={{ fontSize: '14px', marginBottom: '24px' }}>
                    {currentStep.content}
                </p>

                <div className="tour-footer">
                    <div className="tour-progress" style={{ gap: '6px' }}>
                        {steps.map((_, i) => (
                            <span key={i} className={`progress-dot ${i === stepIndex ? 'active' : ''}`}></span>
                        ))}
                    </div>

                    <div className="tour-buttons" style={{ gap: '12px' }}>
                        {stepIndex > 0 && (
                            <button className="tour-btn-back" onClick={handleBack} style={{ padding: '8px 12px', fontSize: '13px' }}>
                                <ChevronLeft size={16} />
                                Anterior
                            </button>
                        )}
                        <button className="tour-btn-next" onClick={handleNext} style={{ padding: '10px 20px', fontSize: '13px' }}>
                            {stepIndex === steps.length - 1 ? "Começar Agora!" : "Próximo"}
                            {stepIndex < steps.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .tour-tooltip {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    width: 360px;
                    padding: 28px;
                    color: var(--text-primary);
                    animation: fadeInScale 0.3s ease-out;
                }
                .tour-close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                }
                .tour-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .tour-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #fff;
                }
                .tour-content {
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    margin-bottom: 24px;
                }
                .tour-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .tour-progress {
                    display: flex;
                    gap: 6px;
                }
                .progress-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--border-color);
                    transition: all 0.2s;
                    display: inline-block;
                }
                .progress-dot.active {
                    background: var(--green);
                    transform: scale(1.3);
                }
                .tour-buttons {
                    display: flex;
                    gap: 12px;
                }
                .tour-btn-next {
                    background: #00763D;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: filter 0.2s;
                }
                .tour-btn-next:hover { filter: brightness(1.1); }
                .tour-btn-back {
                    background: none;
                    border: 1px solid var(--border-color);
                    color: var(--text-secondary);
                    border-radius: 8px;
                    padding: 8px 12px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95) translate(-50%, -50%); }
                    to { opacity: 1; transform: scale(1) translate(-50%, -50%); }
                }
                .tour-tooltip[style*="translate(-50%, -50%)"] {
                    animation: fadeInScaleCenter 0.3s ease-out;
                }
                @keyframes fadeInScaleCenter {
                    from { opacity: 0; transform: scale(0.95) translate(-50%, -50%); }
                    to { opacity: 1; transform: scale(1) translate(-50%, -50%); }
                }
            `}</style>
        </div>
    );
}
