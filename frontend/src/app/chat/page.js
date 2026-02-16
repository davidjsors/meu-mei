"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
const AUDIO_MARKER_RE = /\[AUDIO\][\s\S]*?\[\/AUDIO\]/gi;

const cleanMarkers = (text) => {
    if (!text) return "";
    let cleaned = text
        .replace(/\[AUDIO\][\s\S]*?\[\/AUDIO\]/gi, "")
        .replace(/\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]/gi, "")
        .replace(/\[ONBOARDING_COMPLETE\][\s\S]*?\[\/ONBOARDING_COMPLETE\]/gi, "")
        .replace(/\[DELETE_TRANSACTION\][\s\S]*?\[\/DELETE_TRANSACTION\]/gi, "")
        .replace(/\[RESET_FINANCE:.*?\]/gi, "")
        .replace(/\[CONTEXTO\]/gi, "");

    // Limpeza agressiva de espaços e quebras múltiplas
    return cleaned
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+|\s+$/g, "") // trim manual mais robusto
        .trim();
}

/**
 * Dicionário de Erros: Mapeia mensagens técnicas para mensagens amigáveis ao usuário.
 */
const ERROR_DICTIONARY = {
    QUOTA: "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns segundos!",
    AUTH: "Parece que há um problema com a minha chave de acesso (API Key). Por favor, verifique as configurações do sistema! 🔑",
    MODEL: "Estou tentando usar um modelo de inteligência que parece estar indisponível ou em manutenção agora. 🛠️",
    CONNECTION: "Hmm, não consegui me conectar ao servidor. Verifique sua internet ou tente novamente em instantes. 🌐",
    GENERIC: "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊"
};

const getFriendlyErrorMessage = (error) => {
    if (!error) return ERROR_DICTIONARY.GENERIC;
    const errorStr = (typeof error === 'string' ? error : error.message || "").toLowerCase();

    if (errorStr.includes("429") || errorStr.includes("quota")) return ERROR_DICTIONARY.QUOTA;
    if (errorStr.includes("400") || errorStr.includes("invalid_argument") || errorStr.includes("api key")) return ERROR_DICTIONARY.AUTH;
    if (errorStr.includes("404") || errorStr.includes("model not found")) return ERROR_DICTIONARY.MODEL;
    if (errorStr.includes("fetch") || errorStr.includes("network") || errorStr.includes("failed to connect")) return ERROR_DICTIONARY.CONNECTION;

    return ERROR_DICTIONARY.GENERIC;
};

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
                    new Promise(resolve => setTimeout(resolve, 5000)) // Garante 5s de animação
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
                    // onTextDone (NOVO: Finaliza o texto antes do áudio)
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
