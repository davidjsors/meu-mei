"use client";

/**
 * ChatBubble — Bolha de mensagem estilo WhatsApp.
 * Suporta texto (com formatação markdown básica), imagem, áudio e PDF.
 */

function formatMarkdown(text) {
    if (!text) return "";

    // Trim inicial para remover lixo de formatação
    let trimmedText = text.trim();

    // Processar linhas
    let html = trimmedText
        // Escapar HTML
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Bold: **texto** ou __texto__
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Italic: *texto* ou _texto_
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
        // Links: [Texto](URL)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--blue-primary); text-decoration: underline;">$1</a>')
        // Listas com - ou •
        .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
        // Listas numeradas
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        // Quebras de linha (evita duplicar se já houver listas)
        .replace(/\n/g, "<br>");

    // Agrupar <li> consecutivos em <ul>
    html = html.replace(/((?:<li>.*?<\/li><br>?)+)/g, (match) => {
        const items = match.replace(/<br>/g, "");
        return `<ul>${items}</ul>`;
    });

    // Limpeza final: remover <br> inúteis no fim gerados pela troca de \n
    return html.replace(/(<br>)+$/g, "");
}

export default function ChatBubble({ message, onReply, messagesMap = {} }) {
    const { id, role, content, content_type, file_url, file_name, created_at, parent_id } = message;

    const time = created_at
        ? new Date(created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";

    // Busca o conteúdo da mensagem pai (citação)
    const parentMsg = parent_id ? messagesMap[parent_id] : null;

    // Se não tiver conteúdo nenhum, nem arquivo, não renderiza a bolha
    if (!content && !file_url && content_type !== "audio") return null;

    return (
        <div className={`message-wrapper ${role}`}>
            <div className="message-container">
                <div className="message-bubble">
                    {/* Citação (Reply) */}
                    {parentMsg && (
                        <div className="message-quote">
                            <div className="quote-sidebar" />
                            <div className="quote-content">
                                <div className="quote-author" style={{ color: parentMsg.role === "assistant" ? "var(--red-primary)" : "inherit" }}>
                                    {parentMsg.role === "assistant" ? "Meu MEI" : "Você"}
                                </div>
                                <div className="quote-text">
                                    {parentMsg.content_type === "audio" ? "🎤 Áudio" :
                                        parentMsg.content_type === "image" ? "📷 Imagem" :
                                            parentMsg.content_type === "pdf" ? "📄 Documento" :
                                                parentMsg.content}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Imagem */}
                    {content_type === "image" && file_url && (
                        <a href={file_url} target="_blank" rel="noopener noreferrer">
                            <img src={file_url} alt={file_name || "Imagem"} className="message-image" />
                        </a>
                    )}

                    {/* Áudio */}
                    {content_type === "audio" && (
                        file_url ? (
                            <div className="audio-container" style={{ minWidth: "250px" }}>
                                <audio controls className="message-audio" src={file_url} style={{ width: "100%", display: "block" }}>
                                    Seu navegador não suporta áudio.
                                </audio>
                            </div>
                        ) : (
                            <div className="audio-container">
                                <span className="message-text">🎤 Áudio enviado</span>
                            </div>
                        )
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

                    {/* Texto com formatação */}
                    {content && (content_type === "text" || !content_type) && (
                        <span
                            className="message-text"
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
                        />
                    )}
                </div>

                {/* Botão de Resposta (Aparece ao passar o mouse ou foco) */}
                <button
                    className="message-reply-btn"
                    onClick={() => onReply?.(message)}
                    title="Responder"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
                    </svg>
                </button>
            </div>
            {time && <span className="message-time">{time}</span>}
        </div>
    );
}
