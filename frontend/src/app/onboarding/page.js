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
        if (phone.replace(/\D/g, "").length !== 11) {
            return; // inactive button handles UI
        }
        setLoading(true);
        setError("");

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

        if (!pin || pin.length < 4) {
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
        if (pin.length < 4) { setError("Crie um PIN de pelo menos 4 números."); setInvalidField("pin"); return; }
        if (pin !== confirmPin) { setError("Os PINs informados não são iguais."); setInvalidField("confirmPin"); return; }

        setLoading(true);
        try {
            // Limpa o sonho antes de salvar para evitar redundâncias na UI (ex: remover "meu sonho é")
            const cleanedDream = cleanDream(dream);
            setDream(cleanedDream);

            // Create User & PIN (Upsert)
            await setPin(phone, pin);
            // Success -> Move to Maturity Intro
            setStep(3);
        } catch (err) {
            setError(err.message || "Erro ao salvar PIN. Tente novamente.");
        } finally {
            setLoading(false);
        }
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
                        className="onboarding-input"
                        style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold' }}
                        placeholder="11-98765-4321"
                        value={phone}
                        onChange={(e) => {
                            setPhone(formatPhone(e.target.value));
                            setError("");
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && isValid && handlePhoneSubmit()}
                        maxLength={13}
                        autoFocus
                    />
                </div>

                {error && <p className="onboarding-error">{error}</p>}

                <button
                    className={`onboarding-btn ${!isValid ? 'is-inactive' : ''}`}
                    onClick={handlePhoneSubmit}
                    disabled={!isValid || loading}
                >
                    {loading ? "Verificando..." : "Continuar →"}
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
                    className={`onboarding-btn ${pin.length < 4 ? 'is-inactive' : ''}`}
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

    const isValidProfile = name.trim() && businessType.trim() && dream.trim() && pin.length >= 4 && pin === confirmPin;

    const renderProfile = () => (
        <div className="onboarding-card" style={{ maxWidth: '580px' }}>
            <h2 className="onboarding-title">Bem-vindo(a) ao Meu MEI!</h2>
            <p className="onboarding-subtitle">Conte um pouco sobre você e o seu negócio, e defina sua senha de acesso.</p>

            <div className="onboarding-form-group">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <textarea className={`onboarding-input ${invalidField === 'dream' ? 'input-error-blink' : ''}`} style={{ minHeight: '80px', resize: 'none' }} placeholder="Ex: Abrir minha loja física..." value={dream} onChange={e => { setDream(e.target.value); if (invalidField === 'dream') setInvalidField(""); }} />
            </div>

            <div className="onboarding-form-group" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <label className="onboarding-label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>Crie seu PIN de acesso</label>

                <div style={{ background: 'rgba(55, 65, 81, 0.5)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'start', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4', textShadow: 'none !important' }}>
                        <span style={{ color: 'var(--red-primary)', fontWeight: '600', textShadow: 'none !important' }}>Atenção:</span> Guarde bem este número! Ele será sua senha para entrar no aplicativo sempre que precisar.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            className={`onboarding-input ${invalidField === 'pin' ? 'input-error-blink' : ''}`}
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="PIN (4-6 dígitos)"
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
                    <p style={{ color: 'var(--red-primary)', fontSize: '12px', marginTop: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textShadow: 'none !important' }}>
                        Os códigos informados não coincidem
                    </p>
                )}
            </div>

            {error && <p className="onboarding-error">{error}</p>}
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
                    disabled={loading || !isValidProfile}
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
        if (currentQuestion < MATURITY_DATA.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            setStep(5);
        }
    };

    const handleRevenueGoalNext = () => {
        setInvalidField("");
        setError("");

        let hasError = false;
        if (!revenueGoal.trim()) {
            setError("Informe sua meta de vendas para este mês.");
            setInvalidField("revenueGoal");
            hasError = true;
        } else if (!initialBalance.trim()) {
            setError("Informe quanto você tem em caixa para começarmos.");
            setInvalidField("initialBalance");
            hasError = true;
        }

        if (hasError) return;

        setStep(7);
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

    const handleInitialFinanceNext = async () => {
        setLoading(true);
        setError("");

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

            // 1. Salvar Saldo Inicial (se houver)
            if (initialBalance) {
                const val = parseFloat(initialBalance.replace(/\./g, '').replace(',', '.'));
                if (val > 0) {
                    await fetch(`${API_BASE}/api/user/finance/record`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            phone_number: phone,
                            type: "entrada",
                            amount: val,
                            category: "outros_receita",
                            description: "Saldo Inicial (Onboarding)"
                        })
                    });
                }
            }

            // 2. Salvar Despesas Iniciais
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

            setStep(7); // Ir para Termos
        } catch (err) {
            console.error(err);
            setError("Erro ao salvar dados financeiros. Tente novamente ou pule esta etapa.");
        } finally {
            setLoading(false);
        }
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

            console.log("Onboarding: Salvando dados finais...", { name, businessType, dream, goalValue, balanceValue });

            // 1. Salvar Perfil e Maturidade
            // O initial_balance já foi salvo como record em handleInitialFinanceNext, 
            // mas aqui salvamos no perfil para persistência e contexto da IA.
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

            // 2. Aceitar Termos
            await fetch(`${API_BASE}/api/user/accept-terms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phone }),
            });

            localStorage.setItem("meumei_phone", phone);
            localStorage.setItem("meumei_login_at", String(Date.now()));

            console.log("Onboarding: Finalizado. Redirecionando...");
            // Pequeno delay para garantir persistência e processamento no backend
            setTimeout(() => {
                router.push("/chat");
            }, 1000);
        } catch (e) { setError("Erro ao finalizar cadastro. Tente novamente."); }
        finally { setLoading(false); }
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
                    Começar Diagnóstico
                </button>
            </div>
        </div>
    );

    const renderMaturity = () => {
        const question = MATURITY_DATA[currentQuestion];
        const progress = ((currentQuestion + 1) / MATURITY_DATA.length) * 100;

        return (
            <div className="tf-view">
                <div className="tf-progress-bar"><div className="tf-progress-inner" style={{ width: `${progress}%` }} /></div>
                <div className="tf-container">
                    <div className="tf-question-header">
                        <div className="tf-question-number"><span>{currentQuestion + 1}</span></div>
                        <h2 className="tf-question-text">{question.question}</h2>
                    </div>
                    <div className="tf-options-list">
                        {question.options.map((opt) => (
                            <button key={opt.value} className={`tf-btn ${answers[currentQuestion] === opt.value ? 'selected' : ''}`} onClick={() => handleAnswer(opt.value)}>
                                <span className="tf-option-key">{opt.value}</span>
                                <span className="tf-option-label">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="tf-actions">
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
                        <div className="tf-counter">Questão {currentQuestion + 1} de {MATURITY_DATA.length}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRevenueGoal = () => {
        const isComplete = revenueGoal.trim() && initialBalance.trim();

        return (
            <div className="onboarding-card" style={{ maxWidth: '580px' }}>
                <h2 className="onboarding-title">Defina sua Meta e Saldo</h2>
                <p className="onboarding-subtitle">Para que o Meu MEI possa te ajudar a alcançar seus objetivos, precisamos saber onde você quer chegar e com quanto estamos começando.</p>

                <div className="onboarding-form-group">
                    <label className="onboarding-label">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            1. Qual é a sua meta mensal de vendas ou o valor que você gostaria de faturar?
                        </div>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-muted)' }}>R$</span>
                        <input
                            autoFocus
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
                        />
                    </div>
                </div>

                <div className="onboarding-form-group" style={{ marginTop: '24px' }}>
                    <label className="onboarding-label">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            2. Quanto você tem disponível em caixa hoje? (Dinheiro + Banco)
                        </div>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-muted)' }}>R$</span>
                        <input
                            className={`onboarding-input ${invalidField === 'initialBalance' ? 'input-error-blink' : ''}`}
                            style={{ paddingLeft: '48px', fontSize: '24px', color: 'var(--green)' }}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleRevenueGoalNext()}
                        />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        * Este valor será o seu saldo inicial para começarmos a acompanhar seu fluxo de caixa.
                    </p>
                </div>

                {error && <p className="onboarding-error">{error}</p>}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button className="tf-back-btn" onClick={() => setStep(4)} style={{ padding: '12px 24px' }}>
                        Voltar
                    </button>
                    <button
                        className={`onboarding-btn ${!isComplete ? 'is-inactive' : ''}`}
                        onClick={handleRevenueGoalNext}
                        disabled={loading}
                        style={{ flex: 1, margin: 0 }}
                    >
                        {loading ? "Salvando..." : "Continuar →"}
                    </button>
                </div>
            </div>
        );
    };

    const renderInitialFinance = () => (
        <div className="onboarding-card" style={{ maxWidth: '600px' }}>
            <h2 className="onboarding-title">Primeiros Passos Financeiros</h2>
            <p className="onboarding-subtitle">
                Vamos começar com o pé direito? Se você já tem algum valor em caixa ou contas a pagar, registre aqui.
                <br /><small style={{ opacity: 0.7 }}>(Esta etapa é opcional, mas recomendada!)</small>
            </p>

            {/* Saldo Inicial */}
            <div className="onboarding-form-group" style={{ marginBottom: '24px' }}>
                <label className="onboarding-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Saldo Atual (Dinheiro em mãos + Banco)
                </label>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: 'var(--text-muted)' }}>R$</span>
                    <input
                        className="onboarding-input"
                        style={{ paddingLeft: '48px', fontSize: '20px', color: 'var(--green)' }}
                        placeholder="0,00"
                        value={initialBalance}
                        onChange={e => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (!v) { setInitialBalance(""); return; }
                            const floatValue = parseInt(v) / 100;
                            setInitialBalance(floatValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                        }}
                    />
                </div>
            </div>

            {/* Despesas Iniciais */}
            <div className="onboarding-form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="onboarding-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                        Contas a Pagar (Pendentes)
                    </label>
                    <button onClick={handleAddExpense} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Adicionar
                    </button>
                </div>

                {initialExpenses.length === 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        Nenhuma conta adicionada. Se tiver boletos ou despesas próximas, adicione aqui.
                    </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto' }}>
                    {initialExpenses.map((exp, idx) => (
                        <div key={exp.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 24px', gap: '8px', alignItems: 'center', background: 'var(--bg-app)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                    placeholder="Descrição (ex: Aluguel)"
                                    value={exp.description}
                                    onChange={e => updateExpense(exp.id, 'description', e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%', outline: 'none' }}
                                />
                                <select
                                    value={exp.category}
                                    onChange={e => updateExpense(exp.id, 'category', e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>R$</span>
                                <input
                                    placeholder="0,00"
                                    value={exp.amount}
                                    onChange={e => {
                                        let v = e.target.value.replace(/\D/g, "");
                                        if (!v) { updateExpense(exp.id, 'amount', ""); return; }
                                        const floatValue = parseInt(v) / 100;
                                        updateExpense(exp.id, 'amount', floatValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                    }}
                                    style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 4px 4px 22px', color: 'var(--red-primary)', fontSize: '13px', width: '100%', textAlign: 'right' }}
                                />
                            </div>
                            <button onClick={() => removeExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                X
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {error && <p className="onboarding-error">{error}</p>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    className="onboarding-btn"
                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    onClick={() => setStep(7)}
                    disabled={loading}
                >
                    Pular
                </button>
                <button
                    className="onboarding-btn"
                    style={{ flex: 2 }}
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
                <div className="terms-body" style={{ color: '#FFFFFF', textAlign: 'left', padding: '0', textShadow: 'none !important' }}>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        Bem-vindo ao <strong>Meu MEI</strong>. Ao utilizar nossa plataforma, você confia a nós a gestão de dados importantes para o seu crescimento. Este documento explica como protegemos seus dados, quais são seus direitos e as regras para o uso da nossa tecnologia de mentoria financeira.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px', textShadow: 'none !important' }}>1. Termos de Uso (Regras de Convivência)</h2>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>1.1. Objeto e Aceite</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        O Meu MEI é uma ferramenta de auxílio à gestão financeira e educação para Microempreendedores Individuais. Ao clicar em "Aceito os Termos", você declara ter lido e concordado com estas regras.
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>1.2. Elegibilidade e Cadastro</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        A plataforma é destinada exclusivamente a MEIs devidamente registrados no território brasileiro. O usuário é responsável pela veracidade dos dados inseridos (CNPJ, faturamento, despesas).
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>1.3. Limitações da Inteligência Artificial</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        O Meu MEI atua como um mentor educativo. Você declara estar ciente de que:
                    </p>
                    <ul style={{ paddingLeft: '20px', color: '#FFFFFF', textShadow: 'none !important' }}>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}>As recomendações da IA são baseadas em dados inseridos por você e em modelos estatísticos.</li>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}>O agente não substitui o aconselhamento profissional de um contador ou advogado.</li>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}>O sistema não realiza transações bancárias nem investimentos em seu nome.</li>
                    </ul>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>1.4. Uso Proibido</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        É terminantemente proibido utilizar a plataforma para registrar atividades ilícitas, sonegação fiscal ou práticas que configurem lavagem de dinheiro ou fraude.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px', textShadow: 'none !important' }}>2. Política de Privacidade (LGPD)</h2>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>2.1. Quais dados coletamos?</h3>
                    <ul style={{ paddingLeft: '20px', color: '#FFFFFF', textShadow: 'none !important' }}>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}><strong>Dados Cadastrais:</strong> Nome, e-mail, CPF e CNPJ.</li>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}><strong>Dados Financeiros:</strong> Registros de entradas, saídas, boletos e fluxo de caixa.</li>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}><strong>Dados Multimodais:</strong> Textos, áudios enviados para registro de voz, arquivos e imagens/PDFs de recibos.</li>
                        <li style={{ color: '#FFFFFF', textShadow: 'none !important' }}><strong>Dados de Diagnóstico:</strong> Respostas ao instrumento IAMF-MEI.</li>
                    </ul>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>2.2. Para que usamos seus dados?</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        As finalidades incluem a personalização da linguagem conforme sua maturidade financeira, processamento automatizado de recibos e análise de progresso rumo ao seu "Caminho para o Sonho".
                    </p>

                    <h3 style={{ color: '#FFFFFF', fontSize: '15px', marginTop: '16px', marginBottom: '8px', textShadow: 'none !important' }}>2.3. Compartilhamento de Dados</h3>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        Seus dados financeiros não são vendidos. Compartilhamos apenas com parceiros essenciais (Google Cloud/Vertex AI) ou com o ecossistema Bradesco mediante sua autorização prévia.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px', textShadow: 'none !important' }}>3. Segurança da Informação</h2>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        Adotamos criptografia rigorosa em trânsito e em repouso, isolamento de domínio e monitoramento constante de logs para garantir a integridade do sistema.
                    </p>

                    <h2 style={{ color: '#FFFFFF', fontSize: '18px', marginTop: '24px', marginBottom: '12px', textShadow: 'none !important' }}>4. Atualizações</h2>
                    <p style={{ color: '#FFFFFF', textShadow: 'none !important' }}>
                        Este documento pode ser atualizado para refletir melhorias técnicas. Notificaremos você sobre alterações importantes.
                    </p>
                </div>
            </div>
            <div className={invalidField === 'terms' ? 'input-error-blink' : ''} style={{ margin: '24px 0', textAlign: 'left', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                <div className="custom-checkbox-container" onClick={() => { setAcceptedTerms(!acceptedTerms); if (invalidField === 'terms') setInvalidField(""); }} style={{ padding: '4px' }}>
                    <div className={`custom-checkbox-circle ${acceptedTerms ? 'checked' : ''}`}><div className="custom-checkbox-dot" /></div>
                    <span style={{ lineHeight: '1.4', fontSize: '14px', color: '#FFFFFF', textShadow: 'none !important' }}>Li e compreendo que o <strong>Meu MEI</strong> processará meus áudios e imagens para fins de gestão financeira. Autorizo o tratamento dos meus dados conforme a LGPD.</span>
                </div>
            </div>
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
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'rgba(255, 255, 255, 0.6)', textShadow: 'none', boxShadow: 'none' }}
                    onClick={() => router.push("/")}
                >
                    Sair
                </button>
            </div>
        </div>
    );

    return (
        <main className="onboarding-screen">
            {(step === 0 || step === 1) && (
                <div className="onboarding-split-container">
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
                    <div className="onboarding-login-side">
                        {step === 0 && renderPhoneInput()}
                        {step === 1 && renderLoginPin()}
                    </div>
                </div>
            )}
            {step === 2 && <div className="onboarding-content">{renderProfile()}</div>}
            {step === 3 && <div className="onboarding-content">{renderMaturityIntro()}</div>}
            {step === 4 && <div className="onboarding-content">{renderMaturity()}</div>}
            {step === 5 && <div className="onboarding-content">{renderRevenueGoal()}</div>}
            {step === 7 && <div className="onboarding-content">{renderTerms()}</div>}

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
