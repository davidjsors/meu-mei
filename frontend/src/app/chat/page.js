"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, streamResponse, getHistory, getProfile } from "../../lib/api";
import MessageList from "../../components/MessageList";
import ChatInput from "../../components/ChatInput";
import Sidebar from "../../components/Sidebar";
import GuidanceTour from "../../components/GuidanceTour";

/**
 * Regex para limpar marcadores internos da resposta exibida.
 */
const ONBOARDING_MARKER_RE = /\[ONBOARDING_COMPLETE\][\s\S]*?\[\/ONBOARDING_COMPLETE\]/gi;
const TRANSACTION_MARKER_RE = /\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]/gi;
const DELETE_MARKER_RE = /\[DELETE_TRANSACTION\][\s\S]*?\[\/DELETE_TRANSACTION\]/gi;
const RESET_MARKER_RE = /\[RESET_FINANCE.*?\]/gi;

function cleanMarkers(text) {
    return text
        .replace(ONBOARDING_MARKER_RE, "")
        .replace(TRANSACTION_MARKER_RE, "")
        .replace(DELETE_MARKER_RE, "")
        .replace(RESET_MARKER_RE, "")
        .trim();
}

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [profile, setProfile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState("");
    const [financeKey, setFinanceKey] = useState(0);
    const [showTour, setShowTour] = useState(false);

    // Load user data on mount
    useEffect(() => {
        const savedPhone = localStorage.getItem("meumei_phone");
        const loginAt = localStorage.getItem("meumei_login_at");
        const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

        if (!savedPhone || !loginAt || (Date.now() - Number(loginAt)) >= SESSION_DURATION_MS) {
            // Session missing or expired — clear and redirect
            localStorage.removeItem("meumei_phone");
            localStorage.removeItem("meumei_login_at");
            router.replace("/onboarding");
            return;
        }
        setPhone(savedPhone);

        const init = async () => {
            try {
                // Load profile and history in parallel
                const [profileData, historyData] = await Promise.all([
                    getProfile(savedPhone),
                    getHistory(savedPhone),
                ]);

                setProfile(profileData);

                // Limpar marcadores de onboarding do histórico exibido
                const cleanedMessages = (historyData || []).map((msg) => ({
                    ...msg,
                    content: msg.role === "assistant"
                        ? cleanMarkers(msg.content || "")
                        : msg.content,
                }));

                setMessages(cleanedMessages);

                if (cleanedMessages.length === 0 && profileData && profileData.maturity_score) {
                    const tourCompleted = localStorage.getItem(`meumei_tour_completed_${savedPhone}`);
                    if (!tourCompleted) {
                        setShowTour(true);
                    } else {
                        setTimeout(() => {
                            handleSend("Olá! Acabei de chegar e quero começar minha mentoria. Me explique como você pode me ajudar?");
                        }, 1000);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    // Send message
    const handleSend = useCallback(
        async (text, file) => {
            if (!phone) return;

            // Add user message to UI immediately
            const userMsg = {
                id: `temp-${Date.now()}`,
                phone_number: phone,
                role: "user",
                content: text || (file ? `[Arquivo: ${file.name}]` : ""),
                content_type: file
                    ? file.type.startsWith("image/")
                        ? "image"
                        : file.type.startsWith("audio/")
                            ? "audio"
                            : "pdf"
                    : "text",
                file_name: file?.name || null,
                file_url: file ? URL.createObjectURL(file) : null,
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            setStreamingText("");

            try {
                const response = await sendMessage(phone, text, file);

                // Stream the response
                let accumulated = "";
                let isDone = false;
                await streamResponse(
                    response,
                    // onChunk
                    (chunk) => {
                        accumulated += chunk;
                        // Mostrar sem marcadores
                        setStreamingText(cleanMarkers(accumulated));
                        setIsTyping(false);
                    },
                    // onDone
                    () => {
                        isDone = true;
                        const cleanContent = cleanMarkers(accumulated);
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `ai-${Date.now()}`,
                                phone_number: phone,
                                role: "assistant",
                                content: cleanContent,
                                content_type: "text",
                                created_at: new Date().toISOString(),
                            },
                        ]);
                        setStreamingText("");
                    },
                    // onError
                    (error) => {
                        console.error("Erro no streaming:", error);
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `error-${Date.now()}`,
                                phone_number: phone,
                                role: "assistant",
                                content: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? 😊",
                                content_type: "text",
                                created_at: new Date().toISOString(),
                            },
                        ]);
                        setStreamingText("");
                        setIsTyping(false);
                    },
                    // onOnboardingComplete — recarregar perfil
                    async (level) => {
                        try {
                            const updatedProfile = await getProfile(phone);
                            setProfile(updatedProfile);
                        } catch (err) {
                            console.error("Erro ao recarregar perfil:", err);
                        }
                    },
                    // onFinanceUpdated — recarregar sidebar
                    () => {
                        setFinanceKey((k) => k + 1);
                    }
                );

                // Safety net: if stream ended but onDone never fired, finalize the message
                if (!isDone && accumulated) {
                    const cleanContent = cleanMarkers(accumulated);
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `ai-${Date.now()}`,
                            phone_number: phone,
                            role: "assistant",
                            content: cleanContent,
                            content_type: "text",
                            created_at: new Date().toISOString(),
                        },
                    ]);
                    setStreamingText("");
                }
            } catch (err) {
                console.error("Erro ao enviar:", err);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        phone_number: phone,
                        role: "assistant",
                        content: "Hmm, não consegui me conectar ao servidor. Verifique sua conexão e tente novamente.",
                        content_type: "text",
                        created_at: new Date().toISOString(),
                    },
                ]);
                setIsTyping(false);
            }
        },
        [phone]
    );

    // Handle Sidebar Quick Transactions
    const handleTransaction = (data) => {
        const { type, amount, description, categoryLabel } = data;
        const action = type === "entry" ? "entrada" : "saída";
        const emoji = type === "entry" ? "💰" : "💸";

        let text = `Registre uma **${action}** de **R$ ${amount}** ${emoji} | **${categoryLabel}**`;
        if (description) {
            text += ` | *${description}*`;
        }

        handleSend(text);
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">
                    Conectando ao Meu MEI...<br />
                    <small style={{ color: "var(--text-muted)" }}>
                        A primeira conexão pode levar até 30 segundos.
                    </small>
                </p>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Sidebar
                profile={profile}
                phoneNumber={phone}
                refreshKey={financeKey}
                onSendTransaction={handleTransaction}
            />

            <main className="chat-area">
                {/* Chat Header */}
                <div className="chat-header">
                    <div className="chat-header-avatar" style={{
                        backgroundColor: '#CC0000', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <img src="/logo.svg" alt="MeuMEI" style={{
                            width: '95%', height: '95%',
                            objectFit: 'contain',
                            filter: 'brightness(0) invert(1)',
                        }} />
                    </div>
                    <div className="chat-header-info">
                        <h2>Meu MEI</h2>
                        <p>
                            {isTyping || streamingText ? "digitando..." : "online"}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <MessageList
                    messages={messages}
                    isTyping={isTyping}
                    streamingText={streamingText}
                />

                {/* Input */}
                <ChatInput
                    onSend={handleSend}
                    disabled={isTyping || !!streamingText}
                />
            </main>

            {showTour && (
                <GuidanceTour
                    phoneNumber={phone}
                    onClose={() => {
                        setShowTour(false);
                        // Dispara a mensagem de boas-vindas após o tour
                        setTimeout(() => {
                            handleSend("Olá! Acabei de chegar e quero começar minha mentoria. Me explique como você pode me ajudar?");
                        }, 500);
                    }}
                />
            )}
        </div>
    );
}
