"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitMaturity } from "../../lib/api";

const QUESTIONS = [
    {
        text: "Eu registro todas as entradas e saídas de dinheiro do meu negócio, identificando exatamente para onde vai cada valor.",
        hint: "Anotar tudo o que se vende e gasta é o primeiro passo para gerir a saúde do negócio.",
    },
    {
        text: "Eu utilizo contas bancárias diferentes para minha vida pessoal e para minha empresa.",
        hint: "A confusão patrimonial compromete a análise do lucro real e a sustentabilidade da empresa.",
    },
    {
        text: "Eu acompanho meu saldo e sei com antecedência se terei dinheiro para pagar os boletos da próxima semana ou do próximo mês.",
        hint: "A falta de previsão de saldo é um dos principais riscos detectados em microempreendedores.",
    },
    {
        text: "Eu procuro aprender novas formas de cuidar do dinheiro e de melhorar a gestão da minha empresa.",
        hint: "O aprendizado contínuo sobre gestão financeira tende a gerar resultados positivos na longevidade dos negócios.",
    },
    {
        text: "Eu defino meus preços sabendo exatamente quanto gasto para produzir e qual será minha sobra (lucro) final.",
        hint: "Entender a diferença entre faturamento e lucro é vital para a continuidade do empreendimento.",
    },
];

const LIKERT_LABELS = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0 = dados, 1 = quiz
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [dream, setDream] = useState("");
    const [answers, setAnswers] = useState(Array(5).fill(0));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const handlePhoneChange = (e) => {
        setPhone(formatPhone(e.target.value));
    };

    const handleAnswer = (questionIndex, value) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = value;
        setAnswers(newAnswers);
    };

    const canProceed = step === 0
        ? name.trim() && phone.length === 13 && dream.trim()
        : answers.every((a) => a > 0);

    const handleSubmit = async () => {
        if (step === 0) {
            setStep(1);
            return;
        }

        setLoading(true);
        setError("");

        try {
            await submitMaturity({
                phone_number: phone,
                name,
                dream,
                answers,
            });

            localStorage.setItem("meumei_phone", phone);
            localStorage.setItem("meumei_name", name);
            router.push("/chat");
        } catch (err) {
            setError(err.message || "Erro ao salvar. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                {/* Logo */}
                <h1>Meu MEI</h1>
                <p className="subtitle">
                    {step === 0
                        ? "Vamos começar! Me conta um pouco sobre você e o seu negócio."
                        : "Agora, responda com sinceridade para eu entender melhor seu momento financeiro."}
                </p>

                {/* Step Indicator */}
                <div className="step-indicator">
                    <div className={`step-dot ${step >= 0 ? (step === 0 ? "active" : "completed") : ""}`}></div>
                    <div className={`step-dot ${step >= 1 ? "active" : ""}`}></div>
                </div>

                {error && (
                    <p style={{ color: "var(--red-light)", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                        {error}
                    </p>
                )}

                {step === 0 ? (
                    /* ─── Dados Pessoais ─── */
                    <>
                        <div className="form-group">
                            <label>Seu nome</label>
                            <input
                                className="form-input"
                                placeholder="Como posso te chamar?"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Telefone (WhatsApp)</label>
                            <input
                                className="form-input"
                                placeholder="11-98765-4321"
                                value={phone}
                                onChange={handlePhoneChange}
                                maxLength={13}
                            />
                        </div>

                        <div className="form-group">
                            <label>Qual é o seu sonho como empreendedor?</label>
                            <input
                                className="form-input"
                                placeholder="Ex: ter uma loja própria, fazer uma viagem, ter salário fixo..."
                                value={dream}
                                onChange={(e) => setDream(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    /* ─── Quiz IAMF-MEI ─── */
                    <>
                        {QUESTIONS.map((q, qi) => (
                            <div key={qi} className="quiz-question">
                                <p>
                                    <strong>{qi + 1}.</strong> {q.text}
                                </p>
                                <p className="hint">{q.hint}</p>
                                <div className="likert-scale">
                                    {LIKERT_LABELS.map((label, li) => (
                                        <div key={li} className="likert-option">
                                            <input
                                                type="radio"
                                                id={`q${qi}-a${li}`}
                                                name={`question-${qi}`}
                                                checked={answers[qi] === li + 1}
                                                onChange={() => handleAnswer(qi, li + 1)}
                                            />
                                            <label htmlFor={`q${qi}-a${li}`}>
                                                <span className="likert-number">{li + 1}</span>
                                                <span className="likert-label">{label}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={!canProceed || loading}
                >
                    {loading ? "Salvando..." : step === 0 ? "Continuar →" : "Começar minha jornada 🚀"}
                </button>
            </div>
        </div>
    );
}
