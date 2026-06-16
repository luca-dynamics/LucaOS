function normalizeMiniChatMessagePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
    }
    return { ...payload };
}

module.exports = { normalizeMiniChatMessagePayload };
