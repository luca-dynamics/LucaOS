import BonjourPkg from 'bonjour-service';
const Bonjour = BonjourPkg.Bonjour || BonjourPkg;
import { WS_PORT } from '../config/constants.js';
import { lucaLinkManager } from '../../../src/services/lucaLinkManager.server.js';

class DiscoveryService {
    constructor() {
        this.bonjour = new Bonjour();
        this.service = null;
    }

    /**
     * Start advertising the Luca Link service on the local network
     */
    start() {
        if (this.service) return;

        console.log(`[DISCOVERY] Starting mDNS advertisement for Luca Link on port ${WS_PORT}...`);

        try {
            // Get the current pairing token for security verification
            const token = lucaLinkManager.getPairingToken && lucaLinkManager.getPairingToken();

            this.service = this.bonjour.publish({
                name: `Luca-Desktop-${process.env.USER || 'Host'}`,
                type: 'luca',
                protocol: 'tcp',
                port: parseInt(WS_PORT),
                txt: {
                    version: '1.0.0',
                    token: token || '',
                    path: '/mobile/socket.io'
                }
            });

            this.service.on('error', (err) => {
                console.error('[DISCOVERY] mDNS advertisement error:', err);
            });

            console.log('[DISCOVERY] mDNS advertisement active: _luca._tcp.local');
        } catch (e) {
            console.error('[DISCOVERY] Failed to start mDNS advertisement:', e);
        }
    }

    /**
     * Stop the mDNS advertisement
     */
    stop() {
        if (this.service) {
            console.log('[DISCOVERY] Stopping mDNS advertisement...');
            this.service.stop(() => {
                this.service = null;
                console.log('[DISCOVERY] mDNS advertisement stopped.');
            });
        }
    }

    /**
     * Update the TXT records (e.g., when token changes)
     */
    updateMetadata(txt) {
        if (this.service) {
            this.service.updateTxt(txt);
        }
    }
}

export const discoveryService = new DiscoveryService();
