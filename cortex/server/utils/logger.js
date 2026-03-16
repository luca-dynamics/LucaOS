import fs from 'fs';
import path from 'path';

/**
 * Cortex Structured Logger
 * Handles file-based rotation and structured console output.
 */
class Logger {
    constructor() {
        this.logDir = path.join(process.env.HOME || '', '.luca', 'logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.logFile = path.join(this.logDir, 'cortex.log');
    }

    format(level, service, message, metadata) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            service,
            message,
            metadata: metadata || {}
        }) + '\n';
    }

    persist(level, service, message, metadata) {
        const entry = this.format(level, service, message, metadata);
        fs.appendFileSync(this.logFile, entry);
        
        // Console output
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${level}] [${service}] ${message}`, metadata || '');
    }

    info(service, message, metadata) { this.persist('INFO', service, message, metadata); }
    warn(service, message, metadata) { this.persist('WARN', service, message, metadata); }
    error(service, message, metadata) { this.persist('ERROR', service, message, metadata); }
    security(service, message, metadata) { this.persist('SECURITY', service, message, metadata); }
}

export const logger = new Logger();
