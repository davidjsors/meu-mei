import { Image, Music, FileText, Paperclip, X } from "lucide-react";

/**
 * FilePreview — Preview de arquivo antes de enviar.
 * Mostra ícone, nome e tamanho, com botão para remover.
 */
export default function FilePreview({ file, onRemove }) {
    if (!file) return null;

    const getIcon = (type) => {
        if (type.startsWith("image/")) return <Image size={24} />;
        if (type.startsWith("audio/")) return <Music size={24} />;
        if (type === "application/pdf") return <FileText size={24} />;
        return <Paperclip size={24} />;
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
                <X size={18} />
            </button>
        </div>
    );
}
