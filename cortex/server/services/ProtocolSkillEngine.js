import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import cryptoService from './cryptoService.js';
import { PROTOCOL_SKILLS_DIR } from '../config/constants.js';


class ProtocolSkillEngine {
    constructor() {
        this.drivers = new Map();
        this.skillsDir = PROTOCOL_SKILLS_DIR;
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * 🚀 Initialize the engine (Load all drivers)
     */
    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log(`📂 Scanning for Protocol Skills in: ${this.skillsDir}`);
            if (!fs.existsSync(this.skillsDir)) {
                fs.mkdirSync(this.skillsDir, { recursive: true });
            }

            const files = fs.readdirSync(this.skillsDir).filter(f => f.endsWith('.js'));
            
            for (const file of files) {
                try {
                    const protocolName = path.basename(file, '.js');
                    const fullPath = path.join(this.skillsDir, file);
                    const fileUrl = pathToFileURL(fullPath).href; // Convert to absolute file:// URL
                    
                    const driver = await import(fileUrl);
                    
                    if (driver.manifest && driver.skills) {
                        this.drivers.set(protocolName, driver);
                        console.log(`✅ Loaded Protocol Suite: ${protocolName}`);
                    } else {
                        console.warn(`⚠️ Protocol Driver ${file} is missing manifest or skills.`);
                    }
                } catch (e) {
                    console.error(`❌ Failed to load protocol driver ${file}:`, e);
                }
            }
            this.initialized = true;
            console.log(`🚀 ProtocolSkillEngine Initialized with ${this.drivers.size} drivers.`);
        })();

        return this.initPromise;
    }

    /**
     * 📋 List all available protocol suites and their actions
     */
    async listSkills() {
        await this.init();
        const result = {};
        for (const [name, driver] of this.drivers) {
            result[name] = {
                manifest: driver.manifest,
                actions: Object.keys(driver.skills)
            };
        }
        return result;
    }

    /**
     * 🛡️ Validate if a protocol supports a specific chain
     */
    async validateContext(protocol, chain) {
        await this.init();
        const driver = this.drivers.get(protocol);
        if (!driver) throw new Error(`Protocol '${protocol}' not found. Available: ${Array.from(this.drivers.keys()).join(', ')}`);
        
        const supportedChains = driver.manifest.chains || [];
        if (chain && !supportedChains.includes(chain.toLowerCase())) {
            throw new Error(`Protocol '${protocol}' does not support chain '${chain}'. Supported: ${supportedChains.join(', ')}`);
        }
        return driver;
    }
    
    // ... rest of the class remains same ...
    
    /**
     * 💰 Pre-execution check for sufficient funds
     */
    async checkFunds(walletId, chain, amount, tokenSymbol = 'ETH') {
        const wallet = await cryptoService.getWallet(walletId);
        if (!wallet) throw new Error(`Wallet '${walletId}' not found.`);
        
        const balanceInfo = await cryptoService.getBalance(wallet.address, chain);
        const balanceVal = parseFloat(balanceInfo.balance);
        const requiredVal = parseFloat(amount);

        if (balanceVal < requiredVal) {
            throw new Error(`Insufficient funds on ${chain}. Required: ${requiredVal} ${tokenSymbol}, Available: ${balanceVal} ${tokenSymbol}`);
        }
        return true;
    }

    /**
     * 🚀 Central Execution Hub
     */
    async executeSkill(skillPath, params) {
        const [protocol, action] = skillPath.split('/');
        if (!protocol || !action) throw new Error("Invalid skill path. Use 'protocol/action'.");

        const driver = await this.validateContext(protocol, params.chain);
        const skillFunc = driver.skills[action];

        if (!skillFunc) {
            throw new Error(`Action '${action}' not found in protocol '${protocol}'.`);
        }

        // Optional fund check
        if (params.amount && params.walletId) {
            await this.checkFunds(params.walletId, params.chain, params.amount, params.fromToken || 'native');
        }

        console.log(`🛠️ Executing Skill: ${skillPath} on ${params.chain}...`);
        return await skillFunc(params, { cryptoService });
    }
}

export default new ProtocolSkillEngine();
