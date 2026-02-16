
/**
 * Regex para detectar marcadores internos do sistema.
 */
const AUDIO_MARKER_RE = /\[AUDIO\][\s\S]*?\[\/AUDIO\]/gi;
const TRANSACTION_MARKER_RE = /\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]/gi;
const ONBOARDING_MARKER_RE = /\[ONBOARDING_COMPLETE\][\s\S]*?\[\/ONBOARDING_COMPLETE\]/gi;
const DELETE_MARKER_RE = /\[DELETE_TRANSACTION\][\s\S]*?\[\/DELETE_TRANSACTION\]/gi;
const RESET_MARKER_RE = /\[RESET_FINANCE.*?\]/gi;
const CONTEXT_MARKER_RE = /\[CONTEXTO\]/gi;

/**
 * Limpa marcadores técnicos da resposta exibida ao usuário final.
 */
export const cleanMarkers = (text) => {
    if (!text) return "";
    let cleaned = text
        .replace(AUDIO_MARKER_RE, "")
        .replace(TRANSACTION_MARKER_RE, "")
        .replace(ONBOARDING_MARKER_RE, "")
        .replace(DELETE_MARKER_RE, "")
        .replace(RESET_MARKER_RE, "")
        .replace(CONTEXT_MARKER_RE, "");

    // Limpeza de espaços e quebras múltiplas
    return cleaned
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+|\s+$/g, "")
        .trim();
};

/**
 * Dicionário de Erros amigáveis.
 */
export const ERROR_DICTIONARY = {
    QUOTA: "Ops! Estamos conversando tão rápido que meu sistema pediu 1 minutinho para respirar. 😅 Tente novamente em alguns segundos!",
    AUTH: "Parece que há um problema com a minha chave de acesso (API Key). Por favor, verifique as configurações do sistema! 🔑",
    MODEL: "Estou tentando usar um modelo de inteligência que parece estar indisponível ou em manutenção agora. 🛠️",
    CONNECTION: "Hmm, não consegui me conectar ao servidor. Verifique sua internet ou tente novamente em instantes. 🌐",
    GENERIC: "Tive um probleminha técnico aqui, mas não se preocupe: recebi sua mensagem e vou processá-la assim que meu sistema estabilizar! 😊"
};

/**
 * Mapeia erros técnicos para mensagens amigáveis.
 */
export const getFriendlyErrorMessage = (error) => {
    if (!error) return ERROR_DICTIONARY.GENERIC;
    const errorStr = (typeof error === 'string' ? error : error.message || "").toLowerCase();

    if (errorStr.includes("429") || errorStr.includes("quota")) return ERROR_DICTIONARY.QUOTA;
    if (errorStr.includes("400") || errorStr.includes("invalid_argument") || errorStr.includes("api key")) return ERROR_DICTIONARY.AUTH;
    if (errorStr.includes("404") || errorStr.includes("model not found")) return ERROR_DICTIONARY.MODEL;
    if (errorStr.includes("fetch") || errorStr.includes("network") || errorStr.includes("failed to connect")) return ERROR_DICTIONARY.CONNECTION;

    return ERROR_DICTIONARY.GENERIC;
};

/**
 * Formata valores monetários no padrão brasileiro.
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};
