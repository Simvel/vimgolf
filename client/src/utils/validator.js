
/**
 * Validate that the submitted content matches the target
 */
export function validateContent(submitted, target, checkType) {
    if (!target) return true;

    // Normalize line endings
    const normalizedSubmitted = submitted.replace(/\r\n/g, '\n').trim();
    const normalizedTarget = target.replace(/\r\n/g, '\n').trim();

    if (checkType === 'content_match') {
        return normalizedSubmitted === normalizedTarget;
    }

    return true;
}

/**
 * Validate cursor position for navigation challenges
 */
export function validateCursorPosition(cursorPosition, content, checkType, targetValue, targetWord, targetLineArg) {
    const { line, col } = cursorPosition;
    const lines = content.split('\n');

    switch (checkType) {
        case 'cursor_line': {
            return line === targetValue;
        }

        case 'cursor_eol': {
            if (line !== targetValue) return false;
            const lineContent = lines[line - 1] || '';
            // Cursor at EOL is often length+1, but Vim's $ puts it on the last char (length)
            // So we allow both: sitting on the last char or being past it
            return col >= lineContent.length;
        }

        case 'cursor_bol': {
            if (line !== targetValue) return false;
            const lineContent = lines[line - 1] || '';
            const firstNonBlank = lineContent.search(/\S/);
            const expectedCol = firstNonBlank >= 0 ? firstNonBlank + 1 : 1;
            return col === expectedCol;
        }

        case 'cursor_word': {
            // Strict line check: cursor must be on the target line if specified
            if (targetLineArg && line !== targetLineArg) return false;

            if (!targetWord) return false;
            const lineContent = lines[line - 1] || '';
            const colIndex = col - 1; // 0-indexed

            const wordRegex = /\b\w+\b/g;
            let match;
            while ((match = wordRegex.exec(lineContent)) !== null) {
                const wordStart = match.index;
                const wordEnd = match.index + match[0].length;
                if (colIndex >= wordStart && colIndex < wordEnd) {
                    if (match[0].toLowerCase() === targetWord.toLowerCase()) {
                        return true;
                    }
                }
            }
            return false;
        }

        case 'cursor_paragraph': {
            // Simplified paragraph check: blank line separator
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
                    return true;
                }
            }
            return false;
        }

        default:
            return true;
    }
}
