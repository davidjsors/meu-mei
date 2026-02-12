"use client";

/**
 * ChatBubble — Bolha de mensagem estilo WhatsApp.
 * Suporta texto (com formatação markdown básica), imagem, áudio e PDF.
 */

function formatMarkdown(text) {
    if (!text) return "";

    // Processar linhas
    let html = text
        // Escapar HTML
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Bold: **texto** ou __texto__
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Italic: *texto* ou _texto_
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
        // Emoji bullet points (manter)
        // Listas com - ou •
        .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
        // Listas numeradas
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        // Quebras de linha
        .replace(/\n/g, "<br>");

    // Agrupar <li> consecutivos em <ul>
    html = html.replace(/((?:<li>.*?<\/li><br>?)+)/g, (match) => {
        const items = match.replace(/<br>/g, "");
        return `<ul>${items}</ul>`;
    });

    return html;
}

export default function ChatBubble({ message }) {
    const { role, content, content_type, file_url, file_name, created_at } = message;

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

                {/* Áudio sem URL — mostrar label amigável */}
                {content_type === "audio" && !file_url && (
                    <span className="message-text">🎤 Áudio enviado</span>
                )}

                {/* Texto com formatação — esconder placeholders de arquivo */}
                {content && content_type === "text" && (
                    <span
                        className="message-text"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
                    />
                )}
            </div>
            {time && <span className="message-time">{time}</span>}
        </div>
    );
}
