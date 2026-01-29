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
                <h1>Vim Speed Golf</h1>
                <p className="subtitle">Kompetensdagen februari</p>

                <div className="header-actions">
                    <Link to="/leaderboard" className="link-btn leaderboard-btn">
                        🏆 View Leaderboard
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading challenges...</p>
                </div>
            ) : error ? (
                <div className="error-container">
                    <h2>⚠️ Error</h2>
                    <p>{error}</p>
                    <button onClick={fetchChallenges}>Retry</button>
                </div>
            ) : (
                <div className="challenges-grid">
                    {challenges.map(challenge => (
                        <ChallengeCard key={challenge.id} challenge={challenge} />
                    ))}
                </div>
            )}
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
