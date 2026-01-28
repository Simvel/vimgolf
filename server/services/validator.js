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
    // Disabled validation as per user request
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

        case 'cursor_position': {
            // Check if cursor is at specific line and column
            // targetValue should be an object { line, col } or encoded somehow if needed.
            // But we can expect targetValue to be the object passed from generateChallenge.
            // However, typical usage passes a primitive.
            // Let's assume targetValue is the object { line, col }

            // Note: input 'line' is 1-indexed (from client usually).
            // targetValue.line should be 1-indexed.
            // targetValue.col should be 1-indexed (Vim columns are 1-indexed visibly, 0-indexed internally but client sends 1-indexed usually? 
            // Let's check cursor_eol: expectedCol = lineContent.length + 1. So 1-indexed.

            const targetLine = targetValue.line;
            const targetCol = targetValue.col;

            if (line !== targetLine) {
                return {
                    valid: false,
                    reason: `Cursor should be on line ${targetLine}, but is on line ${line}`
                };
            }
            if (col !== targetCol) {
                // Get char at target for context
                const l = lines[targetLine - 1] || '';
                const formatChar = (c) => c === ' ' ? '<SPACE>' : (c === '\t' ? '<TAB>' : c);
                const targetChar = l[targetCol - 1]; // 0-indexed access
                const actualChar = l[col - 1];

                return {
                    valid: false,
                    reason: `Cursor should be at col ${targetCol} ('${formatChar(targetChar)}'), but is at col ${col} ('${formatChar(actualChar)}')`
                };
            }
            return { valid: true };
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
