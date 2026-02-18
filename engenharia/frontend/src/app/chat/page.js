"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, streamResponse, getHistory, getProfile } from "../../lib/api";
import { cleanMarkers, getFriendlyErrorMessage } from "../../lib/utils";
import MessageList from "../../components/MessageList";
import ChatInput from "../../components/ChatInput";
import Sidebar from "../../components/Sidebar";
import GuidanceTour from "../../components/GuidanceTour";

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
    const [replyingTo, setReplyingTo] = useState(null); // Mensagem sendo respondida (Estilo Zap)
    const [audioStatus, setAudioStatus] = useState(""); // Status de geração de áudio
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const chatInputRef = useRef(null);

    // Mapa de mensagens por ID para lookup rápido de citações
    const messagesMap = useMemo(() => {
        const map = {};
        messages.forEach(msg => {
            if (msg.id) map[msg.id] = msg;
        });
        return map;
    }, [messages]);

    // Handle Reply click
    const handleReply = useCallback((msg) => {
        setReplyingTo(msg);
        // Pequeno delay para garantir que o state atualizou, se necessário
        setTimeout(() => {
            chatInputRef.current?.focus();
        }, 10);
    }, []);

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
                // Load profile and history in parallel, with a minimum wait for animation
                const [profileData, historyData] = await Promise.all([
                    getProfile(savedPhone),
                    getHistory(savedPhone),
                    new Promise(resolve => setTimeout(resolve, 2000)) // 2s é o ideal para UX rápida
                ]);

                setProfile(profileData);

                // Limpar marcadores e filtrar mensagens que ficaram vazias após limpeza
                const cleanedMessages = (historyData || [])
                    .map((msg) => ({
                        ...msg,
                        content: msg.role === "assistant"
                            ? cleanMarkers(msg.content || "")
                            : msg.content,
                    }))
                    .filter((msg) => {
                        // Se for texto, só mantém se não estiver vazio
                        if (msg.content_type === "text" || !msg.content_type) {
                            return (msg.content || "").trim().length > 0;
                        }
                        // Se for imagem/áudio/pdf, mantém
                        return true;
                    })
                    .sort((a, b) => {
                        const timeA = new Date(a.created_at).getTime();
                        const timeB = new Date(b.created_at).getTime();

                        // Se a diferença for menor que 2 segundos e forem do assistente
                        // Forçamos o Texto a vir ANTES do Áudio
                        if (Math.abs(timeA - timeB) < 2000 && a.role === "assistant" && b.role === "assistant") {
                            const typeA = a.content_type || "text";
                            const typeB = b.content_type || "text";

                            if (typeA === "text" && typeB === "audio") return -1;
                            if (typeA === "audio" && typeB === "text") return 1;
                        }

                        return timeA - timeB;
                    });

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

    const pendingAudioRef = useRef(null);

    // Send message
    const handleSend = useCallback(
        async (text, file) => {
            if (!phone) return;

            // Limpar citação imediatamente para evitar delay visual (UX)
            const currentReplyId = replyingTo?.id;
            setReplyingTo(null);
            if (chatInputRef.current) {
                // Remove focus to prevent keyboard popping up again if on mobile, 
                // or keep it? User wants "ready", but immediate clear is key.
                // Keeping focus logic in handleReply is enough.
            }

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
                parent_id: currentReplyId || null, // Vínculo com a mensagem pai
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            setStreamingText("");
            pendingAudioRef.current = null; // Reset pending audio

            try {
                const response = await sendMessage(phone, text, file, currentReplyId);

                // Stream the response
                setReplyingTo(null);

                let accumulated = "";
                let isDone = false;
                let wasTextCommitted = false; // Flag para evitar duplicação entre onTextDone e onDone

                await streamResponse(
                    response,
                    // onChunk
                    (chunk) => {
                        if (wasTextCommitted) return; // Ignora se já finalizou o texto
                        accumulated += chunk;
                        setStreamingText(cleanMarkers(accumulated));
                        setIsTyping(false);
                    },
                    // onDone
                    () => {
                        isDone = true;
                        const cleanContent = cleanMarkers(accumulated);

                        setMessages((prev) => {
                            let newMessages = [...prev];

                            // Só adiciona se o texto ainda não foi commitado pelo onTextDone
                            if (cleanContent.trim() && !wasTextCommitted) {
                                newMessages.push({
                                    id: `ai-${Date.now()}`,
                                    phone_number: phone,
                                    role: "assistant",
                                    content: cleanContent,
                                    content_type: "text",
                                    created_at: new Date().toISOString(),
                                });
                                wasTextCommitted = true;
                            }

                            // Se houver áudio pendente, adiciona
                            if (pendingAudioRef.current) {
                                newMessages.push({
                                    id: `ai-audio-${Date.now()}`,
                                    phone_number: phone,
                                    role: "assistant",
                                    content: "Áudio do Mentor",
                                    content_type: "audio",
                                    file_url: pendingAudioRef.current,
                                    created_at: new Date().toISOString(),
                                });
                                pendingAudioRef.current = null;
                            }

                            return newMessages;
                        });
                        setStreamingText("");
                        setAudioStatus("");
                    },
                    // onError
                    (error) => {
                        console.warn("Erro no streaming (tratado):", error);
                        const errorMessage = getFriendlyErrorMessage(error);

                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `error-${Date.now()}`,
                                phone_number: phone,
                                role: "assistant",
                                content: errorMessage,
                                content_type: "text",
                                created_at: new Date().toISOString(),
                            },
                        ]);
                        setStreamingText("");
                        setIsTyping(false);
                        setAudioStatus("");
                    },
                    // onOnboardingComplete — recarregar perfil
                    async (level) => {
                        try {
                            const refreshed = await getProfile(phone);
                            if (refreshed) setProfile(refreshed);
                            if (level) {
                                confetti({
                                    particleCount: 150,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ['#00D26A', '#FFD700', '#FFFFFF']
                                });
                            }
                        } catch (err) {
                            console.error("Erro update profile", err);
                        }
                    },
                    // onFinanceUpdated — recarregar sidebar
                    () => {
                        // Pequeno delay para garantir que o banco processou a inserção
                        setTimeout(() => {
                            setFinanceKey((k) => k + 1);
                        }, 500);
                    },
                    // onAgentAudio
                    (audioBase64) => {
                        pendingAudioRef.current = audioBase64;
                        setAudioStatus(""); // Áudio pronto
                    },
                    // onStatus
                    (status) => {
                        if (status === "generating_audio") {
                            setAudioStatus("generating");
                        }
                    },
                    // onTextDone
                    () => {
                        const cleanContent = cleanMarkers(accumulated);
                        if (cleanContent.trim() && !wasTextCommitted) {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    id: `ai-${Date.now()}`,
                                    phone_number: phone,
                                    role: "assistant",
                                    content: cleanContent,
                                    content_type: "text",
                                    created_at: new Date().toISOString(),
                                }
                            ]);
                            wasTextCommitted = true;
                        }
                        setStreamingText("");
                        accumulated = ""; // Limpa buffer
                    },
                    // onProfileUpdated
                    async () => {
                        try {
                            const refreshed = await getProfile(phone);
                            if (refreshed) setProfile(refreshed);
                        } catch (err) {
                            console.error("Erro refresh profile", err);
                        }
                    }
                );

                // Safety net: if stream ended but content was never finalized
                if (!isDone && accumulated.trim() && !wasTextCommitted) {
                    const cleanContent = cleanMarkers(accumulated);
                    if (cleanContent.trim()) {
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `ai-safe-${Date.now()}`,
                                phone_number: phone,
                                role: "assistant",
                                content: cleanContent,
                                content_type: "text",
                                created_at: new Date().toISOString(),
                            }
                        ]);
                        wasTextCommitted = true;
                    }
                }
                setStreamingText("");
                setIsTyping(false);
            } catch (err) {
                console.error("Erro ao enviar:", err);
                const errorMessage = getFriendlyErrorMessage(err);

                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        phone_number: phone,
                        role: "assistant",
                        content: errorMessage,
                        content_type: "text",
                        created_at: new Date().toISOString(),
                    },
                ]);
                setIsTyping(false);
            }
        },
        [phone, replyingTo]
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
                <img src="/logo3.svg" alt="Meu MEI" className="loading-app-logo" />
                <div className="success-animation">
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                        <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                    <div className="confetti-container">
                        {[...Array(12)].map((_, i) => (
                            <span key={i} className={`confetti-piece c-${i}`}></span>
                        ))}
                    </div>
                </div>
                <p className="loading-text">
                    Tudo pronto para o seu sucesso!<br />
                    <small style={{ color: "var(--text-muted)" }}>
                        Carregando o Meu MEI...
                    </small>
                    <img
                        src="https://flagcdn.com/w160/br.png"
                        alt="Brasil"
                        style={{
                            width: '42px',
                            height: 'auto',
                            display: 'block',
                            margin: '16px auto 0',
                            opacity: 0.9,
                            borderRadius: '4px'
                        }}
                    />
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
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="chat-area">
                {/* Chat Header */}
                <div className="chat-header">
                    <button
                        className="chat-header-menu-btn"
                        onClick={() => setIsSidebarOpen(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            padding: '10px',
                            marginRight: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="chat-header-avatar" style={{
                        width: '32px', height: '32px',
                        backgroundColor: '#CC0000', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <img src="/logo.svg" alt="MeuMEI" style={{
                            width: '20px', height: '20px',
                            objectFit: 'contain'
                        }} />
                    </div>
                    <div className="chat-header-info" style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px' }}>
                        <h2 style={{ fontSize: '16px', margin: 0, fontWeight: '700' }}>Meu MEI</h2>
                        <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>
                            {isTyping || streamingText ? "digitando..." : "online"}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <MessageList
                    messages={messages}
                    isTyping={isTyping}
                    streamingText={streamingText}
                    onReply={handleReply}
                    messagesMap={messagesMap}
                    audioStatus={audioStatus}
                />

                {/* Preview de Resposta (Estilo Zap) */}
                {replyingTo && (
                    <div className="reply-preview-container">
                        <div className="reply-preview-card">
                            <div className="reply-preview-sidebar" />
                            <div className="reply-preview-content">
                                <div className="reply-preview-author" style={{ color: replyingTo.role === "assistant" ? "var(--red-primary)" : "var(--green)" }}>
                                    {replyingTo.role === "assistant" ? "Meu MEI" : "Você"}
                                </div>
                                <div className="reply-preview-text">
                                    {replyingTo.content_type === "audio" ? "🎤 Áudio" :
                                        replyingTo.content_type === "image" ? "📷 Imagem" :
                                            replyingTo.content_type === "pdf" ? "📄 Documento" :
                                                replyingTo.content}
                                </div>
                            </div>
                            <button className="reply-preview-close" onClick={() => setReplyingTo(null)}>
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Input */}
                <ChatInput
                    ref={chatInputRef}
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
