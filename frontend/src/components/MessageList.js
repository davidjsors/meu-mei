"use client";

import { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";

/**
 * MessageList — Lista de mensagens com scroll automático.
 * Renderiza bolhas de chat e indicador de digitação.
 */
export default function MessageList({ messages, isTyping = false, streamingText = "", onReply, messagesMap, audioStatus }) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText, isTyping]);

    return (
        <div className="messages-container">
            {messages.length === 0 && (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    gap: 12,
                    opacity: 0.5,
                }}>
                    <span style={{ fontSize: 48 }}>💬</span>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        Envie uma mensagem para começar!
                    </p>
                </div>
            )}

            {messages.map((msg, i) => (
                <ChatBubble
                    key={msg.id || i}
                    message={msg}
                    onReply={onReply}
                    messagesMap={messagesMap}
                />
            ))}

            {/* Streaming response (being typed) */}
            {streamingText.trim() && (
                <div className="message-wrapper assistant">
                    <div className="message-bubble">
                        <div dangerouslySetInnerHTML={{ __html: streamingText.trim().replace(/\n/g, "<br/>") }} />
                        <span className="typing-cursor" style={{
                            display: "inline-block",
                            width: 2,
                            height: "1em",
                            background: "var(--text-secondary)",
                            marginLeft: 2,
                            animation: "blink 1s step-end infinite",
                        }} />
                    </div>
                </div>
            )}

            {/* Audio Recording Indicator */}
            {audioStatus === "generating" && !streamingText && (
                <div className="message-wrapper assistant">
                    <div className="message-bubble" style={{
                        fontStyle: 'italic',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--red-light)'
                    }}>
                        <span>🎤</span> Gravando áudio...
                    </div>
                </div>
            )}

            {/* Typing indicator */}
            {isTyping && !streamingText && (
                <div className="message-wrapper assistant">
                    <div className="message-bubble">
                        <div className="typing-indicator">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                        </div>
                    </div>
                </div>
            )}

            <div ref={endRef} />

            <style jsx>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
        </div>
    );
}
