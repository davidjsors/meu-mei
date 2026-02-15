"use client";

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Paperclip, Mic, SendHorizontal, X } from "lucide-react";
import FilePreview from "./FilePreview";

/**
 * ChatInput — Barra de input estilo WhatsApp.
 * Suporta texto + upload de arquivos (imagem, áudio, PDF) + gravação de áudio.
 * Áudio é enviado automaticamente ao parar a gravação (estilo WhatsApp).
 */
const ChatInput = forwardRef(({ onSend, disabled = false }, ref) => {
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const cancelledRef = useRef(false);

    useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        }
    }));

    const handleSubmit = useCallback(() => {
        if ((!text.trim() && !file) || disabled) return;
        onSend(text.trim(), file);
        setText("");
        setFile(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [text, file, disabled, onSend]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
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

    // ─── Gravação de áudio ───
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Detectar mimeType suportado
            let mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported("audio/webm")) {
                if (MediaRecorder.isTypeSupported("audio/mp4")) {
                    mimeType = "audio/mp4";
                } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
                    mimeType = "audio/ogg";
                } else {
                    // Deixar o browser decidir
                    mimeType = "";
                }
            }

            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);

            chunksRef.current = [];
            cancelledRef.current = false;
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Parar todas as tracks do microfone
                stream.getTracks().forEach((t) => t.stop());

                // Se foi cancelado, não enviar
                if (cancelledRef.current) {
                    chunksRef.current = [];
                    return;
                }

                // Criar arquivo e enviar automaticamente
                if (chunksRef.current.length > 0) {
                    const actualMime = mediaRecorder.mimeType || "audio/webm";
                    const blob = new Blob(chunksRef.current, { type: actualMime });
                    const ext = actualMime.includes("webm")
                        ? "webm"
                        : actualMime.includes("mp4")
                            ? "mp4"
                            : "ogg";
                    const audioFile = new File(
                        [blob],
                        `audio_${Date.now()}.${ext}`,
                        { type: actualMime }
                    );

                    // Enviar direto (WhatsApp-style)
                    onSend("", audioFile);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            alert(
                "Não foi possível acessar o microfone. Verifique as permissões do navegador."
            );
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            cancelledRef.current = false;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            cancelledRef.current = true;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            chunksRef.current = [];
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="chat-input-area" id="tour-chat-input">
            <FilePreview file={file} onRemove={() => setFile(null)} />

            <div className="chat-input-wrapper">
                {isRecording ? (
                    /* ─── Modo gravação ─── */
                    <div className="recording-bar">
                        <button
                            className="action-btn recording-cancel"
                            onClick={cancelRecording}
                            title="Cancelar"
                        >
                            <X size={20} />
                        </button>
                        <div className="recording-indicator">
                            <span className="recording-dot"></span>
                            <span className="recording-time">
                                {formatTime(recordingTime)}
                            </span>
                        </div>
                        <button
                            className="send-btn"
                            onClick={stopRecording}
                            title="Enviar áudio"
                        >
                            <SendHorizontal size={20} />
                        </button>
                    </div>
                ) : (
                    /* ─── Modo normal ─── */
                    <>
                        <div className="input-actions">
                            <button
                                className="action-btn"
                                onClick={() => fileInputRef.current?.click()}
                                title="Anexar arquivo"
                            >
                                <Paperclip size={22} />
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

                        {text.trim() || file ? (
                            <button
                                className="send-btn"
                                onClick={handleSubmit}
                                disabled={disabled}
                                title="Enviar"
                            >
                                <SendHorizontal size={20} />
                            </button>
                        ) : (
                            <button
                                className="send-btn mic-btn"
                                onClick={startRecording}
                                disabled={disabled}
                                title="Gravar áudio"
                            >
                                <Mic size={20} />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export default ChatInput;
