import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import {
    verifySessionToken,
    validateKeystrokeTiming,
    validateContent,
    validateCursorPosition,
    calculateTime
} from '../services/validator.js';
import { generateChallenge, getChallengeList } from '../services/challenges.js';

const router = express.Router();
const ADMIN_PASSWORD_HASH = '82f641ddc4a315c7b0f5d77d075c774b515a848c11b59b10b7eb3407dc2f690a';

// Submit a score
router.post('/submit', (req, res) => {
    console.log(`Received submission request for player: ${req.body?.playerName}`);
    try {
        const { token, playerName, content, keystrokes, cursorPosition } = req.body;

        // Validate required fields
        if (!token || !playerName || !keystrokes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify session token
        const sessionData = verifySessionToken(token);
        if (!sessionData) {
            return res.status(403).json({ error: 'Invalid or expired session token' });
        }

        const { sessionId, challengeId, seed } = sessionData;

        // Check if session exists and hasn't expired
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (new Date(session.expires_at) < new Date()) {
            return res.status(403).json({ error: 'Session has expired' });
        }

        // Check if score was already submitted for this session
        const existingScore = db.prepare('SELECT id FROM scores WHERE session_id = ?').get(sessionId);
        if (existingScore) {
            return res.status(409).json({ error: 'Score already submitted for this session' });
        }

        // Check for empty submissions before anti-cheat
        if (!keystrokes || keystrokes.length === 0) {
            return res.status(400).json({ error: 'No inputs registered' });
        }

        // Validate keystroke timing (anti-cheat)
        const timingValidation = validateKeystrokeTiming(keystrokes);
        if (!timingValidation.valid) {
            // Log the specific reason server-side (already done in validator.js) but hide it from client
            return res.status(403).json({
                error: 'Submission rejected',
                reason: 'Suspected foul play'
            });
        }

        // Regenerate challenge and validate content
        const challenge = generateChallenge(challengeId, seed);
        const variationData = JSON.parse(session.variation_data || '{}');

        // Validate based on challenge type
        const checkType = variationData.checkType;

        if (checkType === 'content_match') {
            const contentValid = validateContent(
                content,
                challenge.targetContent,
                checkType,
                variationData.targetValue
            );

            if (!contentValid) {
                return res.status(400).json({ error: 'Content does not match target' });
            }
        } else if (checkType && checkType.startsWith('cursor_')) {
            // Validate cursor-based challenges
            if (!cursorPosition) {
                return res.status(400).json({ error: 'Cursor position required for this challenge' });
            }

            const cursorValid = validateCursorPosition(
                cursorPosition,
                content,
                checkType,
                variationData.targetValue,
                variationData.targetWord
            );

            if (!cursorValid.valid) {
                console.log(`Cursor validation failed: ${cursorValid.reason}`);
                return res.status(400).json({ error: cursorValid.reason || 'Cursor not in correct position' });
            }
        }

        // Calculate time and keystroke count
        const timeMs = calculateTime(keystrokes);
        const keystrokeCount = keystrokes.length;

        // Validate player name
        const sanitizedName = playerName.trim().slice(0, 50);
        if (!sanitizedName) {
            return res.status(400).json({ error: 'Invalid player name' });
        }

        // Save score
        const stmt = db.prepare(`
      INSERT INTO scores (session_id, challenge_id, player_name, time_ms, keystrokes, keystroke_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            sessionId,
            challengeId,
            sanitizedName,
            timeMs,
            keystrokeCount,
            JSON.stringify(keystrokes)
        );

        // Get rank for this score
        const rank = db.prepare(`
      SELECT COUNT(*) + 1 as rank 
      FROM scores 
      WHERE challenge_id = ? AND time_ms < ?
    `).get(challengeId, timeMs);

        res.json({
            success: true,
            scoreId: result.lastInsertRowid,
            timeMs,
            keystrokes: keystrokeCount,
            rank: rank.rank
        });

    } catch (error) {
        console.error('Error submitting score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

// Get leaderboard (all challenges or specific)
router.get('/', (req, res) => {
    try {
        const { challengeId, limit = 50 } = req.query;

        let query = `
      SELECT 
        s.id,
        s.challenge_id,
        s.player_name,
        s.time_ms,
        s.keystrokes,
        s.submitted_at
      FROM scores s
    `;

        const params = [];

        if (challengeId) {
            query += ' WHERE s.challenge_id = ?';
            params.push(parseInt(challengeId));
        }

        query += ' ORDER BY s.time_ms ASC LIMIT ?';
        params.push(parseInt(limit));

        const scores = db.prepare(query).all(...params);

        // Add rank to each score
        const rankedScores = scores.map((score, index) => ({
            ...score,
            rank: index + 1
        }));

        res.json(rankedScores);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get best scores per challenge for a player
router.get('/player/:name', (req, res) => {
    try {
        const playerName = req.params.name;

        const scores = db.prepare(`
      SELECT 
        challenge_id,
        MIN(time_ms) as best_time,
        MIN(keystrokes) as best_keystrokes,
        COUNT(*) as attempts
      FROM scores
      WHERE player_name = ?
      GROUP BY challenge_id
      ORDER BY challenge_id
    `).all(playerName);

        res.json(scores);

    } catch (error) {
        console.error('Error fetching player scores:', error);
        res.status(500).json({ error: 'Failed to fetch player scores' });
    }
});

// Admin reset endpoint
router.post('/reset', (req, res) => {
    try {
        const password = req.headers['x-admin-password'];
        if (!password) {
            return res.status(401).json({ error: 'Missing admin password' });
        }

        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== ADMIN_PASSWORD_HASH) {
            return res.status(403).json({ error: 'Invalid admin password' });
        }

        // Use a transaction to ensure all or nothing
        const resetTx = db.transaction(() => {
            // Delete all existing data
            // Delete all existing data
            db.prepare('DELETE FROM scores').run();
            db.prepare('DELETE FROM sessions').run();

            // Seed dummy scores for all challenges
            const challenges = getChallengeList();

            const now = new Date();
            const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

            for (const challenge of challenges) {
                // Create a dummy session for the foreign key constraint
                const sessionId = `admin-seed-session-${challenge.id}`;

                try {
                    db.prepare(`
                    INSERT INTO sessions (id, challenge_id, variation_seed, initial_content, target_content, variation_data, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                        sessionId,
                        challenge.id,
                        12345, // Dummy seed
                        '', // Dummy initial content
                        '', // Dummy target content
                        '{}', // Loosely typed variation data
                        expiresAt
                    );

                    // Insert dummy score for Simvel
                    db.prepare(`
                    INSERT INTO scores (session_id, challenge_id, player_name, time_ms, keystrokes, keystroke_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                        sessionId,
                        challenge.id,
                        'Simvel',
                        1000,
                        10,
                        '[]'
                    );
                } catch (e) {
                    console.error(`Error seeding challenge ${challenge.id}:`, e);
                    throw e;
                }
            }

        });

        resetTx();


        res.json({ success: true, message: 'Leaderboard reset and seeded with Simvel scores' });

    } catch (error) {
        console.error('Error resetting leaderboard:', error);
        res.status(500).json({ error: 'Failed to reset leaderboard' });
    }
});

export default router;
