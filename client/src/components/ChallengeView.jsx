import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import VimEditor from './VimEditor';

const API_URL = '/api';

function ChallengeView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [keystrokeCount, setKeystrokeCount] = useState(0);
    const [stepIndex, setStepIndex] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [intermission, setIntermission] = useState(false);
    const [playerName, setPlayerName] = useState(() =>
        localStorage.getItem('vimgolf_player_name') || ''
    );
    const [showNameInput, setShowNameInput] = useState(false);

    // We accumulate keystrokes across steps for final submission if needed, 
    // or just trust the server's time tracking.
    // The user requirement says "base total time taken on server timings".
    // But we might want to track keystrokes just for the report.
    const allKeystrokesRef = useRef([]);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        startChallenge();
    }, [id]);

    async function startChallenge() {
        setLoading(true);
        setError(null);
        setResult(null);
        setKeystrokeCount(0);
        setStepIndex(0);
        allKeystrokesRef.current = [];
        hasStartedRef.current = false;

        try {
            const response = await fetch(`${API_URL}/challenges/${id}/start`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to start challenge');

            const data = await response.json();
            setSession(data);
            setStepIndex(data.stepIndex || 0);
            setTotalSteps(data.totalSteps || 1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleKeystroke = useCallback((keystroke, count) => {
        setKeystrokeCount(count); // This is just for current step display

        // Start server timer on FIRST keystroke of the entire challenge
        if (!hasStartedRef.current && session) {
            hasStartedRef.current = true;
            fetch(`${API_URL}/challenges/${id}/start-timer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: session.token })
            }).catch(e => console.error("Failed to start timer", e));
        }
    }, [session, id]);

    const handleStepComplete = useCallback(async (data) => {
        if (!session || intermission) return;

        // Add to total keystrokes
        allKeystrokesRef.current = [...allKeystrokesRef.current, ...data.keystrokes];

        // Show intermission
        setIntermission(true);

        // Short delay for visual feedback
        await new Promise(r => setTimeout(r, 600));

        try {
            const response = await fetch(`${API_URL}/challenges/${id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: session.token,
                    stepIndex: stepIndex
                }),
            });

            if (!response.ok) throw new Error('Failed to progress');

            const result = await response.json();

            if (result.complete) {
                // Challenge finished!
                // Trigger submission flow
                if (!playerName.trim()) {
                    setShowNameInput(true);
                    // Store latest content for submission
                    window._pendingSubmission = { ...data, keystrokes: allKeystrokesRef.current };
                    setIntermission(false);
                    return;
                }

                await submitScore({ ...data, keystrokes: allKeystrokesRef.current }, playerName);
            } else {
                // Load next step
                setStepIndex(result.stepIndex);
                setSession(prev => ({
                    ...prev,
                    challenge: {
                        ...prev.challenge,
                        ...result.step
                    }
                }));
                setIntermission(false);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load next step");
            setIntermission(false);
        }

    }, [session, stepIndex, intermission, id, playerName]);


    async function submitScore(data, name) {
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/leaderboard/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: session.token,
                    playerName: name,
                    content: data.content,
                    keystrokes: data.keystrokes, // All keystrokes from all steps
                    cursorPosition: data.cursorPosition,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.reason || result.error || 'Submission failed');
            }

            // Save player name for next time
            localStorage.setItem('vimgolf_player_name', name);

            setResult({
                success: true,
                timeMs: result.timeMs,
                keystrokes: result.keystrokes,
                rank: result.rank,
                score: result.score,
                isNewBest: result.isNewBest
            });
        } catch (err) {
            setError(err.message);
            setResult({ success: false, error: err.message });
        } finally {
            setSubmitting(false);
            setShowNameInput(false);
            setIntermission(false);
        }
    }

    function handleNameSubmit(e) {
        e.preventDefault();
        if (playerName.trim() && window._pendingSubmission) {
            submitScore(window._pendingSubmission, playerName.trim());
            window._pendingSubmission = null;
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading challenge...</p>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div className="error-container">
                <h2>⚠️ Error</h2>
                <p>{error}</p>
                <button onClick={startChallenge}>Retry</button>
                <Link to="/" className="back-link">← Back to challenges</Link>
            </div>
        );
    }

    const challenge = session?.challenge;

    return (
        <div className="challenge-view">
            <div className="challenge-view-header">
                <Link to="/" className="back-btn">← Back</Link>
                <div className="challenge-info">
                    <h1>
                        <span className="challenge-id">#{challenge?.id}</span>
                        {challenge?.name}
                    </h1>
                    <span className={`difficulty-tag ${challenge?.difficulty}`}>
                        {challenge?.difficulty}
                    </span>
                </div>
                <div className="step-indicator">
                    Step {stepIndex + 1} / {totalSteps}
                </div>
                <Link to="/leaderboard" className="leaderboard-link">🏆 Leaderboard</Link>
            </div>

            <div className="instructions-panel">
                <h3>📋 Instructions</h3>
                <p>{challenge?.instructions}</p>
            </div>

            <div className="editor-container">
                {intermission && (
                    <div className="intermission-overlay">
                        <div className="intermission-content">
                            <h2>✅ Stage {stepIndex + 1} Complete!</h2>
                            <p>Preparing next stage...</p>
                        </div>
                    </div>
                )}

                {showNameInput && (
                    <div className="name-modal">
                        <div className="name-modal-content">
                            <h3>Enter Your Name</h3>
                            <form onSubmit={handleNameSubmit}>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="Your name"
                                    maxLength={50}
                                    autoFocus
                                />
                                <button type="submit" disabled={!playerName.trim()}>
                                    Submit Score
                                </button>
                                <button type="button" onClick={() => setShowNameInput(false)}>
                                    Cancel
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {result && (
                    <div className={`result-panel ${result.success ? 'success' : 'error'}`}>
                        {result.success ? (
                            <>
                                <h2>🎉 Challenge Complete!</h2>
                                {result.isNewBest && (
                                    <div className="new-highscore-badge">
                                        ✨ New high score! ✨
                                    </div>
                                )}
                                <div className="result-stats">
                                    <div className="stat">
                                        <span className="stat-value">{result.score}</span>
                                        <span className="stat-label">Score</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">{formatTime(result.timeMs)}</span>
                                        <span className="stat-label">Time</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">{result.keystrokes}</span>
                                        <span className="stat-label">Keystrokes</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">#{result.rank}</span>
                                        <span className="stat-label">Rank</span>
                                    </div>
                                </div>
                                <div className="result-actions">
                                    <button onClick={startChallenge} className="retry-btn">
                                        🔄 Try Again
                                    </button>
                                    <Link to={`/leaderboard?challenge=${challenge?.id}`} className="view-leaderboard-btn">
                                        🏆 View Leaderboard
                                    </Link>
                                    <Link to="/" className="next-challenge-btn">
                                        ➡️ Next Challenge
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>❌ Submission Failed</h2>
                                <p className="error-message">{result.error}</p>
                                <button onClick={startChallenge} className="retry-btn">
                                    🔄 Try Again
                                </button>
                            </>
                        )}
                    </div>
                )}

                {!result && !intermission && (
                    <VimEditor
                        initialContent={challenge?.initialContent || ''}
                        targetContent={challenge?.targetContent}
                        highlightWord={challenge?.highlightWord}
                        targetLine={challenge?.targetLine}
                        highlightType={challenge?.highlightType}
                        checkType={challenge?.checkType}
                        targetValue={challenge?.targetValue}
                        targetWord={challenge?.targetWord}
                        onKeystroke={handleKeystroke}
                        onStepComplete={handleStepComplete}
                        disabled={submitting || intermission}
                    />
                )}
            </div>

            {submitting && (
                <div className="submitting-overlay">
                    <div className="loading-spinner"></div>
                    <p>Validating submission...</p>
                </div>
            )}

            <div className="stats-bar">
                <span className="stat-item">
                    ⌨️ Keystrokes (Step): <strong>{keystrokeCount}</strong>
                </span>
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

export default ChallengeView;
