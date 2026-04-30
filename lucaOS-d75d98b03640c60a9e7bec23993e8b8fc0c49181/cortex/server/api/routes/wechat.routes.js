import express from 'express';
import { wechatService } from '../../services/wechatService.js';

const router = express.Router();

// Helper: Resolve contact name to WeChat ID
async function resolveContact(nameOrId) {
    const client = wechatService.getClient();
    if (!client) return null;

    try {
        // If it looks like a WeChat ID, return it directly
        if (nameOrId.startsWith('wxid_') || nameOrId.includes('@chatroom')) {
            return nameOrId;
        }

        // Search contacts by name
        const contacts = await client.getContacts();
        const match = contacts.find(c =>
            (c.name && c.name.toLowerCase().includes(nameOrId.toLowerCase())) ||
            (c.alias && c.alias.toLowerCase().includes(nameOrId.toLowerCase())) ||
            (c.remarkName && c.remarkName.toLowerCase().includes(nameOrId.toLowerCase()))
        );

        return match ? match.id : null;
    } catch (e) {
        console.error('[WECHAT] Contact resolution failed:', e);
        return null;
    }
}

// --- STATUS & CONTROL ---

router.post('/start', async (req, res) => {
    try {
        await wechatService.initialize();
        res.json(wechatService.getStatus());
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/status', (req, res) => {
    const status = wechatService.getStatus();
    const uptime = status.startTime > 0 ? Date.now() - status.startTime : 0;
    res.json({ ...status, uptime });
});

router.post('/logout', async (req, res) => {
    const client = wechatService.getClient();
    if (client) {
        try {
            await client.logout();
            res.json({ success: true });
        } catch (e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: false, error: "Client not active" });
    }
});

// --- MESSAGING ---

router.get('/chats', async (req, res) => {
    await wechatService.ensureInitialized();
    const client = wechatService.getClient();
    const status = wechatService.getStatus();
    
    if (!client || (status.status !== 'READY' && status.status !== 'AUTHENTICATED')) {
        return res.json({ chats: [] });
    }

    try {
        const chats = await client.getChats();
        const formatted = chats.map(c => ({
            id: c.id,
            name: c.name || c.alias || c.remarkName,
            isGroup: c.isGroup,
            timestamp: c.timestamp,
            unreadCount: c.unreadCount,
            lastMessage: c.lastMessage ? { content: c.lastMessage.content } : null
        })).slice(0, 20);
        res.json({ chats: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/contacts', async (req, res) => {
    const { query } = req.query;
    await wechatService.ensureInitialized();
    const client = wechatService.getClient();
    const status = wechatService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ contacts: [] });
    }

    try {
        let contacts = await client.getContacts();

        if (query) {
            const q = String(query).toLowerCase();
            contacts = contacts.filter(c =>
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.alias && c.alias.toLowerCase().includes(q)) ||
                (c.remarkName && c.remarkName.toLowerCase().includes(q)) ||
                (c.wechatId && c.wechatId.includes(q))
            );
        }

        const formatted = contacts.slice(0, 50).map(c => ({
            id: c.id,
            name: c.name || c.alias || c.remarkName || "Unknown",
            wechatId: c.wechatId,
            alias: c.alias,
            remarkName: c.remarkName,
            isGroup: c.isGroup
        }));

        res.json({ contacts: formatted });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/send', async (req, res) => {
    const { contactName, message, wechatId } = req.body;
    await wechatService.ensureInitialized();
    const client = wechatService.getClient();
    const status = wechatService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ success: false, error: "WeChat Luca Link Not Ready. Please scan QR code to login." });
    }

    try {
        let chatId;
        if (wechatId) {
            chatId = wechatId;
        } else if (contactName) {
            chatId = await resolveContact(contactName);
        }

        if (!chatId) {
            return res.json({ success: false, error: `Contact '${contactName}' not found.` });
        }

        await client.sendMessage(chatId, message);
        res.json({ success: true, to: chatId });
    } catch (e) {
        console.error("[WECHAT] Send Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/send-image', async (req, res) => {
    const { contactName, caption, image } = req.body;
    await wechatService.ensureInitialized();
    const client = wechatService.getClient();
    const status = wechatService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ success: false, error: "WeChat Luca Link Not Ready." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ success: false, error: `Contact '${contactName}' not found.` });

        await client.sendImage(chatId, image, caption);
        res.json({ success: true, to: chatId });
    } catch (e) {
        console.error("[WECHAT] Image Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/chat-history', async (req, res) => {
    const { contactName, limit } = req.body;
    await wechatService.ensureInitialized();
    const client = wechatService.getClient();
    const status = wechatService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ error: "WeChat Luca Link Not Ready." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ error: `Contact '${contactName}' not found.` });

        const chat = await client.getChatById(chatId);
        const searchLimit = limit || 10;
        const messages = await chat.fetchMessages({ limit: searchLimit });

        const formatted = messages.map(m => ({
            id: m.id,
            content: m.content,
            fromMe: m.fromMe,
            timestamp: m.timestamp,
            type: m.type,
            sender: m.sender
        }));

        res.json({ messages: formatted });
    } catch (e) {
        console.error("[WECHAT] History Error", e);
        res.json({ error: e.message });
    }
});

// --- INTELLIGENCE TOOLS ---

router.post('/intel/profile', async (req, res) => {
    const { contactName } = req.body;
    const client = wechatService.getClient();
    if (!client) return res.json({ error: "Luca Link Offline" });

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ error: "Target not found." });

        const contact = await client.getContactById(chatId);
        const avatar = await contact.getAvatar();

        res.json({
            success: true,
            id: contact.id,
            name: contact.name || contact.alias || contact.remarkName,
            wechatId: contact.wechatId,
            alias: contact.alias,
            remarkName: contact.remarkName,
            signature: contact.signature || "No signature",
            avatar: avatar || null,
            province: contact.province,
            city: contact.city,
            gender: contact.gender
        });
    } catch (e) {
        res.status(500).json({ error: `Intel Gathering Failed: ${e.message}` });
    }
});

router.post('/intel/group-members', async (req, res) => {
    const { groupName } = req.body;
    const client = wechatService.getClient();

    try {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name.toLowerCase().includes(groupName.toLowerCase()));

        if (!group) return res.json({ error: "Group not found." });

        const members = [];
        for (const m of group.members) {
            const contact = await client.getContactById(m.id);
            members.push({
                id: m.id,
                name: contact.name || contact.alias || contact.remarkName || "Unknown",
                wechatId: contact.wechatId,
                isOwner: m.isOwner,
                isAdmin: m.isAdmin
            });
        }

        res.json({
            success: true,
            groupName: group.name,
            groupId: group.id,
            memberCount: members.length,
            members: members
        });
    } catch (e) {
        res.status(500).json({ error: `Group Scrape Failed: ${e.message}` });
    }
});

router.post('/moments/post', async (req, res) => {
    const { content, images } = req.body;
    const client = wechatService.getClient();

    try {
        await client.postMoment(content, images);
        res.json({ success: true, message: "Moment posted successfully" });
    } catch (e) {
        res.status(500).json({ error: `Failed to post moment: ${e.message}` });
    }
});

router.get('/moments/timeline', async (req, res) => {
    const { limit } = req.query;
    const client = wechatService.getClient();

    try {
        const moments = await client.getMoments(limit || 10);
        res.json({ success: true, moments });
    } catch (e) {
        res.status(500).json({ error: `Failed to fetch moments: ${e.message}` });
    }
});

export default router;
