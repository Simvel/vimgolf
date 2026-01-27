import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import challengeRoutes from './routes/challenges.js';
import leaderboardRoutes from './routes/leaderboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// API Routes
app.use('/api/challenges', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../client/dist/index.html'));
    });
}

// Start server
app.listen(PORT, () => {
    console.log('================================================');
    console.log(`🎮 VimGolf CTF server running on http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('================================================');
});

export default app;
