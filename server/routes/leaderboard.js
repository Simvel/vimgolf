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
        const existingSessionScore = db.prepare('SELECT id FROM scores WHERE session_id = ?').get(sessionId);
        if (existingSessionScore) {
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

        // Calculate time based on server-side session start_time
        if (!session.start_time) {
            // Fallback if start_time was never set (shouldn't happen with new client, but for safety)
            // Or maybe return error? User said "cannot successfully submit... without steps... server decided time"
            // If we strictly enforce it:
            // return res.status(400).json({ error: 'Timer was never started' });

            // For transition/dev safety, let's use current naive calc if missing, but preferably error.
            // Let's return error to be strict as requested.
            // Actually, if we just started the server and added this, old sessions might fail.
            // But ephemeral DB implies fresh start usually.

            // NOTE: Changing to STRICT server time.
            return res.status(400).json({ error: 'Timer was not started properly. Please restart the challenge.' });
        }

        const serverEndTime = new Date();
        const serverStartTime = new Date(session.start_time);
        // Time in MS
        const timeMs = serverEndTime.getTime() - serverStartTime.getTime();

        // Deprecated: const timeMs = calculateTime(keystrokes);
        const keystrokeCount = keystrokes.length;

        // Validate player name
        const sanitizedName = playerName.trim().slice(0, 50);
        if (!sanitizedName) {
            return res.status(400).json({ error: 'Invalid player name' });
        }

        // --- NEW: Calculate score and check for improvement ---
        const challengeDef = getChallengeList().find(c => c.id === challengeId);
        const timePar = challengeDef?.timePar || 0;
        const keyPressesPar = challengeDef?.keyPressesPar || 0;

        // Formula: 100 + (keyPressesPar - keyPresses) + ((timePar - time_ms) / 1000)
        // Using seconds for meaningful time difference
        const calculateScore = (tMs, kP) => {
            return 100 + (keyPressesPar - kP) + Math.round((timePar - tMs) / 1000);
        };

        const newScore = calculateScore(timeMs, keystrokeCount);

        // Fetch existing scores for this player on this challenge
        const existingScores = db.prepare(`
            SELECT time_ms, keystrokes
            FROM scores
            WHERE challenge_id = ? AND player_name = ?
        `).all(challengeId, sanitizedName);

        // Find max existing score
        let maxExistingScore = -Infinity;
        existingScores.forEach(s => {
            const sScore = calculateScore(s.time_ms, s.keystrokes);
            if (sScore > maxExistingScore) maxExistingScore = sScore;
        });

        // Only insert if new score is better
        let result = { lastInsertRowid: null };
        let isNewBest = false;

        if (existingScores.length === 0 || newScore > maxExistingScore) {
            const stmt = db.prepare(`
                INSERT INTO scores (session_id, challenge_id, player_name, time_ms, keystrokes, keystroke_data)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            result = stmt.run(
                sessionId,
                challengeId,
                sanitizedName,
                timeMs,
                keystrokeCount,
                JSON.stringify(keystrokes)
            );
            isNewBest = true;
        } else {
            console.log(`Score ${newScore} not better than existing best ${maxExistingScore}. Not saving.`);
        }

        // Get rank (based on score now ideally, but maintaining compatibility with simple count for now)
        //rank is strictly cosmetic here if we just inserted.
        // If we didn't insert, rank is effectively "what it would be" or we just return null.

        res.json({
            success: true,
            scoreId: result.lastInsertRowid,
            timeMs,
            keystrokes: keystrokeCount,
            score: newScore,
            isNewBest
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
        const challenges = getChallengeList();

        // Map of challengeId -> { timePar, keyPressesPar } for quick lookup
        const challengePars = {};
        challenges.forEach(c => {
            challengePars[c.id] = {
                timePar: c.timePar || 0,
                keyPressesPar: c.keyPressesPar || 0
            };
        });

        // Helper to calculate score for a single entry
        const calculateScore = (timeMs, keystrokes, challengeId) => {
            const par = challengePars[challengeId];
            if (!par) return 0; // Should not happen if challenge exists

            // Formula: 100 + (keyPressesPar - keyPresses) + ((timePar - time) / 1000)
            return 100 + (par.keyPressesPar - keystrokes) + Math.round((par.timePar - timeMs) / 1000);
        };

        if (challengeId) {
            // SINGLE CHALLENGE VIEW
            const cId = parseInt(challengeId);

            let query = `
                SELECT 
                    s.id,
                    s.challenge_id,
                    s.player_name,
                    s.time_ms,
                    s.keystrokes,
                    s.submitted_at
                FROM scores s
                WHERE s.challenge_id = ?
                ORDER BY s.time_ms ASC 
            `;
            // We fetch all then sort by score in JS to be consistent with the formula, 
            // or we just return them. The prompt says "introduce a column called score".
            // Since score depends on multiple factors, sorting by time_ms might not be strictly "best score".
            // However, usually Vimgolf is time or keystroke based.
            // Let's fetch all for this challenge, calculate score, then sort by score DESC, then limit.

            const scores = db.prepare(query).all(cId);

            const scoredScores = scores.map(score => {
                const calculatedScore = calculateScore(score.time_ms, score.keystrokes, score.challenge_id);
                return {
                    ...score,
                    score: calculatedScore
                };
            });

            // Iterate to find the best score per player? 
            // Usually leaderboard shows best attempt per player or all attempts?
            // "Right now, the high score either shows a selected challenge, or 'All Challenges'."
            // Standard leaderboard usually collapses to one entry per player.
            // Let's dedup by player here too for consistency, keeping their BEST score.

            const bestPerPlayer = {};
            scoredScores.forEach(s => {
                if (!bestPerPlayer[s.player_name] || s.score > bestPerPlayer[s.player_name].score) {
                    bestPerPlayer[s.player_name] = s;
                }
            });

            const sortedScores = Object.values(bestPerPlayer)
                .sort((a, b) => b.score - a.score)
                .slice(0, parseInt(limit));

            const rankedScores = sortedScores.map((score, index) => ({
                ...score,
                rank: index + 1
            }));

            res.json(rankedScores);
        } else {
            // ALL CHALLENGES VIEW (AGGREGATED)
            const query = `
                SELECT 
                    s.id,
                    s.challenge_id,
                    s.player_name,
                    s.time_ms,
                    s.keystrokes
                FROM scores s
            `;
            const allScores = db.prepare(query).all();

            // 1. Group by Player + Challenge -> find BEST score for each pair
            const bestAttempts = {}; // Key: "playerId_challengeId" -> score object

            allScores.forEach(score => {
                // Ignore scores for challenges that don't exist in our list (e.g. old ones)
                if (!challengePars[score.challenge_id]) return;

                const calculatedScore = calculateScore(score.time_ms, score.keystrokes, score.challenge_id);
                const key = `${score.player_name}_${score.challenge_id}`; // player_name is unique identifier currently

                if (!bestAttempts[key] || calculatedScore > bestAttempts[key].score) {
                    bestAttempts[key] = {
                        player_name: score.player_name,
                        challenge_id: score.challenge_id,
                        time_ms: score.time_ms,
                        keystrokes: score.keystrokes,
                        score: calculatedScore
                    };
                }
            });

            // 2. Aggregate per player
            const playerStats = {}; // Key: "player_name" -> { totalTime, totalKeys, totalScore, challengesCompleted }

            Object.values(bestAttempts).forEach(attempt => {
                const name = attempt.player_name;
                if (!playerStats[name]) {
                    playerStats[name] = {
                        player_name: name,
                        time_ms: 0, // Sum of times
                        keystrokes: 0, // Sum of keystrokes
                        score: 0, // Sum of scores
                        challenges_completed: 0
                    };
                }
                playerStats[name].time_ms += attempt.time_ms;
                playerStats[name].keystrokes += attempt.keystrokes;
                playerStats[name].score += attempt.score;
                playerStats[name].challenges_completed += 1;
            });

            // 3. Convert to array and sort
            const leaderboard = Object.values(playerStats)
                .sort((a, b) => b.score - a.score)
                .slice(0, parseInt(limit));

            // 4. Add rank
            const rankedLeaderboard = leaderboard.map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));

            res.json(rankedLeaderboard);
        }

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
