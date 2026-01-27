import crypto from 'crypto';

const SECRET_KEY = process.env.SESSION_SECRET || 'vimgolf-ctf-secret-key-change-in-production';

/**
 * Generate a cryptographically signed session token
 */
export function generateSessionToken(sessionId, challengeId, seed) {
    const data = `${sessionId}:${challengeId}:${seed}`;
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
    return `${data}:${signature}`;
}

/**
 * Verify and parse a session token
 */
export function verifySessionToken(token) {
    const parts = token.split(':');
    if (parts.length !== 4) return null;

    const [sessionId, challengeId, seed, signature] = parts;
    const data = `${sessionId}:${challengeId}:${seed}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');

    if (signature !== expectedSignature) return null;

    return {
        sessionId,
        challengeId: parseInt(challengeId),
        seed: parseInt(seed)
    };
}

/**
 * Validate keystroke timing to detect automation
 * Returns { valid: boolean, reason?: string }
 */
export function validateKeystrokeTiming(keystrokes) {
    console.log(`Validating ${keystrokes?.length || 0} keystrokes...`);
    if (!Array.isArray(keystrokes) || keystrokes.length === 0) {
        console.warn('Validation failed: No keystrokes provided');
        return { valid: false, reason: 'No keystrokes provided' };
    }

    // Check that all keystrokes have required fields
    for (const ks of keystrokes) {
        if (!ks.key || typeof ks.timestamp !== 'number') {
            console.warn('Validation failed: Invalid keystroke format', ks);
            return { valid: false, reason: 'Invalid keystroke format' };
        }
    }

    // Sort by timestamp
    const sorted = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);

    // Helper to log detailed failure info
    const logFailure = (message, subset) => {
        const details = subset.map((k, i) => {
            if (i === 0) return `${k.key}@${k.timestamp}ms`;
            const gap = k.timestamp - subset[i - 1].timestamp;
            return `(+${gap}ms) -> ${k.key}@${k.timestamp}ms`;
        });
        console.warn(`Validation failed: ${message}`);
        console.warn(`Sequence details: ${details.join(' ')}`);
        console.warn(`Full raw data for window:`, JSON.stringify(subset));
    };

    // Check: no 10 consecutive keystrokes in less than 1 second
    const WINDOW_SIZE = 10;
    const MIN_WINDOW_TIME = 1000; // 1 second in ms

    for (let i = 0; i <= sorted.length - WINDOW_SIZE; i++) {
        const windowStart = sorted[i].timestamp;
        const windowEnd = sorted[i + WINDOW_SIZE - 1].timestamp;
        const windowDuration = windowEnd - windowStart;

        if (windowDuration < MIN_WINDOW_TIME) {
            const reason = `Suspicious timing: ${WINDOW_SIZE} keystrokes in ${windowDuration}ms (minimum ${MIN_WINDOW_TIME}ms required)`;
            logFailure(reason, sorted.slice(i, i + WINDOW_SIZE));
            return {
                valid: false,
                reason: reason
            };
        }
    }

    // Check that any 4 consecutive keystrokes span at least 200ms
    const SMALL_WINDOW_SIZE = 4;
    const MIN_SMALL_WINDOW_TIME = 200; // 200ms minimum for 4 keystrokes

    for (let i = 0; i <= sorted.length - SMALL_WINDOW_SIZE; i++) {
        const windowStart = sorted[i].timestamp;
        const windowEnd = sorted[i + SMALL_WINDOW_SIZE - 1].timestamp;
        const windowDuration = windowEnd - windowStart;

        if (windowDuration < MIN_SMALL_WINDOW_TIME) {
            const reason = `Suspicious timing: ${SMALL_WINDOW_SIZE} keystrokes in ${windowDuration}ms (minimum ${MIN_SMALL_WINDOW_TIME}ms required)`;
            logFailure(reason, sorted.slice(i, i + SMALL_WINDOW_SIZE));
            return {
                valid: false,
                reason: reason
            };
        }
    }

    // Check for macro-like patterns (exact same intervals repeatedly)
    if (sorted.length >= 6) {
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            intervals.push(sorted[i].timestamp - sorted[i - 1].timestamp);
        }

        // Look for 5+ consecutive identical intervals (within 5ms tolerance)
        let consecutiveIdentical = 1;
        for (let i = 1; i < intervals.length; i++) {
            if (Math.abs(intervals[i] - intervals[i - 1]) <= 5) {
                consecutiveIdentical++;
                if (consecutiveIdentical >= 5) {
                    const reason = 'Macro-like pattern detected: too many identical intervals';
                    // Extract the relevant subset for logging (approximate location)
                    const subStart = Math.max(0, i - 6);
                    const subEnd = Math.min(sorted.length, i + 2);
                    logFailure(reason, sorted.slice(subStart, subEnd));

                    return {
                        valid: false,
                        reason: reason
                    };
                }
            } else {
                consecutiveIdentical = 1;
            }
        }
    }

    console.log('Keystroke timing validation passed');
    return { valid: true };
}

/**
 * Validate that the submitted content matches the target
 */
export function validateContent(submitted, target, checkType, targetValue) {
    // Normalize line endings
    const normalizedSubmitted = submitted.replace(/\r\n/g, '\n').trim();
    const normalizedTarget = target.replace(/\r\n/g, '\n').trim();

    if (checkType === 'content_match') {
        if (normalizedSubmitted !== normalizedTarget) {
            console.log('Content mismatch detected:');
            console.log('Submitted length:', normalizedSubmitted.length);
            console.log('Target length:', normalizedTarget.length);

            // Find first difference
            const maxLen = Math.max(normalizedSubmitted.length, normalizedTarget.length);
            for (let i = 0; i < maxLen; i++) {
                if (normalizedSubmitted[i] !== normalizedTarget[i]) {
                    const subChar = normalizedSubmitted[i] ? `'${normalizedSubmitted[i]}' (code: ${normalizedSubmitted.charCodeAt(i)})` : 'undefined';
                    const tarChar = normalizedTarget[i] ? `'${normalizedTarget[i]}' (code: ${normalizedTarget.charCodeAt(i)})` : 'undefined';
                    console.log(`First diff at char ${i}:`);
                    console.log(`  Submitted: ${subChar}`);
                    console.log(`  Target:    ${tarChar}`);
                    console.log(`  Context submitted: '${normalizedSubmitted.substring(Math.max(0, i - 10), i + 20)}'`);
                    console.log(`  Context target:    '${normalizedTarget.substring(Math.max(0, i - 10), i + 20)}'`);
                    break;
                }
            }
            return false;
        }
        return true;
    }

    return true;
}

/**
 * Validate cursor position for navigation challenges
 */
export function validateCursorPosition(cursorPosition, content, checkType, targetValue, targetWord) {
    const { line, col } = cursorPosition;
    const lines = content.split('\n');

    console.log(`Validating cursor position: line=${line}, col=${col}, checkType=${checkType}, targetValue=${targetValue}`);

    switch (checkType) {
        case 'cursor_line': {
            // Just check if cursor is on the correct line
            if (line === targetValue) {
                return { valid: true };
            }
            return {
                valid: false,
                reason: `Cursor should be on line ${targetValue}, but is on line ${line}`
            };
        }

        case 'cursor_eol': {
            // Check if cursor is at end of the specified line
            if (line !== targetValue) {
                return {
                    valid: false,
                    reason: `Cursor should be on line ${targetValue}, but is on line ${line}`
                };
            }
            const lineContent = lines[line - 1] || '';
            const expectedCol = lineContent.length + 1; // End of line (1-indexed, after last char)
            // Allow col to be at or past the last character
            if (col >= lineContent.length) {
                return { valid: true };
            }
            return {
                valid: false,
                reason: `Cursor should be at end of line ${targetValue} (col ${expectedCol}), but is at col ${col}`
            };
        }

        case 'cursor_bol': {
            // Check if cursor is at beginning (first non-blank) of the specified line
            if (line !== targetValue) {
                return {
                    valid: false,
                    reason: `Cursor should be on line ${targetValue}, but is on line ${line}`
                };
            }
            const lineContent = lines[line - 1] || '';
            const firstNonBlank = lineContent.search(/\S/);
            const expectedCol = firstNonBlank >= 0 ? firstNonBlank + 1 : 1;
            if (col === expectedCol) {
                return { valid: true };
            }
            return {
                valid: false,
                reason: `Cursor should be at first non-blank char of line ${targetValue} (col ${expectedCol}), but is at col ${col}`
            };
        }

        case 'cursor_word': {
            // Check if cursor is on the target word
            if (!targetWord) {
                return { valid: false, reason: 'No target word specified' };
            }
            const lineContent = lines[line - 1] || '';
            const colIndex = col - 1; // Convert to 0-indexed

            // Find the word at cursor position
            const wordRegex = /\b\w+\b/g;
            let match;
            while ((match = wordRegex.exec(lineContent)) !== null) {
                const wordStart = match.index;
                const wordEnd = match.index + match[0].length;
                if (colIndex >= wordStart && colIndex < wordEnd) {
                    if (match[0].toLowerCase() === targetWord.toLowerCase()) {
                        return { valid: true };
                    }
                    return {
                        valid: false,
                        reason: `Cursor is on word "${match[0]}", but should be on "${targetWord}"`
                    };
                }
            }
            return {
                valid: false,
                reason: `Could not find cursor on word "${targetWord}"`
            };
        }

        case 'cursor_paragraph': {
            // Check if cursor is at the beginning of the target paragraph
            // This is more complex - paragraphs are separated by blank lines
            let currentParagraph = 0;
            let paragraphStartLine = 1;
            let inParagraph = false;

            for (let i = 0; i < lines.length; i++) {
                const isBlank = lines[i].trim() === '';
                if (!isBlank && !inParagraph) {
                    currentParagraph++;
                    paragraphStartLine = i + 1;
                    inParagraph = true;
                } else if (isBlank) {
                    inParagraph = false;
                }

                if (currentParagraph === targetValue && line === paragraphStartLine) {
                    return { valid: true };
                }
            }

            return {
                valid: false,
                reason: `Cursor should be at the start of paragraph ${targetValue}`
            };
        }

        default:
            console.warn(`Unknown cursor check type: ${checkType}`);
            return { valid: true }; // Unknown types pass by default
    }
}

/**
 * Calculate total time from keystroke data
 */
export function calculateTime(keystrokes) {
    if (!keystrokes || keystrokes.length < 2) return 0;

    const sorted = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
}
