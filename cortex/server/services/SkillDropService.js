import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { SKILLS_DIR, PROTOCOL_SKILLS_DIR } from '../config/constants.js';

/**
 * SkillDropService
 * Handles the logic for detecting and registering skills from file/folder drops.
 */
class SkillDropService {
    constructor() {
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(PROTOCOL_SKILLS_DIR)) {
            fs.mkdirSync(PROTOCOL_SKILLS_DIR, { recursive: true });
        }
        if (!fs.existsSync(SKILLS_DIR)) {
            fs.mkdirSync(SKILLS_DIR, { recursive: true });
        }
    }

    /**
     * Process a dropped file or folder
     * @param {string} sourcePath - The absolute path of the dropped item
     * @returns {Promise<Object>} - Registration result
     */
    async processDrop(sourcePath) {
        try {
            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source path does not exist: ${sourcePath}`);
            }

            const stats = fs.statSync(sourcePath);
            const name = path.basename(sourcePath);

            if (stats.isDirectory()) {
                return await this.handleFolderDrop(sourcePath, name);
            } else {
                return await this.handleFileDrop(sourcePath, name);
            }
        } catch (error) {
            logger.error('SKILL_DROP', `Failed to process drop: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle folder drop (potential Protocol Suite)
     */
    async handleFolderDrop(sourcePath, name) {
        const targetPath = path.join(PROTOCOL_SKILLS_DIR, name);

        // 1. Validate internal structure
        const files = fs.readdirSync(sourcePath);
        const isProtocol = files.some(f => 
            ['driver.js', 'index.js', 'SKILL.md'].includes(f)
        );

        if (!isProtocol) {
            // Not a protocol suite? Try treating as a generic folder of scripts (future)
            throw new Error(`Folder "${name}" does not appear to be a valid Protocol Suite (missing driver.js or SKILL.md)`);
        }

        // 2. Move to protocol-skills
        if (fs.existsSync(targetPath)) {
            logger.warn('SKILL_DROP', `Replacing existing protocol suite: ${name}`);
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        
        fs.cpSync(sourcePath, targetPath, { recursive: true });
        logger.info('SKILL_DROP', `Registered Protocol Suite: ${name}`);

        return {
            success: true,
            type: 'protocol-suite',
            name,
            path: targetPath,
            message: `Official Protocol Suite "${name}" registered successfully.`
        };
    }

    /**
     * Handle single file drop (Agent Skill)
     */
    async handleFileDrop(sourcePath, name) {
        const ext = path.extname(name).toLowerCase();
        const targetPath = path.join(SKILLS_DIR, name);

        if (!['.js', '.py', '.json'].includes(ext)) {
            throw new Error(`Unsupported skill file type: ${ext}. Use .js, .py, or .json`);
        }

        // 1. Move to agent-skills (SKILLS_DIR)
        fs.copyFileSync(sourcePath, targetPath);
        logger.info('SKILL_DROP', `Registered Agent Skill: ${name}`);

        return {
            success: true,
            type: 'agent-skill',
            name,
            path: targetPath,
            message: `Agent Skill "${name}" registered successfully.`
        };
    }
}

export const skillDropService = new SkillDropService();
