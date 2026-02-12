import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = '/api';

function Leaderboard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [scores, setScores] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const selectedChallenge = searchParams.get('challenge') || 'all';

    useEffect(() => {
        Promise.all([fetchScores(), fetchChallenges()]);
    }, [selectedChallenge]);

    async function fetchScores() {
        try {
            let url = `${API_URL}/leaderboard?limit=100`;
            if (selectedChallenge !== 'all') {
                url += `&challengeId=${selectedChallenge}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch leaderboard');

            const data = await response.json();
            setScores(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchChallenges() {
        try {
            const response = await fetch(`${API_URL}/challenges`);
            if (!response.ok) throw new Error('Failed to fetch challenges');

            const data = await response.json();
            setChallenges(data);
        } catch (err) {
            console.error('Failed to fetch challenges:', err);
        }
    }

    function handleChallengeChange(e) {
        const value = e.target.value;
        if (value === 'all') {
            setSearchParams({});
        } else {
            setSearchParams({ challenge: value });
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading leaderboard...</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-header">
                <Link to="/" className="back-btn">← Back to Challenges</Link>
                <h1>🏆 Leaderboard</h1>
                <div className="challenge-filter">
                    <label htmlFor="challenge-select">Filter by challenge:</label>
                    <select
                        id="challenge-select"
                        value={selectedChallenge}
                        onChange={handleChallengeChange}
                    >
                        <option value="all">All Challenges</option>
                        {challenges.map(c => (
                            <option key={c.id} value={c.id}>
                                #{c.id} {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <p>⚠️ {error}</p>
                    <button onClick={fetchScores}>Retry</button>
                </div>
            )}

            {scores.length === 0 ? (
                <div className="empty-leaderboard">
                    <p>🎯 No scores yet! Be the first to complete a challenge.</p>
                    <Link to="/" className="start-btn">Start Playing</Link>
                </div>
            ) : (
                <div className="leaderboard-table-container">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th className="rank-col">Rank</th>
                                <th className="player-col">Player</th>
                                <th className="score-col">Score</th>

                                {selectedChallenge !== 'all' && <th className="challenge-col">Challenge</th>}
                                <th className="time-col">Time</th>
                                <th className="keystrokes-col">Keystrokes</th>
                                {selectedChallenge !== 'all' && <th className="date-col">Date</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {scores.map((score, index) => {
                                const challenge = challenges.find(c => c.id === score.challenge_id);

                                function getPlayerNameColor(s) {
                                    if (s === undefined || s === null) return 'inherit';
                                    const isAll = selectedChallenge === 'all';
                                    const threshold = isAll ? -70 : -10;

                                    if (s < threshold) return 'var(--hard)';
                                    if (s <= 0) return 'var(--accent-green)';
                                    return 'white';
                                }

                                return (
                                    <tr key={score.id || index} className={index < 3 ? `top-${index + 1}` : ''}>
                                        <td className="rank-col">
                                            {index === 0 && '🥇'}
                                            {index === 1 && '🥈'}
                                            {index === 2 && '🥉'}
                                            {index > 2 && `#${index + 1}`}
                                        </td>
                                        <td
                                            className="player-col"
                                            style={{ color: getPlayerNameColor(score.score) }}
                                        >
                                            {score.player_name}
                                        </td>
                                        <td className="score-col">{score.score?.toLocaleString()}</td>

                                        {selectedChallenge !== 'all' && (
                                            <td className="challenge-col">
                                                <Link to={`/challenge/${score.challenge_id}`}>
                                                    #{score.challenge_id} {challenge?.name || 'Unknown'}
                                                </Link>
                                            </td>
                                        )}
                                        <td className="time-col">{formatTime(score.time_ms)}</td>
                                        <td className="keystrokes-col">{score.keystrokes}</td>
                                        {selectedChallenge !== 'all' && <td className="date-col">{formatDate(score.submitted_at)}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="leaderboard-footer">
                <p className="scoring-info">
                    {selectedChallenge === 'all'
                        ? "🎯 Scores aggregated across all challenges. Higher is better!"
                        : "🎯 Scores ranked by highest score (efficiency & speed)."}
                </p>
            </div>
        </div>
    );
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = ms % 1000;

    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${Math.floor(remainingMs / 100)}`;
    }
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default Leaderboard;
