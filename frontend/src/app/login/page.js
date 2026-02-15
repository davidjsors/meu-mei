"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, Fingerprint, Smartphone } from "lucide-react";
import { loginPin, getProfile } from "../../lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Phone, 2: PIN
    const [phone, setPhone] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [name, setName] = useState("");

    useEffect(() => {
        const savedPhone = localStorage.getItem("meumei_phone");
        if (savedPhone) {
            setPhone(savedPhone);
            setStep(2);
            fetchName(savedPhone);
        }
    }, []);

    const fetchName = (p) => {
        getProfile(p).then(prof => {
            if (prof && prof.name) setName(prof.name.split(" ")[0]);
        });
    };

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const handlePhoneSubmit = async () => {
        if (phone.replace(/\D/g, "").length !== 11) {
            setError("Telefone inválido");
            return;
        }
        setStep(2);
        setError("");
        fetchName(phone);
    };

    const handleLogin = async () => {
        if (pin.length < 4) return;
        setLoading(true);
        setError("");

        try {
            const resp = await loginPin(phone, pin);
            if (resp.success) {
                localStorage.setItem("meumei_phone", phone);
                localStorage.setItem("meumei_login_at", String(Date.now()));
                router.push("/chat");
            }
        } catch (err) {
            // Se erro 400/404, pode ser que não tenha cadastro ou PIN
            setError(err.message || "PIN incorreto");
            setPin("");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPin = () => {
        alert("Para recuperar seu PIN, envie um e-mail para: david.sors@gmail.com");
    };

    return (
        <main className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon-bg">
                        {step === 1 ? <Smartphone size={32} color="var(--blue-primary)" /> : <Lock size={32} color="var(--blue-primary)" />}
                    </div>
                    <h1 className="login-title">
                        {step === 1 ? "Bem-vindo!" : `Olá${name ? `, ${name}` : ""}!`}
                    </h1>
                    <p className="login-subtitle">
                        {step === 1 ? "Digite seu telefone para entrar." : "Digite seu PIN de acesso."}
                    </p>
                </div>

                <div className="login-form">
                    {step === 1 ? (
                        <>
                            <input
                                className={`login-input ${error ? 'input-error' : ''}`}
                                placeholder="11-99999-9999"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(formatPhone(e.target.value));
                                    setError("");
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                                autoFocus
                            />
                            {error && <div className="login-error"><AlertCircle size={14} /> {error}</div>}
                            <button className="login-btn" onClick={handlePhoneSubmit}>
                                Continuar <ArrowRight size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="password"
                                inputMode="numeric"
                                className={`login-pin-input ${error ? 'input-error' : ''}`}
                                placeholder="••••"
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                                    setError("");
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                autoFocus
                            />
                            {error && <div className="login-error"><AlertCircle size={14} /> {error}</div>}

                            <button
                                className="login-btn"
                                onClick={handleLogin}
                                disabled={loading || pin.length < 4}
                            >
                                {loading ? <div className="spinner-sm" /> : "Entrar"}
                            </button>

                            <button
                                className="link-btn"
                                style={{ marginTop: '12px' }}
                                onClick={() => setStep(1)}
                            >
                                Trocar telefone
                            </button>
                        </>
                    )}
                </div>

                <div className="login-footer">
                    {step === 2 && (
                        <button className="forgot-pin-btn" onClick={handleForgotPin}>
                            Esqueci meu PIN
                        </button>
                    )}
                    {step === 1 && (
                        <button className="forgot-pin-btn" onClick={() => router.push("/onboarding")}>
                            Não tem conta? <strong>Cadastre-se</strong>
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                 .login-screen {
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     height: 100vh;
                     background: var(--bg-app);
                     padding: 20px;
                 }
                 .login-card {
                     background: var(--bg-card);
                     padding: 40px;
                     border-radius: 24px;
                     width: 100%;
                     max-width: 400px;
                     text-align: center;
                     box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                     border: 1px solid var(--border-color);
                 }
                 .login-icon-bg {
                     width: 64px;
                     height: 64px;
                     background: rgba(59, 130, 246, 0.1);
                     border-radius: 50%;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     margin: 0 auto 20px;
                 }
                 .login-title {
                     font-size: 24px;
                     color: var(--text-primary);
                     margin-bottom: 8px;
                 }
                 .login-subtitle {
                     font-size: 14px;
                     color: var(--text-secondary);
                     margin-bottom: 32px;
                 }
                 .login-input {
                     width: 100%;
                     padding: 16px;
                     background: var(--bg-hover);
                     border: 1px solid transparent;
                     border-radius: 12px;
                     font-size: 18px;
                     text-align: center;
                     color: var(--text-primary);
                     margin-bottom: 16px;
                     outline: none;
                 }
                 .login-pin-input {
                     width: 100%;
                     font-size: 32px;
                     text-align: center;
                     letter-spacing: 8px;
                     background: var(--bg-hover);
                     border: 2px solid transparent;
                     border-radius: 12px;
                     padding: 16px;
                     color: var(--text-primary);
                     margin-bottom: 16px;
                     outline: none;
                     transition: all 0.2s;
                 }
                 .login-pin-input:focus, .login-input:focus {
                     border-color: var(--blue-primary);
                     background: var(--bg-card);
                 }
                 .input-error {
                     border-color: var(--red-primary);
                     animation: shake 0.4s;
                 }
                 .login-error {
                     color: var(--red-primary);
                     font-size: 13px;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 6px;
                     margin-bottom: 16px;
                 }
                 .login-btn {
                     width: 100%;
                     padding: 16px;
                     background: var(--blue-primary);
                     color: white;
                     border: none;
                     border-radius: 12px;
                     font-size: 16px;
                     font-weight: 600;
                     cursor: pointer;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 8px;
                     transition: opacity 0.2s;
                 }
                 .login-btn:disabled {
                     opacity: 0.5;
                     cursor: not-allowed;
                 }
                 .link-btn {
                     background: none;
                     border: none;
                     color: var(--text-secondary);
                     font-size: 14px;
                     cursor: pointer;
                     text-decoration: underline;
                 }
                 .login-footer {
                     margin-top: 32px;
                     display: flex;
                     justify-content: center;
                     align-items: center;
                 }
                 .forgot-pin-btn {
                     background: none;
                     border: none;
                     color: var(--text-secondary);
                     font-size: 14px;
                     cursor: pointer;
                 }
                 .forgot-pin-btn strong {
                     color: var(--blue-primary);
                 }
                 @keyframes shake {
                     0%, 100% { transform: translateX(0); }
                     25% { transform: translateX(-5px); }
                     75% { transform: translateX(5px); }
                 }
                 .spinner-sm {
                     width: 20px;
                     height: 20px;
                     border: 2px solid rgba(255,255,255,0.3);
                     border-top-color: white;
                     border-radius: 50%;
                     animation: spin 1s linear infinite;
                 }
                 @keyframes spin {
                     to { transform: rotate(360deg); }
                 }
             `}</style>
        </main>
    );
}
