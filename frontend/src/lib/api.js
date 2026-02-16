/**
 * API wrapper para comunicação com o backend FastAPI.
 * Usa o proxy do Next.js (/api → backend).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Envia mensagem de texto (e opcionalmente um arquivo) ao chat.
 * Retorna um ReadableStream para SSE.
 */
export async function sendMessage(phoneNumber, message, file = null, parentId = null) {
    const formData = new FormData();
    formData.append("phone_number", phoneNumber);
    formData.append("message", message);

    if (file) {
        formData.append("file", file);
    }

    if (parentId) {
        formData.append("parent_id", parentId);
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
 * Lê SSE stream e chama callbacks para cada evento.
 * Agora parseia tanto o 'event:' quanto o 'data:' lines do SSE.
 */
export async function streamResponse(response, onChunk, onDone, onError, onOnboardingComplete, onFinanceUpdated, onAgentAudio, onStatus, onTextDone) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "message";

    const processLine = (line) => {
        if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
            try {
                const data = JSON.parse(line.slice(6));

                if (currentEvent === "message" && data.text) {
                    onChunk(data.text);
                }
                if (currentEvent === "done" && data.complete) {
                    onDone?.();
                }
                if (currentEvent === "error" && data.error) {
                    onError?.(data.error);
                }
                if (currentEvent === "onboarding_complete" && data.level) {
                    onOnboardingComplete?.(data.level);
                }
                if (currentEvent === "finance_updated") {
                    onFinanceUpdated?.();
                }
                if (currentEvent === "agent_audio" && data.audio) {
                    onAgentAudio?.(data.audio);
                }
                if (currentEvent === "status" && data.status) {
                    onStatus?.(data.status); // Passa status para callback
                }
                if (currentEvent === "text_done") {
                    onTextDone?.();
                }
            } catch {
                // ignore parse errors
            }
            currentEvent = "message";
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                processLine(line);
            }
        }

        // Flush remaining buffer after stream ends
        if (buffer.trim()) {
            const remaining = buffer.split("\n");
            for (const line of remaining) {
                processLine(line);
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
 * Busca perfil do usuário.
 */
export async function getProfile(phoneNumber) {
    const resp = await fetch(`${API_BASE}/api/user/profile/${phoneNumber}`);
    if (!resp.ok) return null;
    return resp.json();
}

// --- Authentication ---

export async function socialLogin(phoneNumber, provider, token, socialId, name) {
    const resp = await fetch(`${API_BASE}/api/auth/social-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, provider, token, social_id: socialId, name })
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Erro no login social");
    }
    return resp.json();
}

export async function setPin(phoneNumber, pin) {
    const resp = await fetch(`${API_BASE}/api/auth/set-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, pin })
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Erro ao definir PIN");
    }
    return resp.json();
}

export async function loginPin(phoneNumber, pin) {
    const resp = await fetch(`${API_BASE}/api/auth/login-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, pin })
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "PIN incorreto ou erro de login");
    }
    return resp.json();
}

export async function checkRecovery(phoneNumber, socialId, provider, token) {
    const resp = await fetch(`${API_BASE}/api/auth/recover-pin-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, provider, token, social_id: socialId })
    });
    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Conta social não corresponde");
    }
    return resp.json();
}
