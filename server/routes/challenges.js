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

        // Generate the challenge with variations
        const challenge = generateChallenge(challengeId, seed);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Generate session token
        const token = generateSessionToken(sessionId, challengeId, seed);

        // Store session in database
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
        const stmt = db.prepare(`
      INSERT INTO sessions (id, challenge_id, variation_seed, initial_content, target_content, variation_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            sessionId,
            challengeId,
            seed,
            challenge.initialContent,
            challenge.targetContent,
            JSON.stringify({
                targetLine: challenge.targetLine,
                targetWord: challenge.targetWord,
                highlightWord: challenge.highlightWord,
                checkType: challenge.checkType,
                targetValue: challenge.targetValue
            }),
            expiresAt.toISOString()
        );

        res.json({
            sessionId,
            token,
            challenge: {
                id: challenge.id,
                name: challenge.name,
                difficulty: challenge.difficulty,
                description: challenge.description,
                instructions: challenge.instructions,
                initialContent: challenge.initialContent,
                targetContent: challenge.targetContent,
                highlightWord: challenge.highlightWord,
                targetLine: challenge.targetLine,
                startLine: challenge.startLine,
                endLine: challenge.endLine
            }
        });
    } catch (error) {
        console.error('Error starting challenge:', error);
        res.status(500).json({ error: 'Failed to start challenge' });
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
