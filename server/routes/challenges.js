import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getChallengeList, generateChallenge } from '../services/challenges.js';
import { generateSessionToken, verifySessionToken } from '../services/validator.js';

const router = express.Router();

// Get list of all challenges
router.get('/', (req, res) => {
    try {
        const challenges = getChallengeList();
        res.json(challenges);
    } catch (error) {
        console.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
});

// Start a challenge session
router.post('/:id/start', (req, res) => {
    try {
        const challengeId = parseInt(req.params.id);

        // Generate a unique seed for this session
        const seed = Date.now() + Math.floor(Math.random() * 10000);
        const sessionId = uuidv4();

        // Generate the challenge with variations (returns { steps: [...] })
        const challenge = generateChallenge(challengeId, seed);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const steps = challenge.steps || [];
        if (steps.length === 0) {
            return res.status(500).json({ error: 'Generated challenge has no steps' });
        }

        const firstStep = steps[0];

        // Generate session token
        const token = generateSessionToken(sessionId, challengeId, seed);

        // Store session in database
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
        const stmt = db.prepare(`
      INSERT INTO sessions (id, challenge_id, variation_seed, initial_content, target_content, variation_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        // We store the full steps chain in variation_data
        stmt.run(
            sessionId,
            challengeId,
            seed,
            firstStep.initialContent,
            firstStep.targetContent,
            JSON.stringify({ steps: steps }),
            expiresAt.toISOString()
        );

        res.json({
            sessionId,
            token,
            totalSteps: steps.length,
            stepIndex: 0,
            challenge: {
                id: challenge.id,
                name: challenge.name,
                difficulty: challenge.difficulty,
                description: challenge.description,
                ...firstStep
            }
        });
    } catch (error) {
        console.error('Error starting challenge:', error);
        res.status(500).json({ error: 'Failed to start challenge' });
    }
});

// Report progress and get next step
router.post('/:id/progress', (req, res) => {
    try {
        const { token, stepIndex } = req.body;

        // Verify token
        const sessionData = verifySessionToken(token);
        if (!sessionData) {
            return res.status(401).json({ error: 'Invalid session token' });
        }

        // Fetch session to get steps
        const stmt = db.prepare('SELECT variation_data FROM sessions WHERE id = ?');
        const sessionRow = stmt.get(sessionData.sessionId);

        if (!sessionRow) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const variationData = JSON.parse(sessionRow.variation_data);
        const steps = variationData.steps;

        const nextIndex = stepIndex + 1;

        if (nextIndex >= steps.length) {
            return res.json({ complete: true });
        }

        const nextStep = steps[nextIndex];

        res.json({
            complete: false,
            stepIndex: nextIndex,
            totalSteps: steps.length,
            step: nextStep
        });

    } catch (error) {
        console.error('Error progressing challenge:', error);
        res.status(500).json({ error: 'Failed to progress challenge' });
    }
});

// Get challenge details (without starting a session)
router.get('/:id', (req, res) => {
    try {
        const challengeId = parseInt(req.params.id);
        const challenges = getChallengeList();
        const challenge = challenges.find(c => c.id === challengeId);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        res.json(challenge);
    } catch (error) {
        console.error('Error fetching challenge:', error);
        res.status(500).json({ error: 'Failed to fetch challenge' });
    }
});

export default router;
