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

function cleanMarkers(text) {
    if (!text) return "";
    const cleaned = text
        .replace(ONBOARDING_MARKER_RE, "")
        .replace(TRANSACTION_MARKER_RE, "")
        .replace(DELETE_MARKER_RE, "")
        .replace(RESET_MARKER_RE, "")
        .replace(AUDIO_MARKER_RE, "");

    // Colapsar múltiplas quebras de linha (evita grandes buracos no texto)
    return cleaned.replace(/\n{3,}/g, "\n\n").trim();
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
    const [replyingTo, setReplyingTo] = useState(null); // Mensagem sendo respondida (Estilo Zap)
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

                        setMessages((prev) => {
                            const newMessages = [
                                ...prev,
                                {
                                    id: `ai-${Date.now()}`,
                                    phone_number: phone,
                                    role: "assistant",
                                    content: cleanContent,
                                    content_type: "text",
                                    created_at: new Date().toISOString(),
                                }
                            ];

                            // Se houver áudio pendente, adiciona APÓS o texto
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
                                content: "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊",
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
                        // Pequeno delay para garantir que o banco processou a inserção
                        setTimeout(() => {
                            setFinanceKey((k) => k + 1);
                        }, 500);
                    },
                    // onAgentAudio — agora apenas enfileira para exibir DEPOIS do texto
                    (audioBase64) => {
                        pendingAudioRef.current = audioBase64;
                    }
                );

                // Safety net: if stream ended but onDone never fired, finalize the message
                if (!isDone && accumulated) {
                    const cleanContent = cleanMarkers(accumulated);
                    setMessages((prev) => {
                        const newMessages = [
                            ...prev,
                            {
                                id: `ai-${Date.now()}`,
                                phone_number: phone,
                                role: "assistant",
                                content: cleanContent,
                                content_type: "text",
                                created_at: new Date().toISOString(),
                            },
                        ];
                        // Check for pending audio in safety net too
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
                }
            } catch (err) {
                console.error("Erro ao enviar:", err);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        phone_number: phone,
                        role: "assistant",
                        content: "Hmm, não consegui me conectar ao servidor. Verifique a conexão e tente novamente.",
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
