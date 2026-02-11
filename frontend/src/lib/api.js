/**
 * API wrapper para comunicação com o backend FastAPI.
 * Usa o proxy do Next.js (/api → backend).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Envia mensagem de texto (e opcionalmente um arquivo) ao chat.
 * Retorna um ReadableStream para SSE.
 */
export async function sendMessage(phoneNumber, message, file = null) {
    const formData = new FormData();
    formData.append("phone_number", phoneNumber);
    formData.append("message", message);

    if (file) {
        formData.append("file", file);
    }

    const response = await fetch(`${API_BASE}/api/chat/send`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Erro ao enviar mensagem");
    }

    return response;
}

/**
 * Lê SSE stream e chama callback para cada chunk de texto.
 */
export async function streamResponse(response, onChunk, onDone, onError) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) {
                            onChunk(data.text);
                        }
                        if (data.complete) {
                            onDone?.();
                        }
                        if (data.error) {
                            onError?.(data.error);
                        }
                    } catch {
                        // ignore parse errors
                    }
                }
            }
        }
    } catch (err) {
        onError?.(err.message);
    }
}

/**
 * Busca histórico de mensagens.
 */
export async function getHistory(phoneNumber, limit = 50) {
    const resp = await fetch(
        `${API_BASE}/api/chat/history/${phoneNumber}?limit=${limit}`
    );
    if (!resp.ok) throw new Error("Erro ao buscar histórico");
    const data = await resp.json();
    return data.messages;
}

/**
 * Envia respostas do IAMF-MEI.
 */
export async function submitMaturity(payload) {
    const resp = await fetch(`${API_BASE}/api/user/maturity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        throw new Error(error.detail || "Erro ao salvar perfil");
    }
    return resp.json();
}

/**
 * Busca perfil do usuário.
 */
export async function getProfile(phoneNumber) {
    const resp = await fetch(`${API_BASE}/api/user/profile/${phoneNumber}`);
    if (!resp.ok) return null;
    return resp.json();
}
