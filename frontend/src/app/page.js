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
        if (phone) {
            router.replace("/chat");
        } else {
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
