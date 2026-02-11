"use client";

import { useState, useRef } from "react";
import FilePreview from "./FilePreview";

/**
 * ChatInput — Barra de input estilo WhatsApp.
 * Suporta texto + upload de arquivos (imagem, áudio, PDF).
 */
export default function ChatInput({ onSend, disabled = false }) {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const handleSubmit = () => {
        if ((!text.trim() && !file) || disabled) return;
        onSend(text.trim(), file);
        setText("");
        setFile(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
        // Auto-resize textarea
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
        }
        e.target.value = "";
    };

    return (
        <div className="chat-input-area">
            <FilePreview file={file} onRemove={() => setFile(null)} />

            <div className="chat-input-wrapper">
                <div className="input-actions">
                    <button
                        className="action-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Anexar arquivo"
                    >
                        📎
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,audio/*,.pdf"
                            onChange={handleFileSelect}
                        />
                    </button>
                </div>

                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder="Digite uma mensagem..."
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={disabled}
                />

                <button
                    className="send-btn"
                    onClick={handleSubmit}
                    disabled={disabled || (!text.trim() && !file)}
                    title="Enviar"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
