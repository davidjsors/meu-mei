"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TermsModal from "../../components/TermsModal";

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
    const [showTerms, setShowTerms] = useState(false);

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
            // Check if user already exists (returning user)
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const resp = await fetch(`${API_BASE}/api/user/profile/${phone}`);
            const profile = resp.ok ? await resp.json() : null;

            if (profile && profile.terms_accepted) {
                // Returning user who already accepted terms — proceed
                localStorage.setItem("meumei_phone", phone);
                localStorage.setItem("meumei_login_at", String(Date.now()));
                router.push("/chat");
            } else {
                // New user or hasn't accepted terms — show modal
                setLoading(false);
                setShowTerms(true);
            }
        } catch (err) {
            // On error, show terms to be safe
            setLoading(false);
            setShowTerms(true);
        }
    };

    const handleAcceptTerms = async () => {
        setLoading(true);
        try {
            // Save terms acceptance in backend (best-effort)
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            const resp = await fetch(`${API_BASE}/api/user/accept-terms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phone }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                console.warn("Erro ao salvar aceite no backend:", resp.status, err);
            } else {
                const data = await resp.json();
                console.log("Termos aceitos com sucesso:", data);
            }
        } catch (err) {
            console.warn("Erro ao salvar aceite:", err);
        }

        // Proceed regardless — don't block the user
        localStorage.setItem("meumei_phone", phone);
        localStorage.setItem("meumei_login_at", String(Date.now()));
        router.push("/chat");
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

            {/* Terms Modal */}
            {showTerms && (
                <TermsModal
                    onAccept={handleAcceptTerms}
                    onClose={() => setShowTerms(false)}
                />
            )}
        </div>
    );
}
