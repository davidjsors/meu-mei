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
    Lock,
    BarChart3,
    Eye,
    EyeOff,
    AlertCircle,
    DollarSign,
    Plus,
    Trash2
} from "lucide-react";
import { setPin, loginPin, getProfile } from "../../lib/api";
import { cleanDream } from "../../lib/utils";
import Modal from "../../components/Modal";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const MATURITY_DATA = [
    {
        question: "Você costuma registrar todas as entradas e saídas do seu negócio? Tipo, anota tudo certinho o que vende e o que gasta?",
        options: [
            { label: "Não anoto nada", value: 1 },
            { label: "Anoto só de vez em quando", value: 2 },
            { label: "Anoto quase tudo, mas esqueço alguns", value: 3 },
            { label: "Anoto tudo, mas não organizo muito", value: 4 },
            { label: "Registro cada centavo (Entradas e Saídas)", value: 5 }
        ]
    },
    {
        question: "E sobre as contas: você usa conta separada pra vida pessoal e pro negócio, ou tá tudo junto ainda?",
        options: [
            { label: "Tudo misturado na minha conta pessoal", value: 1 },
            { label: "Tento separar, mas acabo misturando", value: 2 },
            { label: "Tenho contas separadas, mas uso o dinheiro cruzado", value: 3 },
            { label: "Separo bem, só misturo em emergências", value: 4 },
            { label: "Totalmente separadas (PJ e PF)", value: 5 }
        ]
    },
    {
        question: "Quando chega a hora de pagar os boletos, você já sabe de antemão se vai ter dinheiro? Você acompanha isso?",
        options: [
            { label: "Nunca sei, vivo no susto", value: 1 },
            { label: "Raramente sei antes", value: 2 },
            { label: "Às vezes tenho noção", value: 3 },
            { label: "Geralmente sei com antecedência", value: 4 },
            { label: "Sempre sei (Controle total)", value: 5 }
        ]
    },
    {
        question: "Você costuma buscar aprender sobre gestão financeira? Cursos, vídeos, dicas...",
        options: [
            { label: "Nunca busco", value: 1 },
            { label: "Raramente", value: 2 },
            { label: "Às vezes vejo uns vídeos", value: 3 },
            { label: "Frequentemente procuro dicas", value: 4 },
            { label: "Sempre (Estudo constante)", value: 5 }
        ]
    },
    {
        question: "Na hora de colocar preço no que você vende, você sabe direitinho quanto gasta pra produzir e quanto sobra de lucro?",
        options: [
            { label: "Chuto o preço ou copio o vizinho", value: 1 },
            { label: "Tenho uma ideia por cima", value: 2 },
            { label: "Calculo os custos principais, mas não o lucro", value: 3 },
            { label: "Calculo bem, mas às vezes erro a mão", value: 4 },
            { label: "Calculo tudo (Custos + Margem + Lucro)", value: 5 }
        ]
    }
];

export default function OnboardingPage() {
    const router = useRouter();

    // 0: Phone, 
    // 1: Login PIN (if existing user)
    // 2: Profile + Create PIN (if new user)
    // 3: Maturity Intro
    // 4: Maturity Questions
    // 4: Maturity Questions
    // 5: Revenue Goal
    // 6: Initial Finance (New)
    // 7: Terms
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [phone, setPhone] = useState("");
    const [pin, setPinValue] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [existingName, setExistingName] = useState(""); // For greeting returning users

    const [name, setName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [revenueGoal, setRevenueGoal] = useState("");
    const [dream, setDream] = useState("");
    const [answers, setAnswers] = useState(new Array(5).fill(null));
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [invalidField, setInvalidField] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [showForgotInfo, setShowForgotInfo] = useState(false);

    // Initial Finance State (Step 6)
    const [initialBalance, setInitialBalance] = useState("");
    const [initialExpenses, setInitialExpenses] = useState([]); // [{id, amount, description, category}]
    const [expenseCategoryOpen, setExpenseCategoryOpen] = useState(null); // id of open dropdown

    // Modal State
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
        confirmText: "OK",
        cancelText: "Fechar"
    });

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        // Clearing session on onboarding load to avoid loops
        // localStorage.removeItem("meumei_phone");
    }, []);

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    // --- STEP 0: PHONE ---
    const handlePhoneSubmit = async () => {
        setInvalidField("");
        setError("");

        if (phone.replace(/\D/g, "").length !== 11) {
            setError("Por favor, informe seu celular completo com DDD.");
            setInvalidField("phone");
            return;
        }
        setLoading(true);

        try {
            // Check if user exists
            const profile = await getProfile(phone);
            if (profile && profile.has_pin) {
                // User exists AND has PIN -> Go to Login Mode
                setExistingName(profile.name ? profile.name.split(" ")[0] : "");
                setStep(1); // Login PIN
            } else {
                // User does not exist OR has no PIN -> Go to Create PIN
                setStep(2); // Profile + Create PIN
            }
        } catch (err) {
            // If error fetching profile (e.g. 404), assume new user
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 1: Login PIN ---
    const handleLoginPin = async () => {
        setInvalidField("");
        setError("");

        if (!pin || pin.length !== 6) {
            setError("Por favor, informe seu PIN completo para acessar.");
            setInvalidField("pin");
            return;
        }

        setLoading(true);
        try {
            const resp = await loginPin(phone, pin);
            if (resp.success) {
                localStorage.setItem("meumei_phone", phone);
                localStorage.setItem("meumei_login_at", String(Date.now()));
                router.push("/chat");
            }
        } catch (err) {
            setError(err.message || "PIN incorreto");
            setInvalidField("pin");
            setPinValue("");
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2: Profile + Create PIN ---
    const handleProfileNext = async () => {
        setInvalidField("");
        setError("");

        // Profile Validations
        if (!name.trim()) { setError("Opa! Como podemos te chamar? Informe seu nome."); setInvalidField("name"); return; }
        if (!businessType.trim()) { setError("Qual a sua profissão? (ex: Eletricista)"); setInvalidField("businessType"); return; }
        if (!dream.trim()) { setError("Conte para a gente qual o seu maior sonho!"); setInvalidField("dream"); return; }

        // PIN Validations
        if (pin.length !== 6) { setError("Crie um PIN de exatamente 6 números."); setInvalidField("pin"); return; }
        if (pin !== confirmPin) { setError("Os PINs informados não são iguais."); setInvalidField("confirmPin"); return; }

        // We clean the dream here, but we DON'T save to DB yet.
        const cleanedDream = cleanDream(dream);
        setDream(cleanedDream);

        // Success -> Move to Maturity Intro
        setStep(3);
    };

    // --- RENDERERS ---

    const renderPhoneInput = () => {
        const isValid = phone.replace(/\D/g, "").length === 11;
        return (
            <div className="onboarding-card">
                <p className="onboarding-subtitle">
                    Digite seu telefone para começar sua jornada rumo à independência financeira.
                </p>

                <div className="onboarding-form-group">
                    <label className="onboarding-label">Seu telefone</label>
                    <input
                        type="tel"
                        inputMode="numeric"
                        className={`onboarding-input ${invalidField === 'phone' ? 'input-error-blink' : ''}`}
                        style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold' }}
                        placeholder="11-98765-4321"
                        value={phone}
                        onChange={(e) => {
                            setPhone(formatPhone(e.target.value));
                            if (invalidField === 'phone') setInvalidField("");
                            setError("");
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                        maxLength={13}
                        autoFocus
                    />
                </div>

                {error && <p className="onboarding-error" style={{ animation: 'shake 0.4s ease-in-out' }}>{error}</p>}

                <button
                    className={`onboarding-btn ${phone.replace(/\D/g, "").length !== 11 ? 'is-inactive' : ''}`}
                    onClick={handlePhoneSubmit}
                    disabled={loading}
                >
                    {loading ? "Validando..." : "Continuar →"}
                </button>

                <p className="onboarding-footer-note">
                    Sua conta é vinculada ao seu número. <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
                </p>
            </div>
        );
    };

    const renderLoginPin = () => (
        <div className="onboarding-card">
            <h2 className="onboarding-title">Que bom que você está de volta, {existingName || "Empreendedor"}!</h2>
            <p className="onboarding-subtitle">
                Digite seu PIN para acessar.
            </p>

            <div className="onboarding-form-group">
                <input
                    type="password"
                    inputMode="numeric"
                    className={`onboarding-input ${invalidField === 'pin' ? 'input-error-blink' : ''}`}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                    placeholder="PIN"
                    value={pin}
                    onChange={(e) => {
                        setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                        if (invalidField === 'pin') setInvalidField("");
                        setError("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginPin()}
                    autoFocus
                />
            </div>

            {error && <p className="onboarding-error">{error}</p>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="tf-back-btn" onClick={() => setStep(0)} style={{ padding: '12px 24px' }}>
                    Voltar
                </button>
                <button
                    className={`onboarding-btn ${pin.length !== 6 ? 'is-inactive' : ''}`}
                    onClick={handleLoginPin}
                    disabled={loading}
                    style={{ flex: 1, margin: 0 }}
                >
                    {loading ? "Entrando..." : "Acessar →"}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: '20px' }}>
                <button
                    className="link-btn"
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={() => setShowForgotInfo(!showForgotInfo)}
                >
                    Esqueci meu PIN
                </button>
                {showForgotInfo && (
                    <div className="forgot-info-box">
                        Para recuperar, envie e-mail para:<br />
                        <strong>david.sors@gmail.com</strong>
                    </div>
                )}
            </div>
        </div>
    );

    const isValidProfile = name.trim() && businessType.trim() && dream.trim() && pin.length === 6 && pin === confirmPin;

    const renderProfile = () => (
        <div className="onboarding-card" style={{ maxWidth: '580px' }}>
            <h2 className="onboarding-title">Bem-vindo(a) ao Meu MEI!</h2>
            <p className="onboarding-subtitle">Conte um pouco sobre você e o seu negócio, e defina sua senha de acesso.</p>

            <div className="onboarding-form-group">
                <div className="onboarding-profile-grid">
                    <div>
                        <label className="onboarding-label">Nome</label>
                        <input className={`onboarding-input ${invalidField === 'name' ? 'input-error-blink' : ''}`} placeholder="Seu nome" value={name} onChange={e => { setName(e.target.value); if (invalidField === 'name') setInvalidField(""); }} />
                    </div>
                    <div>
                        <label className="onboarding-label">Profissão</label>
                        <input className={`onboarding-input ${invalidField === 'businessType' ? 'input-error-blink' : ''}`} placeholder="Ex: Eletricista..." value={businessType} onChange={e => { setBusinessType(e.target.value); if (invalidField === 'businessType') setInvalidField(""); }} />
                    </div>
                </div>
            </div>
            <div className="onboarding-form-group">
                <label className="onboarding-label">Qual o seu maior sonho relacionado ao seu negócio?</label>
                <textarea className={`onboarding-input ${invalidField === 'dream' ? 'input-error-blink' : ''}`} style={{ minHeight: '80px', resize: 'none' }} placeholder="Ex: Abrir minha loja física ou vender 10 mil por mês" value={dream} onChange={e => { setDream(e.target.value); if (invalidField === 'dream') setInvalidField(""); }} />
            </div>

            <div className="onboarding-form-group" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <label className="onboarding-label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>Crie seu PIN de acesso</label>

                <div className="onboarding-info-box" style={{ padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'start' }}>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                        <span style={{ color: 'var(--red-primary)', fontWeight: '600' }}>Atenção:</span> Guarde bem este número! Ele será sua senha para entrar no Meu MEI sempre que precisar.
                    </p>
                </div>

                <div className="onboarding-pin-grid">
                    <div style={{ position: 'relative' }}>
                        <input
                            className={`onboarding-input ${invalidField === 'pin' ? 'input-error-blink' : ''}`}
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="PIN (6 números)"
                            value={pin}
                            onChange={e => { setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6)); if (invalidField === 'pin') setInvalidField(""); }}
                            style={{ paddingRight: '40px' }}
                        />
                        <button
                            onClick={() => setShowPin(!showPin)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            className={`onboarding-input ${invalidField === 'confirmPin' ? 'input-error-blink' : ''}`}
                            type={showConfirmPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="Confirme o PIN"
                            value={confirmPin}
                            onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); if (invalidField === 'confirmPin') setInvalidField(""); }}
                            style={{ paddingRight: '40px' }}
                        />
                        <button
                            onClick={() => setShowConfirmPin(!showConfirmPin)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {pin && confirmPin && pin !== confirmPin && (
                    <p style={{ color: 'var(--red-primary)', fontSize: '12px', marginTop: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Os códigos informados não coincidem
                    </p>
                )}
            </div>

            {error && <p className="onboarding-error" style={{ animation: 'shake 0.4s ease-in-out' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                    className="tf-back-btn"
                    onClick={() => {
                        setStep(0);
                    }}
                    style={{ padding: '12px 24px' }}
                >
                    Voltar
                </button>
                <button
                    onClick={handleProfileNext}
                    className={`onboarding-btn ${!isValidProfile ? 'is-inactive' : ''}`}
                    disabled={loading}
                    style={{ flex: 1, margin: 0 }}
                >
                    {loading ? "Salvando..." : "Tudo pronto! Vamos continuar →"}
                </button>
            </div>
        </div >
    );

    // Reuse existing components logic for Maturity, Terms
    const handleAnswer = (value) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = value;
        setAnswers(newAnswers);
        // Pequeno delay para o estado visual da seleção ser limpo antes de avançar
        setTimeout(() => {
            if (currentQuestion < MATURITY_DATA.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
            } else {
                setStep(5);
            }
        }, 200);
    };

    const handleRevenueGoalNext = () => {
        setInvalidField("");
        setError("");

        if (!revenueGoal.trim() || revenueGoal === "0,00") {
            setError("Informe sua meta de vendas mensal.");
            setInvalidField("revenueGoal");
            return;
        }

        setStep(6);
    };

    const EXPENSE_CATEGORIES = [
        { value: "insumos", label: "Insumos (Matéria-prima)" },
        { value: "aluguel", label: "Aluguel" },
        { value: "transporte", label: "Transporte" },
        { value: "marketing", label: "Marketing" },
        { value: "salarios", label: "Salários / Pro-labore" },
        { value: "impostos", label: "Impostos (DAS)" },
        { value: "utilidades", label: "Luz, Água, Internet" },
        { value: "outros_despesa", label: "Outros" },
    ];

    const handleAddExpense = () => {
        setInitialExpenses([...initialExpenses, { id: Date.now(), amount: "", description: "", category: "outros_despesa" }]);
    };

    const updateExpense = (id, field, value) => {
        setInitialExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const removeExpense = (id) => {
        setInitialExpenses(prev => prev.filter(e => e.id !== id));
    };

    const handleInitialFinanceNext = () => {
        setInvalidField("");
        setError("");

        if (!initialBalance.trim() || initialBalance === "0,00") {
            setError("Informe seu saldo atual para podermos começar seu controle.");
            setInvalidField("initialBalance");
            return;
        }

        // We just move to terms, saving happens at the end.
        setStep(7);
    };


    const handleFinalSubmit = async () => {
        if (!acceptedTerms) {
            setError("Opa! Você precisa aceitar os termos para começarmos.");
            setInvalidField("terms");
            return;
        }
        setLoading(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const goalValue = parseFloat(revenueGoal.replace(/\./g, '').replace(',', '.')) || 0;
            const balanceValue = initialBalance ? parseFloat(initialBalance.replace(/\./g, '').replace(',', '.')) : 0;

            console.log("Onboarding: Finalizando e salvando tudo...", { name, phone });

            // 1. CRIAR USUÁRIO E PIN (Agora sim salvamos no banco)
            await setPin(phone, pin);

            // 2. Salvar Perfil e Maturidade
            await fetch(`${API_BASE}/api/user/maturity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone_number: phone,
                    name,
                    business_type: businessType,
                    dream,
                    revenue_goal: goalValue,
                    initial_balance: balanceValue,
                    answers
                }),
            });

            // 3. Salvar Saldo Inicial como Record - REMOVIDO (Já é feito no backend ao salvar maturidade)
            /*
            if (balanceValue > 0) {
                await fetch(`${API_BASE}/api/user/finance/record`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone_number: phone,
                        type: "entrada",
                        amount: balanceValue,
                        category: "outros_receita",
                        description: "Saldo Inicial (Onboarding)"
                    })
                });
            }
            */

            // 4. Salvar Despesas Iniciais como Records
            for (const expense of initialExpenses) {
                const val = parseFloat(expense.amount.replace(/\./g, '').replace(',', '.'));
                if (val > 0) {
                    await fetch(`${API_BASE}/api/user/finance/record`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            phone_number: phone,
                            type: "saida",
                            amount: val,
                            category: expense.category,
                            description: expense.description || "Despesa Inicial"
                        })
                    });
                }
            }

            // 5. Aceitar Termos
            await fetch(`${API_BASE}/api/user/accept-terms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phone }),
            });

            localStorage.setItem("meumei_phone", phone);
            localStorage.setItem("meumei_login_at", String(Date.now()));

            console.log("Onboarding: Finalizado com sucesso.");
            setTimeout(() => {
                router.push("/chat");
            }, 1000);
        } catch (e) {
            setError("Erro ao finalizar cadastro. Tente novamente.");
            setLoading(false);
        }
    };

    const renderMaturityIntro = () => (
        <div className="onboarding-card" style={{ textAlign: 'center', maxWidth: '640px' }}>
            <h2 className="onboarding-title">Quase lá! Vamos falar da gestão do seu negócio?</h2>
            <p className="onboarding-subtitle" style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
                Agora que conhecemos seu sonho, precisamos entender como você gerencia as finanças da sua empresa. <br /><br />
                O objetivo é termos um <strong>diagnóstico inicial</strong> para que possamos te ajudar a conquistar o seu sonho com segurança!
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className="tf-back-btn" onClick={() => setStep(2)} style={{ padding: '12px 24px' }}>
                    Voltar
                </button>
                <button className="onboarding-btn" onClick={() => setStep(4)} style={{ flex: 1, margin: 0 }}>
                    Começar
                </button>
            </div>
        </div>
    );

    const renderMaturity = () => {
        const question = MATURITY_DATA[currentQuestion];
        const totalQuestions = MATURITY_DATA.length;

        return (
            <div className="onboarding-card" style={{ maxWidth: '480px' }}>
                {/* Dots Progress Indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
                    {MATURITY_DATA.map((_, idx) => (
                        <div
                            key={idx}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: idx <= currentQuestion ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease',
                                boxShadow: idx === currentQuestion ? '0 0 10px var(--green-glow)' : 'none'
                            }}
                        />
                    ))}
                </div>

                <div className="onboarding-form-group">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="step-icon-dot" style={{ width: '32px', height: '32px', fontSize: '14px', borderColor: 'var(--red-primary)', color: 'var(--red-primary)' }}>
                            {currentQuestion + 1}
                        </div>
                        <h2 className="onboarding-title" style={{ fontSize: '18px', margin: 0, textAlign: 'left' }}>
                            {question.question}
                        </h2>
                    </div>

                    <div key={currentQuestion} className="tf-options-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {question.options.map((opt) => (
                            <button
                                key={opt.value}
                                className={`tf-btn ${answers[currentQuestion] === opt.value ? 'selected' : ''}`}
                                onClick={() => handleAnswer(opt.value)}
                                style={{ textAlign: 'left', padding: '14px', borderRadius: '12px', fontSize: '14px' }}
                            >
                                <span className="tf-option-key" style={{ marginRight: '10px', opacity: 0.6 }}>{opt.value}</span>
                                <span className="tf-option-label">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                    <button
                        className="tf-back-btn"
                        onClick={() => {
                            if (currentQuestion > 0) {
                                setCurrentQuestion(prev => prev - 1);
                            } else {
                                setStep(3);
                            }
                        }}
                    >
                        Voltar
                    </button>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Questão {currentQuestion + 1} de {MATURITY_DATA.length}
                    </div>
                </div>
            </div>
        );
    };

    const renderRevenueGoal = () => {
        const isComplete = revenueGoal.trim() && revenueGoal !== "0,00";

        return (
            <div className="onboarding-card" style={{ maxWidth: '540px' }}>
                <h2 className="onboarding-title">Sua Meta Mensal</h2>
                <p className="onboarding-subtitle">Para te ajudar a focar no que importa, qual o valor de faturamento (vendas) você deseja atingir todo mês?</p>

                <div className="onboarding-form-group">
                    <label className="onboarding-label">1. Meta mensal de vendas</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600' }} className="onboarding-label">R$</span>
                        <input
                            autoFocus
                            inputMode="numeric"
                            className={`onboarding-input ${invalidField === 'revenueGoal' ? 'input-error-blink' : ''}`}
                            style={{ paddingLeft: '48px', fontSize: '24px' }}
                            placeholder="0,00"
                            value={revenueGoal}
                            onChange={e => {
                                let v = e.target.value.replace(/\D/g, "");
                                if (!v) { setRevenueGoal(""); return; }
                                const floatValue = parseInt(v) / 100;
                                setRevenueGoal(floatValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                if (invalidField === 'revenueGoal') setInvalidField("");
                                setError("");
                            }}
                            onFocus={e => e.target.select()}
                        />
                    </div>
                </div>

                {error && <p className="onboarding-error" style={{ animation: 'shake 0.4s ease-in-out' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button className="tf-back-btn" onClick={() => setStep(4)} style={{ padding: '12px 24px' }}>Voltar</button>
                    <button
                        className={`onboarding-btn ${!isComplete ? 'is-inactive' : ''}`}
                        onClick={handleRevenueGoalNext}
                        disabled={loading}
                        style={{ flex: 1, margin: 0 }}
                    >
                        Continuar →
                    </button>
                </div>
            </div>
        );
    };

    const renderInitialFinance = () => (
        <div className="onboarding-card" style={{ maxWidth: '600px' }}>
            <h2 className="onboarding-title">Seu Ponto de Partida</h2>
            <p className="onboarding-subtitle">
                Para começar com o pé direito, quanto você tem hoje em caixa para o seu negócio?
                <br /><small style={{ opacity: 0.7 }}>(Este valor será seu saldo inicial no Meu MEI)</small>
            </p>

            {/* Saldo Inicial */}
            <div className="onboarding-form-group" style={{ marginBottom: '24px' }}>
                <label className="onboarding-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Caixa Atual (Dinheiro em mãos + Banco)
                </label>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-muted)' }}>R$</span>
                    <input
                        inputMode="numeric"
                        className={`onboarding-input ${invalidField === 'initialBalance' ? 'input-error-blink' : ''}`}
                        style={{ paddingLeft: '48px', fontSize: '20px' }}
                        placeholder="0,00"
                        value={initialBalance}
                        onChange={e => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (!v) { setInitialBalance(""); return; }
                            const floatValue = parseInt(v) / 100;
                            setInitialBalance(floatValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            if (invalidField === 'initialBalance') setInvalidField("");
                            setError("");
                        }}
                        onFocus={e => e.target.select()}
                    />
                </div>
            </div>

            {error && <p className="onboarding-error">{error}</p>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    className="tf-back-btn"
                    style={{ padding: '12px 24px' }}
                    onClick={() => setStep(5)}
                >
                    Voltar
                </button>
                <button
                    className={`onboarding-btn ${(!initialBalance.trim() || initialBalance === "0,00") ? 'is-inactive' : ''}`}
                    style={{ flex: 1, margin: 0 }}
                    onClick={handleInitialFinanceNext}
                    disabled={loading}
                >
                    {loading ? "Salvando..." : "Salvar e Continuar →"}
                </button>
            </div>
        </div>
    );

    const renderTerms = () => (
        <div className="onboarding-card" style={{ textAlign: 'center', maxWidth: '640px' }}>
            <h2 className="onboarding-title">Está quase tudo pronto!</h2>
            <p className="onboarding-subtitle">Para sua segurança, leia e aceite nossos termos de uso para começar.</p>
            <div className="onboarding-terms-scroller">
                <div className="terms-body" style={{ color: '#FFFFFF', textAlign: 'left', padding: '0' }}>
                    <p style={{ color: '#FFFFFF' }}>
                        Bem-vindo ao <strong>Meu MEI</strong>. Ao utilizar nossa plataforma, você confia a nós a gestão de dados importantes para o seu crescimento. Este documento explica como protegemos seus dados, quais são seus direitos e as regras para o uso da nossa tecnologia de mentoria financeira.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>1. Termos de Uso (Regras de Convivência)</h2>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.1. Objeto e Aceite</h3>
                    <p style={{ color: '#FFFFFF' }}>
                        O Meu MEI é uma ferramenta de auxílio à gestão financeira e educação para Microempreendedores Individuais. Ao clicar em "Aceito os Termos", você declara ter lido e concordado com estas regras.
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.2. Elegibilidade e Cadastro</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        A plataforma é destinada exclusivamente a MEIs devidamente registrados no território brasileiro. O usuário é responsável pela veracidade dos dados inseridos (CNPJ, faturamento, despesas).
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.3. Limitações da Inteligência Artificial</h3>
                    <p style={{ color: '#FFFFFF' }}>
                        O Meu MEI atua como um mentor educativo. Você declara estar ciente de que:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#FFFFFF' }}>
                        <li style={{ color: '#FFFFFF' }}>As recomendações da IA são baseadas em dados inseridos por você e em modelos estatísticos.</li>
                        <li style={{ color: '#FFFFFF' }}>O agente não substitui o aconselhamento profissional de um contador ou advogado.</li>
                        <li style={{ color: '#FFFFFF' }}>O sistema não realiza transações bancárias nem investimentos em seu nome.</li>
                    </ul>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>1.4. Uso Proibido</h3>
                    <p style={{ color: '#FFFFFF' }}>
                        É terminantemente proibido utilizar a plataforma para registrar atividades ilícitas, sonegação fiscal ou práticas que configurem lavagem de dinheiro ou fraude.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>2. Política de Privacidade (LGPD)</h2>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.1. Quais dados coletamos?</h3>
                    <ul style={{ paddingLeft: '20px', color: '#FFFFFF' }}>
                        <li style={{ color: '#FFFFFF' }}><strong>Dados Cadastrais:</strong> Nome, e-mail, CPF e CNPJ.</li>
                        <li style={{ color: '#FFFFFF' }}><strong>Dados Financeiros:</strong> Registros de entradas, saídas, boletos e fluxo de caixa.</li>
                        <li style={{ color: '#FFFFFF' }}><strong>Dados Multimodais:</strong> Textos, áudios enviados para registro de voz, arquivos e imagens/PDFs de recibos.</li>
                        <li style={{ color: '#FFFFFF' }}><strong>Dados de Diagnóstico:</strong> Respostas ao instrumento IAMF-MEI.</li>
                    </ul>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.2. Para que usamos seus dados?</h3>
                    <p style={{ color: '#FFFFFF' }}>
                        As finalidades incluem a personalização da linguagem conforme sua maturidade financeira, processamento automatizado de recibos e análise de progresso rumo ao seu "Caminho para o Sonho".
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px' }}>2.3. Compartilhamento de Dados</h3>
                    <p style={{ color: '#FFFFFF' }}>
                        Seus dados financeiros não são vendidos. Compartilhamos apenas com parceiros essenciais (Google Cloud/Vertex AI) ou com o ecossistema Bradesco mediante sua autorização prévia.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>3. Segurança da Informação</h2>
                    <p style={{ color: '#FFFFFF' }}>
                        Adotamos criptografia rigorosa em trânsito e em repouso, isolamento de domínio e monitoramento constante de logs para garantir a integridade do sistema.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px' }}>4. Atualizações</h2>
                    <p style={{ color: '#FFFFFF' }}>
                        Este documento pode ser atualizado para refletir melhorias técnicas. Notificaremos você sobre alterações importantes.
                    </p>
                </div>
            </div>
            <div className={invalidField === 'terms' ? 'input-error-blink' : ''} style={{ margin: '24px 0', textAlign: 'left', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                <div className="custom-checkbox-container" onClick={() => { setAcceptedTerms(!acceptedTerms); if (invalidField === 'terms') setInvalidField(""); }} style={{ padding: '4px' }}>
                    <div className={`custom-checkbox-circle ${acceptedTerms ? 'checked' : ''}`}><div className="custom-checkbox-dot" /></div>
                    <span style={{ lineHeight: '1.4', fontSize: '14px', color: '#FFFFFF' }}>Li e compreendo que o <strong>Meu MEI</strong> processará meus áudios e imagens para fins de gestão financeira. Autorizo o tratamento dos meus dados conforme a LGPD.</span>
                </div>
            </div>
            {error && <p className="onboarding-error" style={{ animation: 'shake 0.4s ease-in-out' }}>{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '12px', marginTop: '16px' }}>
                <button
                    className={`onboarding-btn ${!acceptedTerms ? 'is-inactive' : ''}`}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={handleFinalSubmit}
                    disabled={loading}
                >
                    {loading ? "Finalizando..." : "Aceitar e Começar"} {!loading && <ArrowRight size={20} />}
                </button>
                <button
                    className="onboarding-btn"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'rgba(255, 255, 255, 0.6)', boxShadow: 'none' }}
                    onClick={() => router.push("/")}
                >
                    Sair
                </button>
            </div>
        </div>
    );

    // --- STEP: Sidebar Stepper ---
    const SidebarStepper = () => {
        const onboardingSteps = [
            { id: 'auth', label: 'Identificação', desc: 'Seu Celular', steps: [0, 1] },
            { id: 'profile', label: 'Seu Perfil', desc: 'Dados e PIN', steps: [2] },
            { id: 'maturity', label: 'Maturidade MEI', desc: 'Diagnóstico', steps: [3, 4] },
            { id: 'goal', label: 'Sua Meta', desc: 'Onde quer chegar', steps: [5] },
            { id: 'finance', label: 'Caixa Inicial', desc: 'Quanto você tem', steps: [6] },
            { id: 'final', label: 'Finalização', desc: 'Termos e decolagem', steps: [7] },
        ];

        return (
            <div className="onboarding-sidebar">
                <div className="onboarding-sidebar-inner">
                    <img src="/logo2.svg" alt="Meu MEI" className="onboarding-sidebar-logo-aside" />
                    <div className="onboarding-steps">
                        {onboardingSteps.map((s, idx) => {
                            const isActive = s.steps.includes(step);
                            const isCompleted = step > Math.max(...s.steps);

                            return (
                                <div
                                    key={s.id}
                                    className={`onboarding-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    onClick={() => (isCompleted || isActive) && setStep(s.steps[0])}
                                    style={{ cursor: (isCompleted || isActive) ? 'pointer' : 'default' }}
                                >
                                    <div className="step-icon-dot">
                                        {isCompleted ? <CheckCircle2 size={24} /> : idx + 1}
                                    </div>
                                    <div className="step-info">
                                        <span className="step-label">{s.label}</span>
                                        <span className="step-desc">{s.desc}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // --- STEP: Mobile Stepper ---
    const MobileStepper = () => {
        const onboardingSteps = [
            { id: 'auth', steps: [0, 1] },
            { id: 'profile', steps: [2] },
            { id: 'maturity', steps: [3, 4] },
            { id: 'goal', steps: [5] },
            { id: 'finance', steps: [6] },
            { id: 'final', steps: [7] },
        ];

        return (
            <div className="mobile-stepper">
                {onboardingSteps.map((s, idx) => {
                    const isActive = s.steps.includes(step);
                    const isCompleted = step > Math.max(...s.steps);

                    return (
                        <div key={s.id} className={`mobile-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            {idx > 0 && (
                                <div className={`mobile-step-line ${isCompleted || isActive ? 'filled' : ''}`} />
                            )}
                            <div className="mobile-step-circle">
                                {isCompleted && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span className="mobile-step-label">{idx + 1}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <main className="onboarding-screen">
            <div className="onboarding-split-container">
                {/* 
                    Condicional: Se for passo 0 ou 1, mostra a apresentação original.
                    Se for passo > 1 (cadastro), mostra o Stepper.
                */}
                {(step === 0 || step === 1) ? (
                    <div className="onboarding-presentation">
                        <div className="presentation-content">
                            <img src="/logo2.svg" alt="Meu MEI" className="presentation-logo" />
                            <h1 className="presentation-title">
                                Seu negócio voando com o <span>Meu MEI</span>
                            </h1>
                            <p className="presentation-text">
                                Desenhado exclusivamente para transformar a realidade do(a) microempreendedor(a).
                                Gestão simples, mentoria proativa e o controle total das suas finanças.
                            </p>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '40px', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--green)' }}>100%</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Focado em MEIs</span>
                                </div>
                                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--red-primary)' }}>24/7</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mentoria Ativa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <SidebarStepper />
                )}

                <div className="onboarding-main">
                    {/* Stepper Simplificado apenas para Mobile */}
                    {step > 1 && <MobileStepper />}

                    <div className="onboarding-content">
                        {step === 0 && renderPhoneInput()}
                        {step === 1 && renderLoginPin()}
                        {step === 2 && renderProfile()}
                        {step === 3 && renderMaturityIntro()}
                        {step === 4 && renderMaturity()}
                        {step === 5 && renderRevenueGoal()}
                        {step === 6 && renderInitialFinance()}
                        {step === 7 && renderTerms()}
                    </div>
                </div>
            </div>

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
        </main>
    );
}
