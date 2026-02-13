"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Target, TrendingUp, Mic, Trophy } from "lucide-react";

const TOUR_STEPS = [
    {
        id: "welcome",
        title: "Bem-vindo ao Meu MEI! 👋",
        content: "Parabéns por dar esse passo! Eu sou seu mentor e vou te ajudar a organizar suas finanças de um jeito simples e rápido. Vamos conhecer as ferramentas?",
        targetId: null, // Center of screen
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
        content: "Vendeu algo ou teve um gasto? Use estes botões para registrar em segundos sem precisar digitar.",
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

export default function GuidanceTour({ onClose, phoneNumber }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState({});
    const [spotlightStyle, setSpotlightStyle] = useState({});

    const currentStep = TOUR_STEPS[stepIndex];

    const updatePosition = useCallback(() => {
        if (!currentStep.targetId) {
            setTooltipStyle({
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                position: "fixed",
                width: "400px",
                zIndex: 10001
            });
            setSpotlightStyle({
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                zIndex: 10000
            });
            return;
        }

        const element = document.getElementById(currentStep.targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            const padding = 8;

            setSpotlightStyle({
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
                position: "fixed",
                borderRadius: "12px",
                display: "block",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.85)",
                border: "2px solid var(--green)",
                zIndex: 10000
            });

            // Intelligent Positioning
            const tooltipPadding = 24;
            let top, left;

            if (currentStep.targetId.startsWith("tour-sidebar")) {
                // Sidebar is on the left, show tooltip to the right
                top = rect.top + (rect.height / 2) - 100; // Center vertically relative to target
                left = rect.right + tooltipPadding;

                // Keep within screen
                if (top + 250 > window.innerHeight) top = window.innerHeight - 270;
                if (top < 20) top = 20;
            } else {
                // Default: top (for chat input etc)
                top = rect.top - 220 - tooltipPadding;
                left = rect.left + (rect.width / 2) - 160;

                // If too high, show below
                if (top < 20) top = rect.bottom + tooltipPadding;
            }

            // Final bounds check for left/right
            if (left + 320 > window.innerWidth) left = window.innerWidth - 340;
            if (left < 20) left = 20;

            setTooltipStyle({
                top,
                left,
                position: "fixed",
                zIndex: 10001
            });
        }
    }, [currentStep]);

    useEffect(() => {
        updatePosition();
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [updatePosition]);

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) {
            setStepIndex(stepIndex - 1);
        }
    };

    const handleFinish = () => {
        if (phoneNumber) {
            localStorage.setItem(`meumei_tour_completed_${phoneNumber}`, "true");
        }
        onClose();
    };

    return (
        <div className="tour-overlay" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            <div className="tour-spotlight" style={spotlightStyle}></div>

            <div className="tour-tooltip shadow-2xl" style={tooltipStyle}>
                <button className="tour-close" onClick={handleFinish}>
                    <X size={18} />
                </button>

                <div className="tour-header">
                    {currentStep.icon}
                    <h3>{currentStep.title}</h3>
                </div>

                <p className="tour-content">{currentStep.content}</p>

                <div className="tour-footer">
                    <div className="tour-progress">
                        {TOUR_STEPS.map((_, i) => (
                            <span key={i} className={`progress-dot ${i === stepIndex ? 'active' : ''}`}></span>
                        ))}
                    </div>

                    <div className="tour-buttons">
                        {stepIndex > 0 && (
                            <button className="tour-btn-back" onClick={handleBack}>
                                <ChevronLeft size={16} />
                                Anterior
                            </button>
                        )}
                        <button className="tour-btn-next" onClick={handleNext}>
                            {stepIndex === TOUR_STEPS.length - 1 ? "Começar Agora!" : "Próximo"}
                            {stepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .tour-tooltip {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    width: 320px;
                    padding: 24px;
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
                }
                .progress-dot.active {
                    background: var(--green);
                    transform: scale(1.3);
                }
                .tour-buttons {
                    display: flex;
                    gap: 8px;
                }
                .tour-btn-next {
                    background: var(--green);
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    transition: filter 0.2s;
                }
                .tour-btn-next:hover {
                    filter: brightness(1.1);
                }
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
                /* Adjustment for centered tooltip */
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
