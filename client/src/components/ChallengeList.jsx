import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = '/api';

const difficultyColors = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171'
};

const difficultyEmoji = {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴'
};

function ChallengeList() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchChallenges();
    }, []);

    async function fetchChallenges() {
        try {
            const response = await fetch(`${API_URL}/challenges`);
            if (!response.ok) throw new Error('Failed to fetch challenges');
            const data = await response.json();
            setChallenges(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredChallenges = filter === 'all'
        ? challenges
        : challenges.filter(c => c.difficulty === filter);

    const groupedChallenges = {
        easy: filteredChallenges.filter(c => c.difficulty === 'easy'),
        medium: filteredChallenges.filter(c => c.difficulty === 'medium'),
        hard: filteredChallenges.filter(c => c.difficulty === 'hard'),
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading challenges...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>⚠️ Error</h2>
                <p>{error}</p>
                <button onClick={fetchChallenges}>Retry</button>
            </div>
        );
    }

    return (
        <div className="challenge-list">
            <div className="challenge-header">
                <h1>🎯 VimGolf CTF</h1>
                <p className="subtitle">Master Vim. Beat the clock. Climb the leaderboard.</p>
            </div>

            <div className="filter-bar">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({challenges.length})
                </button>
                <button
                    className={`filter-btn filter-easy ${filter === 'easy' ? 'active' : ''}`}
                    onClick={() => setFilter('easy')}
                >
                    {difficultyEmoji.easy} Easy ({challenges.filter(c => c.difficulty === 'easy').length})
                </button>
                <button
                    className={`filter-btn filter-medium ${filter === 'medium' ? 'active' : ''}`}
                    onClick={() => setFilter('medium')}
                >
                    {difficultyEmoji.medium} Medium ({challenges.filter(c => c.difficulty === 'medium').length})
                </button>
                <button
                    className={`filter-btn filter-hard ${filter === 'hard' ? 'active' : ''}`}
                    onClick={() => setFilter('hard')}
                >
                    {difficultyEmoji.hard} Hard ({challenges.filter(c => c.difficulty === 'hard').length})
                </button>
            </div>

            {filter === 'all' ? (
                <>
                    {Object.entries(groupedChallenges).map(([difficulty, items]) => (
                        items.length > 0 && (
                            <div key={difficulty} className="difficulty-section">
                                <h2 className="difficulty-title" style={{ color: difficultyColors[difficulty] }}>
                                    {difficultyEmoji[difficulty]} {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                </h2>
                                <div className="challenges-grid">
                                    {items.map(challenge => (
                                        <ChallengeCard key={challenge.id} challenge={challenge} />
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </>
            ) : (
                <div className="challenges-grid">
                    {filteredChallenges.map(challenge => (
                        <ChallengeCard key={challenge.id} challenge={challenge} />
                    ))}
                </div>
            )}

            <div className="quick-links">
                <Link to="/leaderboard" className="link-btn">
                    🏆 View Leaderboard
                </Link>
            </div>
        </div>
    );
}

function ChallengeCard({ challenge }) {
    return (
        <Link to={`/challenge/${challenge.id}`} className="challenge-card">
            <div className="card-header">
                <span className="challenge-number">#{challenge.id}</span>
                <span
                    className="difficulty-badge"
                    style={{ backgroundColor: difficultyColors[challenge.difficulty] }}
                >
                    {challenge.difficulty}
                </span>
            </div>
            <h3 className="challenge-name">{challenge.name}</h3>
            <p className="challenge-description">{challenge.description}</p>
            <div className="card-footer">
                <span className="play-hint">Click to play →</span>
            </div>
        </Link>
    );
}

export default ChallengeList;
