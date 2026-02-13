"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Target,
    Rocket,
    Briefcase,
    User,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Smartphone,
    Sparkles
} from "lucide-react";

/**
 * Onboarding Meu MEI - Fluxo Consolidado
 * Estilo Centered Card + Typeform
 */

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const MATURITY_QUESTIONS = [
    "Você costuma registrar todas as entradas e saídas do seu negócio? Tipo, anota tudo certinho o que vende e o que gasta?",
    "E sobre as contas: você usa conta separada pra vida pessoal e pro negócio, ou tá tudo junto ainda?",
    "Quando chega a hora de pagar os boletos, você já sabe de antemão se vai ter dinheiro? Você acompanha isso?",
    "Você costuma buscar aprender sobre gestão financeira? Cursos, vídeos, dicas...",
    "Na hora de colocar preço no que você vende, você sabe direitinho quanto gasta pra produzir e quanto sobra de lucro?"
];

const MATURITY_OPTIONS = [
    { label: "Nunca", value: 1 },
    { label: "Raramente", value: 2 },
    { label: "Às vezes", value: 3 },
    { label: "Frequentemente", value: 4 },
    { label: "Sempre", value: 5 },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [revenueGoal, setRevenueGoal] = useState("");
    const [dream, setDream] = useState("");
    const [answers, setAnswers] = useState(new Array(5).fill(null));
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [invalidField, setInvalidField] = useState(""); // Rastreia qual campo falhou na validação
    const [acceptedTerms, setAcceptedTerms] = useState(false); // Aceite dos termos

    useEffect(() => {
        const savedPhone = localStorage.getItem("meumei_phone");
        const loginAt = localStorage.getItem("meumei_login_at");
        if (savedPhone && loginAt && (Date.now() - Number(loginAt)) < SESSION_DURATION_MS) {
            router.replace("/chat");
        }
    }, [router]);

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const handlePhoneSubmit = async () => {
        if (phone.length !== 13) return;
        setLoading(true);
        setError("");

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const resp = await fetch(`${API_BASE}/api/user/profile/${phone}`);

            if (resp.ok) {
                const profile = await resp.json();
                if (profile && profile.maturity_score && profile.terms_accepted) {
                    localStorage.setItem("meumei_phone", phone);
                    localStorage.setItem("meumei_login_at", String(Date.now()));
                    router.push("/chat");
                    return;
                }
            }
            setStep(2);
        } catch (err) {
            console.error("Erro no login:", err);
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileNext = () => {
        setInvalidField(""); // Reseta antes de validar novamente

        if (!name.trim()) {
            setError("Opa! Como podemos te chamar? Informe seu nome.");
            setInvalidField("name");
            return;
        }
        if (!businessType.trim()) {
            setError("Qual o ramo do seu negócio? (ex: Confeitaria)");
            setInvalidField("businessType");
            return;
        }
        if (!revenueGoal.trim()) {
            setError("Informe sua meta de vendas para este mês.");
            setInvalidField("revenueGoal");
            return;
        }
        if (!dream.trim()) {
            setError("Conte para a gente qual o seu maior sonho!");
            setInvalidField("dream");
            return;
        }
        setError("");
        setInvalidField("");
        setStep(3);
    };

    const handleAnswer = (value) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = value;
        setAnswers(newAnswers);

        if (currentQuestion < MATURITY_QUESTIONS.length - 1) {
            setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
        } else {
            setStep(4);
        }
    };

    const handleFinalSubmit = async () => {
        setInvalidField("");
        if (!acceptedTerms) {
            setInvalidField("terms");
            setError("Opa! Você precisa aceitar os termos para começarmos.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const goalValue = parseFloat(revenueGoal.replace(/\./g, '').replace(',', '.')) || 0;

            // 1. Salvar perfil e maturidade
            const matResp = await fetch(`${API_BASE}/api/user/maturity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: phone,
                    name,
                    business_type: businessType,
                    dream,
                    revenue_goal: goalValue,
                    answers
                }),
            });

            if (!matResp.ok) throw new Error("Erro ao salvar perfil");

            // 2. Aceitar termos
            await fetch(`${API_BASE}/api/user/accept-terms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phone }),
            });

            localStorage.setItem("meumei_phone", phone);
            localStorage.setItem("meumei_login_at", String(Date.now()));
            router.push("/chat");
        } catch (err) {
            setError("Erro ao finalizar cadastro. Tente novamente.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isValidProfile = name.trim() && businessType.trim() && revenueGoal.trim() && dream.trim();

    // --- RENDERERS ---

    const renderPhone = () => (
        <div className="onboarding-card">
            <p className="onboarding-subtitle">
                Digite seu telefone para começar sua jornada rumo à independência financeira.
            </p>

            <div className="onboarding-form-group">
                <label className="onboarding-label"><Smartphone size={12} /> SEU TELEFONE</label>
                <input
                    className="onboarding-input"
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold' }}
                    placeholder="11-98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                    maxLength={13}
                    autoFocus
                />
            </div>

            <button
                className={`onboarding-btn ${phone.length !== 13 ? 'is-inactive' : ''}`}
                onClick={handlePhoneSubmit}
                disabled={loading}
            >
                {loading ? "Verificando..." : "Continuar →"}
            </button>
            <p className="onboarding-footer-note">Sua conta é vinculada ao seu número. 🔒</p>
        </div>
    );

    const renderProfile = () => (
        <div className="onboarding-card" style={{ maxWidth: '580px' }}>
            <h2 className="onboarding-title">Queremos te conhecer!</h2>
            <p className="onboarding-subtitle">Conte um pouco sobre você e o seu negócio.</p>

            <div className="onboarding-form-group">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label className="onboarding-label"><User size={12} /> NOME</label>
                        <input
                            className={`onboarding-input ${invalidField === 'name' ? 'input-error-blink' : ''}`}
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (invalidField === 'name') setInvalidField("");
                            }}
                        />
                    </div>
                    <div>
                        <label className="onboarding-label"><Briefcase size={12} /> RAMO</label>
                        <input
                            className={`onboarding-input ${invalidField === 'businessType' ? 'input-error-blink' : ''}`}
                            placeholder="Ex: Confeitaria..."
                            value={businessType}
                            onChange={(e) => {
                                setBusinessType(e.target.value);
                                if (invalidField === 'businessType') setInvalidField("");
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="onboarding-form-group">
                <label className="onboarding-label"><Target size={12} /> META DE VENDAS (MENSAL)</label>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-muted)' }}>R$</span>
                    <input
                        className={`onboarding-input ${invalidField === 'revenueGoal' ? 'input-error-blink' : ''}`}
                        style={{ paddingLeft: '48px' }}
                        placeholder="0,00"
                        value={revenueGoal}
                        onChange={(e) => {
                            if (invalidField === 'revenueGoal') setInvalidField("");
                            let v = e.target.value.replace(/\D/g, "");
                            if (!v) { setRevenueGoal(""); return; }
                            const floatValue = parseInt(v) / 100;
                            setRevenueGoal(floatValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                        }}
                    />
                </div>
            </div>

            <div className="onboarding-form-group">
                <label className="onboarding-label"><Rocket size={12} /> SEU MAIOR SONHO</label>
                <textarea
                    className={`onboarding-input ${invalidField === 'dream' ? 'input-error-blink' : ''}`}
                    style={{ minHeight: '100px', resize: 'none' }}
                    placeholder="Ex: Abrir minha loja física..."
                    value={dream}
                    onChange={(e) => {
                        setDream(e.target.value);
                        if (invalidField === 'dream') setInvalidField("");
                    }}
                />
            </div>

            {error && <p className="onboarding-error">{error}</p>}

            <button
                onClick={handleProfileNext}
                className={`onboarding-btn ${!isValidProfile ? 'is-inactive' : ''}`}
                disabled={loading}
            >
                {loading ? "Processando..." : "Tudo pronto! Vamos para o quiz →"}
            </button>
        </div>
    );

    const renderMaturity = () => {
        const progress = ((currentQuestion + 1) / MATURITY_QUESTIONS.length) * 100;

        return (
            <div className="tf-view">
                <div className="tf-progress-bar">
                    <div className="tf-progress-inner" style={{ width: `${progress}%` }} />
                </div>

                <div className="tf-container">
                    <div className="tf-question-header">
                        <div className="tf-question-number">
                            <span>{currentQuestion + 1}</span>
                            <ArrowRight size={14} />
                        </div>
                        <h2 className="tf-question-text">
                            {MATURITY_QUESTIONS[currentQuestion]}
                        </h2>
                    </div>

                    <div className="tf-options-list">
                        {(currentQuestion === 1 ? [
                            { label: "Minha conta pessoal e profissional é uma só", value: 1 },
                            { label: "Tudo na mesma conta, mas controlo no papel/excel", value: 2 },
                            { label: "Tudo na mesma conta, mas uso bancos diferentes para organizar", value: 3 },
                            { label: "Contas separadas, mas ainda transfiro entre elas sem muito critério", value: 4 },
                            { label: "Tenho uma conta pessoal e outra da empresa", value: 5 },
                        ] : MATURITY_OPTIONS).map((opt) => (
                            <button
                                key={opt.value}
                                className={`tf-btn ${answers[currentQuestion] === opt.value ? 'selected' : ''}`}
                                onClick={() => handleAnswer(opt.value)}
                            >
                                <span className="tf-option-key">{opt.value}</span>
                                <span className="tf-option-label">{opt.label}</span>
                                {answers[currentQuestion] === opt.value && <CheckCircle2 size={18} style={{ color: 'var(--green)', marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>

                    <div className="tf-actions">
                        <button
                            className="tf-back-btn"
                            disabled={currentQuestion === 0}
                            onClick={() => setCurrentQuestion(prev => prev - 1)}
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <div className="tf-counter">
                            Questão {currentQuestion + 1} de {MATURITY_QUESTIONS.length}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTerms = () => (
        <div className="onboarding-card" style={{ textAlign: 'center', maxWidth: '640px' }}>
            <div style={{ marginBottom: '24px' }}>
                <CheckCircle2 size={72} color="var(--green)" style={{ margin: '0 auto' }} />
            </div>
            <h2 className="onboarding-title">Está quase tudo pronto!</h2>
            <p className="onboarding-subtitle">
                Para sua segurança, leia e aceite nossos termos de uso para começar.
            </p>

            {/* Texto Completo dos Termos com Scroll */}
            <div className="onboarding-terms-scroller">
                <div className="terms-body" style={{ color: 'var(--text-secondary)', textAlign: 'left', padding: '0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Bem-vindo ao <strong>Meu MEI</strong>. Ao utilizar nossa plataforma, você confia a nós a gestão de dados importantes para o seu crescimento. Este documento explica como protegemos seus dados, quais são seus direitos e as regras para o uso da nossa tecnologia de mentoria financeira.
                    </p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>1. Termos de Uso (Regras de Convivência)</h2>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.1. Objeto e Aceite</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        O Meu MEI é uma ferramenta de auxílio à gestão financeira e educação para Microempreendedores Individuais. Ao clicar em "Aceito os Termos", você declara ter lido e concordado com estas regras.
                    </p>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.2. Elegibilidade e Cadastro</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        A plataforma é destinada exclusivamente a MEIs devidamente registrados no território brasileiro. O usuário é responsável pela veracidade dos dados inseridos (CNPJ, faturamento, despesas).
                    </p>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.3. Limitações da Inteligência Artificial</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        O Meu MEI atua como um mentor educativo. Você declara estar ciente de que:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        <li>As recomendações da IA são baseadas em dados inseridos por você e em modelos estatísticos.</li>
                        <li>O agente não substitui o aconselhamento profissional de um contador ou advogado.</li>
                        <li>O sistema não realiza transações bancárias nem investimentos em seu nome.</li>
                    </ul>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.4. Uso Proibido</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        É terminantemente proibido utilizar a plataforma para registrar atividades ilícitas, sonegação fiscal ou práticas que configurem lavagem de dinheiro ou fraude.
                    </p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>2. Política de Privacidade (LGPD)</h2>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.1. Quais dados coletamos?</h3>
                    <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        <li><strong>Dados Cadastrais:</strong> Nome, e-mail, CPF e CNPJ.</li>
                        <li><strong>Dados Financeiros:</strong> Registros de entradas, saídas, boletos e fluxo de caixa.</li>
                        <li><strong>Dados Multimodais:</strong> Textos, áudios enviados para registro de voz, arquivos e imagens/PDFs de recibos.</li>
                        <li><strong>Dados de Diagnóstico:</strong> Respostas ao instrumento IAMF-MEI.</li>
                    </ul>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.2. Para que usamos seus dados?</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        As finalidades incluem a personalização da linguagem conforme sua maturidade financeira, processamento automatizado de recibos e análise de progresso rumo ao seu "Caminho para o Sonho".
                    </p>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.3. Compartilhamento de Dados</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Seus dados financeiros não são vendidos. Compartilhamos apenas com parceiros essenciais (Google Cloud/Vertex AI) ou com o ecossistema Bradesco mediante sua autorização prévia.
                    </p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>3. Segurança da Informação</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Adotamos criptografia rigorosa em trânsito e em repouso, isolamento de domínio e monitoramento constante de logs para garantir a integridade do sistema.
                    </p>

                    <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>4. Atualizações</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Este documento pode ser atualizado para refletir melhorias técnicas. Notificaremos você sobre alterações importantes.
                    </p>
                </div>
            </div>

            <div
                className={invalidField === 'terms' ? 'input-error-blink' : ''}
                style={{ margin: '24px 0', textAlign: 'left', borderRadius: '12px', transition: 'all 0.3s ease' }}
            >
                <div
                    className="custom-checkbox-container"
                    onClick={() => {
                        setAcceptedTerms(!acceptedTerms);
                        if (invalidField === 'terms') setInvalidField("");
                    }}
                    style={{ padding: '4px' }}
                >
                    <div className={`custom-checkbox-circle ${acceptedTerms ? 'checked' : ''}`}>
                        <div className="custom-checkbox-dot" />
                    </div>
                    <span style={{ lineHeight: '1.4', fontSize: '14px', color: 'var(--text-primary)' }}>
                        Li e compreendo que o <strong>Meu MEI</strong> processará meus áudios e imagens para fins de gestão financeira. Autorizo o tratamento dos meus dados conforme a LGPD.
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    className={`onboarding-btn ${!acceptedTerms ? 'is-inactive' : ''}`}
                    style={{ flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={handleFinalSubmit}
                    disabled={loading}
                >
                    {loading ? "Finalizando..." : "Aceitar e Começar"}
                    {!loading && <ArrowRight size={20} />}
                </button>
                <button
                    className="onboarding-btn"
                    style={{ flex: 1, background: 'var(--bg-app)', color: 'var(--text-muted) !important', border: '1px solid var(--border-color)' }}
                    onClick={() => router.push("/")}
                >
                    Sair
                </button>
            </div>
        </div>
    );

    return (
        <main className="onboarding-screen">
            <div className="onboarding-content">
                {step === 1 && (
                    <div className="onboarding-logo-hero-container">
                        <img src="/logo2.svg" alt="Meu MEI" className="onboarding-logo-hero" />
                    </div>
                )}

                {step === 1 && renderPhone()}
                {step === 2 && renderProfile()}
                {step === 3 && renderMaturity()}
                {step === 4 && renderTerms()}
            </div>
        </main>
    );
}
