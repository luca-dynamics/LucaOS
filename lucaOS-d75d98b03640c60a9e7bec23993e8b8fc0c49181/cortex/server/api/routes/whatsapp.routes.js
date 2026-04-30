import express from 'express';
import { whatsappService } from '../../services/whatsappService.js';
import wwebjs from 'whatsapp-web.js';

const { MessageMedia } = wwebjs;
const router = express.Router();

// Helper: Resolve contact name to chat ID
async function resolveContact(nameOrNumber) {
    const client = whatsappService.getClient();
    if (!client) return null;

    try {
        // If it looks like a number, format it
        if (/^\d+$/.test(nameOrNumber)) {
            return nameOrNumber.includes('@c.us') ? nameOrNumber : `${nameOrNumber}@c.us`;
        }

        // Search contacts
        const contacts = await client.getContacts();
        const match = contacts.find(c =>
            (c.name && c.name.toLowerCase().includes(nameOrNumber.toLowerCase())) ||
            (c.pushname && c.pushname.toLowerCase().includes(nameOrNumber.toLowerCase()))
        );

        return match ? match.id._serialized : null;
    } catch (e) {
        console.error('[WHATSAPP] Contact resolution failed:', e);
        return null;
    }
}

// --- STATUS & CONTROL ---

router.post('/start', async (req, res) => {
    await whatsappService.initialize();
    res.json(whatsappService.getStatus());
});

router.get('/status', (req, res) => {
    const status = whatsappService.getStatus();
    const uptime = status.startTime > 0 ? Date.now() - status.startTime : 0;
    res.json({ ...status, uptime });
});

router.post('/logout', async (req, res) => {
    const client = whatsappService.getClient();
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
    try {
        const chats = await whatsappService.getChats();
        res.json({ chats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/contacts', async (req, res) => {
    try {
        const contacts = await whatsappService.getContacts();
        res.json({ contacts });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/send', async (req, res) => {
    const { contactName, message } = req.body;
    try {
        const success = await whatsappService.sendMessage(contactName, message);
        res.json({ success });
    } catch (e) {
        console.error("WhatsApp Send Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/send-image', async (req, res) => {
    const { contactName, caption, image } = req.body;
    await whatsappService.ensureInitialized();
    const client = whatsappService.getClient();
    const status = whatsappService.getStatus();

    if (!client || status.status !== 'READY') {
        return res.json({ success: false, error: "WhatsApp Luca Link Not Ready." });
    }

    try {
        const chatId = await resolveContact(contactName);
        if (!chatId) return res.json({ success: false, error: `Contact '${contactName}' not found.` });

        const media = new MessageMedia('image/jpeg', image, 'image.jpg');
        await client.sendMessage(chatId, media, { caption: caption || '' });
        res.json({ success: true, to: chatId });
    } catch (e) {
        console.error("WhatsApp Image Error", e);
        res.json({ success: false, error: e.message });
    }
});

router.post('/chat-history', async (req, res) => {
    const { contactName, limit } = req.body;
    try {
        const messages = await whatsappService.getHistory(contactName, limit);
        res.json({ messages });
    } catch (e) {
        console.error("WhatsApp History Error", e);
        res.json({ error: e.message });
    }
});

// --- INTELLIGENCE TOOLS ---

router.post('/analyze-target', async (req, res) => {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: "Target required" });

    try {
        const metadata = {
            name: target,
            about: await whatsappService.getAbout(target),
            profilePicUrl: await whatsappService.getProfilePicUrl(target)
        };

        const messages = await whatsappService.getHistory(target, 50);
        const historyText = messages.map(m => `[${m.fromMe ? 'ME' : 'TARGET'}]: ${m.body}`).join('\n');

        const analysis = `Target Analysis:\nMessage Count: ${messages.length}\nRecent Activity: ${messages.length > 0 ? 'Active' : 'Inactive'}\nHistory:\n${historyText.slice(0, 500)}...`;

        res.json({
            success: true,
            metadata,
            analysis,
            messageCount: messages.length
        });
    } catch (e) {
        console.error("[INTEL] Analysis failed", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/scrape-group', async (req, res) => {
    const { groupName } = req.body;
    if (!groupName) return res.status(400).json({ error: "Group Name required" });

    try {
        const members = await whatsappService.getGroupParticipants(groupName);
        res.json({
            success: true,
            groupName,
            memberCount: members.length,
            members
        });
    } catch (e) {
        console.error("[INTEL] Scrape failed", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/intel/profile', async (req, res) => {
    const { contactName } = req.body;
    try {
        res.json({
            success: true,
            name: contactName,
            about: await whatsappService.getAbout(contactName),
            picUrl: await whatsappService.getProfilePicUrl(contactName)
        });
    } catch (e) {
        res.status(500).json({ error: `Intel Gathering Failed: ${e.message}` });
    }
});

router.post('/intel/group-members', async (req, res) => {
    const { groupName } = req.body;
    try {
        const members = await whatsappService.getGroupParticipants(groupName);
        res.json({
            success: true,
            groupName,
            memberCount: members.length,
            members
        });
    } catch (e) {
        res.status(500).json({ error: `Group Scrape Failed: ${e.message}` });
    }
});

router.post('/intel/presence', async (req, res) => {
    res.json({ status: "Feature requires real-time presence subscription loop." });
});

export default router;
