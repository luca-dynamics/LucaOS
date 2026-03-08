/**
 * SocialSkillLearner - Self-Learning Social Capability Engine
 * 
 * Enables Luca to autonomously learn new social platform actions through:
 * 1. Capability detection - Recognizing unsupported user requests
 * 2. Browser recording - Capturing user-performed actions
 * 3. Skill generation - Converting recordings to reusable Playwright code
 * 4. Skill persistence - Storing learned capabilities for future use
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { SKILLS_DIR as BASE_SKILLS_DIR } from '../config/constants.js';

const SKILLS_DIR = path.join(BASE_SKILLS_DIR, 'social');
const SKILLS_REGISTRY = path.join(SKILLS_DIR, 'registry.json');

class SocialSkillLearner {
    constructor() {
        this.recordingBrowser = null;
        this.recordingContext = null;
        this.recordingPage = null;
        this.isRecording = false;
        this.recordedActions = [];
        this.currentSkillName = null;
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(SKILLS_DIR)) {
            fs.mkdirSync(SKILLS_DIR, { recursive: true });
        }
        if (!fs.existsSync(SKILLS_REGISTRY)) {
            fs.writeFileSync(SKILLS_REGISTRY, JSON.stringify({ skills: [] }, null, 2));
        }
    }

    /**
     * Get all registered social skills
     */
    getRegistry() {
        try {
            return JSON.parse(fs.readFileSync(SKILLS_REGISTRY, 'utf8'));
        } catch {
            return { skills: [] };
        }
    }

    /**
     * Check if a skill exists by name
     */
    hasSkill(skillName) {
        const registry = this.getRegistry();
        return registry.skills.some(s => s.name === skillName);
    }

    /**
     * Get all available skills
     */
    listSkills() {
        const registry = this.getRegistry();
        return {
            success: true,
            skills: registry.skills.map(s => ({
                name: s.name,
                platform: s.platform,
                description: s.description,
                createdAt: s.createdAt,
                usageCount: s.usageCount || 0
            }))
        };
    }

    /**
     * Start recording mode to learn a new action
     */
    async startRecording(skillName, platform, description) {
        if (this.isRecording) {
            return { success: false, error: 'Already recording a skill' };
        }

        try {
            this.currentSkillName = skillName;
            this.recordedActions = [];
            
            // Launch visible browser for user to perform action
            this.recordingBrowser = await chromium.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            this.recordingContext = await this.recordingBrowser.newContext({
                viewport: { width: 1280, height: 800 },
                recordVideo: { dir: SKILLS_DIR }
            });

            this.recordingPage = await this.recordingContext.newPage();
            
            // Set up action recording
            await this.setupActionRecording();
            
            this.isRecording = true;
            
            // Store skill metadata
            this.currentSkillMeta = {
                name: skillName,
                platform,
                description,
                createdAt: new Date().toISOString()
            };

            return { 
                success: true, 
                message: `Recording started for "${skillName}". Perform the action in the browser, then call stopRecording.`
            };
        } catch (e) {
            await this.cleanup();
            return { success: false, error: e.message };
        }
    }

    /**
     * Set up listeners to record user actions
     */
    async setupActionRecording() {
        const page = this.recordingPage;
        
        // Record navigation
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                this.recordedActions.push({
                    type: 'navigate',
                    url: frame.url(),
                    timestamp: Date.now()
                });
            }
        });

        // Record clicks via CDP
        const client = await page.context().newCDPSession(page);
        await client.send('DOM.enable');
        await client.send('Runtime.enable');

        // Inject action recorder script
        await page.addInitScript(() => {
            window.__lucaRecordedActions = [];
            
            document.addEventListener('click', (e) => {
                const target = e.target;
                const selector = window.__getLucaSelector(target);
                window.__lucaRecordedActions.push({
                    type: 'click',
                    selector,
                    text: target.innerText?.substring(0, 50),
                    timestamp: Date.now()
                });
            }, true);

            document.addEventListener('input', (e) => {
                const target = e.target;
                const selector = window.__getLucaSelector(target);
                window.__lucaRecordedActions.push({
                    type: 'input',
                    selector,
                    value: target.value,
                    timestamp: Date.now()
                });
            }, true);

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    window.__lucaRecordedActions.push({
                        type: 'keypress',
                        key: 'Enter',
                        timestamp: Date.now()
                    });
                }
            }, true);

            // Helper to generate stable selectors
            window.__getLucaSelector = (el) => {
                if (el.id) return `#${el.id}`;
                if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
                if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
                if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter(c => c && !c.includes('_')).slice(0, 2);
                    if (classes.length) return `.${classes.join('.')}`;
                }
                return el.tagName.toLowerCase();
            };
        });
    }

    /**
     * Navigate to a URL during recording
     */
    async navigateTo(url) {
        if (!this.isRecording || !this.recordingPage) {
            return { success: false, error: 'Not in recording mode' };
        }

        try {
            await this.recordingPage.goto(url, { waitUntil: 'domcontentloaded' });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Stop recording and generate the skill
     */
    async stopRecording() {
        if (!this.isRecording) {
            return { success: false, error: 'Not currently recording' };
        }

        try {
            // Collect recorded actions from page
            const pageActions = await this.recordingPage.evaluate(() => {
                return window.__lucaRecordedActions || [];
            });

            // Merge with navigation events
            const allActions = [...this.recordedActions, ...pageActions]
                .sort((a, b) => a.timestamp - b.timestamp);

            // Generate Playwright code
            const skillCode = this.generateSkillCode(allActions);

            // Save skill file
            const skillFilePath = path.join(SKILLS_DIR, `${this.currentSkillName}.js`);
            fs.writeFileSync(skillFilePath, skillCode);

            // Update registry
            const registry = this.getRegistry();
            registry.skills.push({
                ...this.currentSkillMeta,
                filePath: skillFilePath,
                actionCount: allActions.length,
                usageCount: 0
            });
            fs.writeFileSync(SKILLS_REGISTRY, JSON.stringify(registry, null, 2));

            // Cleanup
            await this.cleanup();

            return {
                success: true,
                skillName: this.currentSkillName,
                actionCount: allActions.length,
                message: `Skill "${this.currentSkillName}" learned and saved!`
            };
        } catch (e) {
            await this.cleanup();
            return { success: false, error: e.message };
        }
    }

    /**
     * Generate executable Playwright code from recorded actions
     */
    generateSkillCode(actions) {
        const lines = [
            '/**',
            ` * Auto-generated skill: ${this.currentSkillMeta.name}`,
            ` * Platform: ${this.currentSkillMeta.platform}`,
            ` * Description: ${this.currentSkillMeta.description}`,
            ` * Created: ${this.currentSkillMeta.createdAt}`,
            ' */',
            '',
            'export async function execute(page, params = {}) {',
            '    const results = [];',
            ''
        ];

        let lastUrl = null;
        
        for (const action of actions) {
            switch (action.type) {
                case 'navigate':
                    if (action.url !== lastUrl) {
                        lines.push(`    await page.goto('${action.url}', { waitUntil: 'domcontentloaded' });`);
                        lines.push(`    await page.waitForTimeout(1000);`);
                        lastUrl = action.url;
                    }
                    break;
                    
                case 'click':
                    if (action.selector) {
                        lines.push(`    // Click: ${action.text || 'element'}`);
                        lines.push(`    await page.click('${action.selector}').catch(() => {});`);
                        lines.push(`    await page.waitForTimeout(500);`);
                    }
                    break;
                    
                case 'input':
                    if (action.selector) {
                        lines.push(`    // Input text`);
                        lines.push(`    await page.fill('${action.selector}', params.inputText || '${action.value}');`);
                    }
                    break;
                    
                case 'keypress':
                    lines.push(`    await page.keyboard.press('${action.key}');`);
                    break;
            }
        }

        lines.push('');
        lines.push('    return { success: true, results };');
        lines.push('}');

        return lines.join('\n');
    }

    /**
     * Execute a learned skill
     */
    async executeSkill(skillName, page, params = {}) {
        const registry = this.getRegistry();
        const skill = registry.skills.find(s => s.name === skillName);

        if (!skill) {
            return { success: false, error: `Skill "${skillName}" not found` };
        }

        try {
            // Dynamically import and execute the skill
            const skillModule = await import(`file://${skill.filePath}`);
            const result = await skillModule.execute(page, params);

            // Update usage count
            skill.usageCount = (skill.usageCount || 0) + 1;
            fs.writeFileSync(SKILLS_REGISTRY, JSON.stringify(registry, null, 2));

            return result;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Delete a learned skill
     */
    deleteSkill(skillName) {
        const registry = this.getRegistry();
        const skillIndex = registry.skills.findIndex(s => s.name === skillName);

        if (skillIndex === -1) {
            return { success: false, error: `Skill "${skillName}" not found` };
        }

        const skill = registry.skills[skillIndex];
        
        // Delete skill file
        if (fs.existsSync(skill.filePath)) {
            fs.unlinkSync(skill.filePath);
        }

        // Remove from registry
        registry.skills.splice(skillIndex, 1);
        fs.writeFileSync(SKILLS_REGISTRY, JSON.stringify(registry, null, 2));

        return { success: true, message: `Skill "${skillName}" deleted` };
    }

    /**
     * Suggest a capability based on user request
     */
    suggestCapability(userRequest, platform) {
        const keywords = userRequest.toLowerCase();
        
        // Common social action patterns
        const patterns = [
            { match: /retweet|rt\b/i, name: 'retweet', desc: 'Retweet a post' },
            { match: /quote.*tweet/i, name: 'quoteTweet', desc: 'Quote tweet with comment' },
            { match: /follow/i, name: 'followUser', desc: 'Follow a user' },
            { match: /unfollow/i, name: 'unfollowUser', desc: 'Unfollow a user' },
            { match: /story|stories/i, name: 'postStory', desc: 'Post or view stories' },
            { match: /dm|direct.?message/i, name: 'sendDM', desc: 'Send direct message' },
            { match: /subscribe/i, name: 'subscribe', desc: 'Subscribe to channel' },
            { match: /playlist/i, name: 'addToPlaylist', desc: 'Add to playlist' },
            { match: /react|emoji/i, name: 'addReaction', desc: 'Add reaction' },
            { match: /connect/i, name: 'sendConnection', desc: 'Send connection request' },
            { match: /job/i, name: 'searchJobs', desc: 'Search for jobs' },
        ];

        for (const pattern of patterns) {
            if (pattern.match.test(keywords)) {
                return {
                    suggested: true,
                    skillName: `${platform}_${pattern.name}`,
                    description: pattern.desc,
                    canLearn: true
                };
            }
        }

        return { suggested: false, canLearn: true };
    }

    async cleanup() {
        try {
            if (this.recordingPage) await this.recordingPage.close().catch(() => {});
            if (this.recordingContext) await this.recordingContext.close().catch(() => {});
            if (this.recordingBrowser) await this.recordingBrowser.close().catch(() => {});
        } catch {
            // Ignore cleanup errors
        }
        this.recordingPage = null;
        this.recordingContext = null;
        this.recordingBrowser = null;
        this.isRecording = false;
        this.recordedActions = [];
        this.currentSkillName = null;
        this.currentSkillMeta = null;
    }

    getStatus() {
        const registry = this.getRegistry();
        return {
            isRecording: this.isRecording,
            currentSkill: this.currentSkillName,
            totalSkills: registry.skills.length,
            skills: registry.skills.map(s => s.name)
        };
    }
}

export const socialSkillLearner = new SocialSkillLearner();
