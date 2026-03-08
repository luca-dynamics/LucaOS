import express from 'express';
import { goalStore } from '../../services/goalStore.js';
import { goalExecutor } from '../../services/goalExecutor.js';

const router = express.Router();

/**
 * CREATE TASK / GOAL
 * POST /api/tasks/create
 */
router.post('/create', async (req, res) => {
    try {
        const { description, type = 'ONE_OFF', priority = 'MEDIUM' } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        // Create goal in store
        const goal = goalStore.createGoal({
            description,
            type,
            priority,
            status: 'PENDING'
        });

        // Execute immediately if one-off
        if (type === 'ONE_OFF') {
            // Non-blocking execution
            goalExecutor.executeGoal(goal.id).catch(err => 
                console.error(`[TASK_ROUTE] Execution failed for ${goal.id}:`, err)
            );
        }

        res.json({ success: true, goal });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * LIST TASKS
 * GET /api/tasks/list
 */
router.get('/list', (req, res) => {
    try {
        const goals = goalStore.getAllGoals();
        res.json({ goals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET TASK DETAILS
 * GET /api/tasks/:id
 */
router.get('/:id', (req, res) => {
    try {
        const goal = goalStore.getGoal(req.params.id);
        if (!goal) return res.status(404).json({ error: 'Goal not found' });
        
        const execution = goalStore.getLatestExecution(goal.id);
        const state = goalStore.getState(goal.id);
        
        res.json({ goal, execution, state });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
