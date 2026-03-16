import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

// Android/ADB routes - These handle Android device automation via ADB

router.post('/enable-wireless', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'CUSTOM', // Or add TCP_IP to standard actions
        bin: 'adb',
        args: ['tcpip', '5555']
    });
    res.json(result);
});

router.post('/scan-network', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'LIST_DEVICES', // Map to adb devices
        bin: 'adb',
        args: ['devices']
    });
    res.json(result);
});

router.post('/connect-ip', async (req, res) => {
    const { ip, port } = req.body;
    const target = `${ip}:${port || 5555}`;
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'CONNECT',
        bin: 'adb',
        args: ['connect', target]
    });
    res.json(result);
});

router.post('/pair', async (req, res) => {
    const { ip, port, code } = req.body;
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'PAIR',
        bin: 'adb',
        args: ['pair', `${ip}:${port}`, code]
    });
    res.json(result);
});

router.post('/install-apk', async (req, res) => {
    const { path } = req.body;
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'INSTALL',
        bin: 'adb',
        args: ['install', path]
    });
    res.json(result);
});

router.post('/uninstall-apk', async (req, res) => {
    const { package: pkg } = req.body;
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'UNINSTALL',
        bin: 'adb',
        args: ['uninstall', pkg]
    });
    res.json(result);
});

router.get('/device-ip', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'GET_IP',
        bin: 'adb',
        args: ['shell', 'ip', 'addr', 'show', 'wlan0']
    });
    if (result.success && result.result) {
        const match = result.result.match(/inet (\d+\.\d+\.\d+\.\d+)/);
        res.json({ ip: match ? match[1] : null, raw: result.result });
    } else {
        res.json({ error: result.result || 'Failed to get IP' });
    }
});

router.get('/ui-tree', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'GET_UI_TREE'
    });
    res.json(result);
});

router.post('/find', (req, res) => {
    const { selector } = req.body;
    // Placeholder - would parse UI XML and find element
    res.json({ result: `Finding element: ${selector}` });
});

router.post('/click', async (req, res) => {
    const { x, y } = req.body;
    if (x !== undefined && y !== undefined) {
        const result = await systemControlService.executeMobileAction({ 
            platform: 'android', 
            action: 'TAP', 
            params: { x, y } 
        });
        res.json(result);
    } else {
        res.json({ error: 'Coordinates required' });
    }
});

router.get('/notifications', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'CUSTOM',
        bin: 'adb',
        args: ['shell', 'dumpsys', 'notification']
    });
    res.json({ notifications: result.result, success: result.success });
});

router.post('/intent', async (req, res) => {
    const { action, data } = req.body;
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'OPEN_URL', 
        value: data,
        params: { action } // Pass standard intent action if needed
    });
    res.json(result);
});

router.post('/screenshot', async (req, res) => {
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'TAKE_SCREENSHOT'
    });
    res.json(result);
});

router.post('/type', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ error: 'Text required' });
    
    const result = await systemControlService.executeMobileAction({ 
        platform: 'android', 
        action: 'TYPE', 
        value: text 
    });
    res.json(result);
});

router.post('/control-agent', (req, res) => {
    const { goal, strategy } = req.body;
    console.log(`[ANDROID_AGENT] 🤖 Autonomous Goal Received: "${goal}" (Strategy: ${strategy || 'ACCURACY'})`);
    
    // In a production environment, this would spin up a specialized AI agent (like UI-TARS) 
    // that loops through screen analysis and interactions.
    res.json({ 
        success: true, 
        message: `Android Agent engaged for goal: "${goal}". Executing semantic analysis loop...` 
    });
});

export default router;
