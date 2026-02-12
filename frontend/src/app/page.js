"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Página raiz — Verifica se já tem telefone salvo:
 * - Se sim → vai para /chat
 * - Se não → vai para /onboarding
 */
export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const phone = localStorage.getItem("meumei_phone");
        const loginAt = localStorage.getItem("meumei_login_at");
        const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

        if (phone && loginAt && (Date.now() - Number(loginAt)) < SESSION_DURATION_MS) {
            router.replace("/chat");
        } else {
            localStorage.removeItem("meumei_phone");
            localStorage.removeItem("meumei_login_at");
            router.replace("/onboarding");
        }
    }, [router]);

    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">Carregando Meu MEI...</p>
        </div>
    );
}
