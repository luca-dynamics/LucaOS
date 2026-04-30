/**
 * Social Skills API Routes
 */

import express from 'express';
import { socialSkillLearner } from '../../services/SocialSkillLearner.js';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(socialSkillLearner.getStatus());
});

router.get('/list', (req, res) => {
    res.json(socialSkillLearner.listSkills());
});

router.post('/record/start', async (req, res) => {
    const { skillName, platform, description } = req.body;
    if (!skillName || !platform) {
        return res.status(400).json({ success: false, error: 'Skill name and platform are required' });
    }
    const result = await socialSkillLearner.startRecording(skillName, platform, description);
    res.json(result);
});

router.post('/record/stop', async (req, res) => {
    const result = await socialSkillLearner.stopRecording();
    res.json(result);
});

router.post('/execute', async (req, res) => {
    // Note: Skill execution requires a page object
    res.json({ success: false, error: 'Direct execution via API requires platform-specific page context' });
});

router.delete('/:name', (req, res) => {
    const result = socialSkillLearner.deleteSkill(req.params.name);
    res.json(result);
});

router.post('/suggest', (req, res) => {
    const { request, platform } = req.body;
    const suggestion = socialSkillLearner.suggestCapability(request, platform);
    res.json(suggestion);
});

export default router;
