function normalizeMiniChatMessagePayload(payload) {
    if (typeof payload === 'string') {
        return { text: payload };
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
    }
    return { ...payload };
}

module.exports = { normalizeMiniChatMessagePayload };
