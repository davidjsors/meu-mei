"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function isSessionValid() {
    const phone = typeof window !== "undefined" ? localStorage.getItem("meumei_phone") : null;
    const loginAt = typeof window !== "undefined" ? localStorage.getItem("meumei_login_at") : null;
    if (!phone || !loginAt) return false;
    return Date.now() - Number(loginAt) < SESSION_DURATION_MS;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // If session is still valid, redirect straight to chat
    useEffect(() => {
        if (isSessionValid()) {
            router.replace("/chat");
        }
    }, [router]);

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const handlePhoneChange = (e) => {
        setPhone(formatPhone(e.target.value));
    };

    const handleSubmit = async () => {
        if (phone.length !== 13) return;
        setLoading(true);
        setError("");

        try {
            localStorage.setItem("meumei_phone", phone);
            localStorage.setItem("meumei_login_at", String(Date.now()));
            router.push("/chat");
        } catch (err) {
            setError("Erro ao continuar. Tente novamente.");
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card" style={{ maxWidth: 540 }}>
                {/* Logo */}
                <div className="login-logo" style={{ width: '100%', padding: 0 }}>
                    <img
                        src="/logo2.svg"
                        alt="Meu MEI - finanças em dia, dinheiro no bolso"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </div>

                <p className="subtitle" style={{ marginTop: 24, marginBottom: 28, fontSize: 13 }}>
                    Digite o número do seu telefone celular <br />para começar sua jornada rumo a sua <br />independência financeira.
                </p>

                {error && (
                    <p style={{ color: "var(--red-light)", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                        {error}
                    </p>
                )}

                <div className="form-group">
                    <label>Seu Telefone</label>
                    <input
                        className="form-input"
                        placeholder="11-98765-4321"
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={handleKeyDown}
                        maxLength={13}
                        autoFocus
                        style={{ textAlign: "center", fontSize: 20, letterSpacing: 1 }}
                    />
                </div>

                <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={phone.length !== 13 || loading}
                >
                    {loading ? "Entrando..." : "Começar conversa →"}
                </button>

                <p style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    marginTop: 16,
                    lineHeight: 1.5,
                }}>
                    Usamos seu número apenas para salvar seu progresso.<br />
                    Seus dados ficam seguros. 🔒
                </p>
            </div>
        </div>
    );
}
