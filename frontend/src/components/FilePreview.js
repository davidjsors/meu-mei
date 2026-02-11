"use client";

/**
 * FilePreview — Preview de arquivo antes de enviar.
 * Mostra ícone, nome e tamanho, com botão para remover.
 */
export default function FilePreview({ file, onRemove }) {
    if (!file) return null;

    const getIcon = (type) => {
        if (type.startsWith("image/")) return "🖼️";
        if (type.startsWith("audio/")) return "🎵";
        if (type === "application/pdf") return "📄";
        return "📎";
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="file-preview-bar">
            <span className="file-icon">{getIcon(file.type)}</span>
            <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatSize(file.size)}</div>
            </div>
            <button className="remove-file" onClick={onRemove} title="Remover arquivo">
                ✕
            </button>
        </div>
    );
}
