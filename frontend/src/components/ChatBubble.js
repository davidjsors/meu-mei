"use client";

/**
 * ChatBubble — Bolha de mensagem estilo WhatsApp.
 * Suporta texto, imagem, áudio e PDF.
 */
export default function ChatBubble({ message }) {
    const { role, content, content_type, file_url, file_name, created_at } = message;
    const isUser = role === "user";

    const time = created_at
        ? new Date(created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";

    return (
        <div className={`message-wrapper ${role}`}>
            <div className="message-bubble">
                {/* Imagem */}
                {content_type === "image" && file_url && (
                    <a href={file_url} target="_blank" rel="noopener noreferrer">
                        <img src={file_url} alt={file_name || "Imagem"} className="message-image" />
                    </a>
                )}

                {/* Áudio */}
                {content_type === "audio" && file_url && (
                    <audio controls className="message-audio">
                        <source src={file_url} />
                        Seu navegador não suporta áudio.
                    </audio>
                )}

                {/* PDF / Arquivo */}
                {content_type === "pdf" && file_url && (
                    <a href={file_url} target="_blank" rel="noopener noreferrer" className="message-file">
                        <span className="message-file-icon">📄</span>
                        <div className="message-file-info">
                            <div className="message-file-name">{file_name || "Documento"}</div>
                            <div className="message-file-type">PDF</div>
                        </div>
                    </a>
                )}

                {/* Texto */}
                {content && <span>{content}</span>}
            </div>
            {time && <span className="message-time">{time}</span>}
        </div>
    );
}
