// Challenge definitions with variation generators
// Each challenge has: id, name, difficulty, description, generate method
// Generate method returns an object with { steps: [], ... }

const EXPANDED_CODE_SAMPLE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const price = item.price;
    const quantity = item.quantity;
    total += price * quantity;
  }
  return total;
}

function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

function displayCart(items) {
  console.log("Shopping Cart:");
  console.log("==============");
  for (const item of items) {
    console.log(item.name + ": " + formatCurrency(item.price));
  }
  const total = calculateTotal(items);
  console.log("Total: " + formatCurrency(total));
}

const shoppingCart = [
  { name: "Apple", price: 1.50, quantity: 3, id: "p1" },
  { name: "Banana", price: 0.75, quantity: 6, id: "p2" },
  { name: "Orange", price: 2.00, quantity: 2, id: "p3" },
  { name: "Mango", price: 3.50, quantity: 1, id: "p4" },
  { name: "Grape", price: 5.00, quantity: 2, id: "p5" },
];

function applyDiscount(total, code) {
  if (code === 'SAVE10') {
    return total * 0.9;
  } else if (code === 'SAVE20') {
    return total * 0.8;
  }
  return total;
}

displayCart(shoppingCart);`;

const NAV_MIX_CODE = `function calculateMetric(data) {
    let result = 0;
    const factor = 1.5;
    
    // Process input data
    if (!data || data.length === 0) {
        return 0;
    }

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.isActive) {
            // Apply complex transformation
            const temp = (item.value * factor) + 10;
            result += Math.max(temp, 0);
        } else {
            result -= 1;
        }
    }

    /* 
       Final adjustment 
       based on threshold
    */
    if (result > 100) {
        result = 100;
    }

    return {
        total: result,
        valid: true
    };
}`;

// Random number in range (seeded)
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function randomInRange(seed, min, max) {
    return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

// Generate a random large file for navigation
function generateNavigationContent(seed) {
    const lines = [];
    const count = 100;
    for (let i = 1; i <= count; i++) {
        if (i % 10 === 0) {
            lines.push(`Line ${i}: [SECTION] Critical system marker #${randomInRange(seed + i, 1000, 9999)}`);
        } else if (i % 7 === 0) {
            lines.push(`Line ${i}: var data = { id: ${i}, value: "random_string_${randomInRange(seed + i, 100, 999)}" };`);
        } else {
            lines.push(`Line ${i}: This is standard log output line for navigation practice.`);
        }
    }
    return lines.join('\n');
}

const challenges = [
    {
        id: 1,
        name: "Navigation Flow",
        difficulty: "easy",
        description: "A chain of 5 navigation tasks. Move efficiently to the targets.",
        generate: (seed) => {
            const steps = [];
            const content = generateNavigationContent(seed);
            const numSteps = 5;

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 100;
                // Alternate between Line, Word, and End-of-Line targets
                const type = i % 3;
                let step = {
                    initialContent: content,
                    targetContent: content, // Content doesn't change in navigation
                    highlightType: 'target'
                };

                const lines = content.split('\n');

                if (type === 0) { // Line navigation
                    const targetLine = randomInRange(stepSeed, 5, 95);
                    step.instructions = `Move cursor to Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_line';
                    step.targetValue = targetLine;
                    step.highlightWord = null;
                    step.highlightColumn = null;
                } else if (type === 1) { // Word navigation
                    // Find a line with "data" or "SECTION"
                    let searchLine = randomInRange(stepSeed, 10, 90);
                    while (!lines[searchLine - 1].includes('data') && !lines[searchLine - 1].includes('SECTION')) {
                        searchLine++;
                        if (searchLine > 95) searchLine = 10;
                    }
                    const targetWord = lines[searchLine - 1].includes('SECTION') ? 'SECTION' : 'value';
                    step.instructions = `Find the word "${targetWord}" on Line ${searchLine}.`;
                    step.targetLine = searchLine;
                    step.checkType = 'cursor_word';
                    step.targetValue = targetWord;
                    step.targetWord = targetWord;
                    step.highlightWord = targetWord;
                    // Calculate column index (first occurrence)
                    step.highlightColumn = lines[searchLine - 1].indexOf(targetWord);
                } else { // End of line
                    const targetLine = randomInRange(stepSeed, 20, 80);
                    step.instructions = `Move cursor to the END of Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_eol';
                    step.targetValue = targetLine;
                    step.highlightWord = null;
                    step.highlightColumn = null;
                }
                steps.push(step);
            }

            return { steps };
        },
        timePar: 45000,
        keyPressesPar: 20
    },
    {
        id: 2,
        name: "Deletion Chain",
        difficulty: "medium",
        description: "Sequentially delete unwanted code from the file.",
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            const numSteps = 5;

            // Defines possible deletion targets
            // We find lines containing specific things and delete them or parts of them

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 50;
                const lines = currentContent.split('\n');

                // Find a non-empty line to delete or modify, preferably one that hasn't been touched?
                // For simplicity, we'll pick random lines that are "safe" to delete (e.g. valid lines)
                // To avoid breaking the code structure too much, we'll mostly target simple statements or comments if we added them.
                // But the user just wants "Delete X", it doesn't have to compile.

                let targetLineIdx = -1;
                let attempts = 0;
                while (targetLineIdx === -1 && attempts < 100) {
                    const idx = randomInRange(stepSeed + attempts, 1, lines.length - 2);
                    if (lines[idx].trim().length > 5) { // Ensure reasonable line
                        targetLineIdx = idx;
                    }
                    attempts++;
                }

                if (targetLineIdx === -1) targetLineIdx = 5; // Fallback

                const lineContent = lines[targetLineIdx];
                const type = i % 2; // 0 = delete line, 1 = delete word

                let nextContent = '';
                const step = {
                    startLine: targetLineIdx + 1, // hint
                    checkType: 'content_match',
                    highlightType: 'delete'
                };

                if (type === 0 || lineContent.length < 10) {
                    // Delete Line
                    const nextLines = [...lines];
                    nextLines.splice(targetLineIdx, 1);
                    nextContent = nextLines.join('\n');
                    step.instructions = `Delete line ${targetLineIdx + 1}: "${lineContent.trim()}"`;
                    step.targetLine = targetLineIdx + 1;
                } else {
                    // Delete Word
                    const wordsMap = [];
                    // Find all word instances with their indices
                    let match;
                    const wordRegex = /\b\w+\b/g;
                    while ((match = wordRegex.exec(lineContent)) !== null) {
                        // Only stick to words with length > 1 to avoid deleting single chars which might be variables like 'i'
                        // but user just said "stupid stuff like remove the "":"", so alphanumeric is better.
                        if (match[0].length > 1) {
                            wordsMap.push({ word: match[0], index: match.index });
                        }
                    }

                    if (wordsMap.length > 0) {
                        const targetObj = wordsMap[randomInRange(stepSeed, 0, wordsMap.length - 1)];
                        const wordToDelete = targetObj.word;

                        // We need to be careful about replacing only the specific instance if possible, 
                        // but the client highlights all instances usually. 
                        // For simplicity in this generator, we'll replace the first occurrence or just use replace() 
                        // which replaces the first one. 
                        // Ideally we should replace the specific one. 

                        // Let's reconstruct the line without that specific word instance
                        const prefix = lineContent.substring(0, targetObj.index);
                        const suffix = lineContent.substring(targetObj.index + wordToDelete.length);

                        // Also try to clean up one surrounding space if possible to make it look cleaner?
                        // If there is a space after, remove it. If not, try before.
                        let newLine = prefix + suffix;
                        if (suffix.startsWith(' ')) {
                            newLine = prefix + suffix.substring(1);
                        } else if (prefix.endsWith(' ')) {
                            newLine = prefix.substring(0, prefix.length - 1) + suffix;
                        }

                        const nextLines = [...lines];
                        nextLines[targetLineIdx] = newLine;
                        nextContent = nextLines.join('\n');

                        step.instructions = `Delete the word "${wordToDelete}" on line ${targetLineIdx + 1}.`;
                        step.highlightWord = wordToDelete;
                        step.highlightColumn = targetObj.index;
                        step.targetLine = targetLineIdx + 1;
                    } else {
                        // Fallback if no words found on line (unlikely given previous checks)
                        const nextLines = [...lines];
                        nextLines.splice(targetLineIdx, 1);
                        nextContent = nextLines.join('\n');
                        step.instructions = `Delete line ${targetLineIdx + 1}: "${lineContent.trim()}"`;
                        step.targetLine = targetLineIdx + 1;
                    }
                }

                step.initialContent = currentContent;
                step.targetContent = nextContent;
                steps.push(step);

                // Content for next step starts at this step's target
                currentContent = nextContent;
            }

            return { steps };
        },
        timePar: 60000,
        keyPressesPar: 30
    },
    {
        id: 3,
        name: "Refactor & Fix",
        difficulty: "hard",
        description: "A series of replacement and formatting tasks.",
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            const numSteps = 5;

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 77;
                const lines = currentContent.split('\n');

                let targetLineIdx = randomInRange(stepSeed, 1, lines.length - 2);
                let attempts = 0;
                while (lines[targetLineIdx].trim().length < 5 && attempts < 20) {
                    targetLineIdx = (targetLineIdx + 1) % lines.length;
                    attempts++;
                }

                const lineContent = lines[targetLineIdx];
                const words = lineContent.match(/\b\w+\b/g);

                const step = {
                    targetLine: targetLineIdx + 1,
                    checkType: 'content_match',
                    highlightType: 'change'
                };

                if (words && words.length > 0 && i % 2 === 0) {
                    // Change Word
                    const targetWord = words[randomInRange(stepSeed, 0, words.length - 1)];
                    const newWord = "UPDATED";
                    const newLine = lineContent.replace(targetWord, newWord);

                    const nextLines = [...lines];
                    nextLines[targetLineIdx] = newLine;

                    step.instructions = `Change "${targetWord}" to "${newWord}" on line ${targetLineIdx + 1}.`;
                    step.highlightWord = targetWord;
                    step.initialContent = currentContent;
                    step.targetContent = nextLines.join('\n');
                    currentContent = step.targetContent;
                } else {
                    // Surprise: Indent or Surround? Let's do Surround with parenthesis/quotes?
                    // Or simple append. Let's do Append to EOL.
                    const suffix = " // FIXED";
                    const newLine = lineContent + suffix;

                    const nextLines = [...lines];
                    nextLines[targetLineIdx] = newLine;

                    step.instructions = `Append "${suffix.trim()}" to the end of line ${targetLineIdx + 1}.`;
                    step.checkType = 'content_match';
                    step.highlightType = 'change';
                    step.initialContent = currentContent;
                    step.targetContent = nextLines.join('\n');
                    currentContent = step.targetContent;
                }
                steps.push(step);
            }

            return { steps };
        },
        timePar: 80000,
        keyPressesPar: 40
    },
    {
        id: 4,
        name: "Navigation Mix",
        difficulty: "easy",
        description: "Navigate using h, j, k, l, w, b, W, B. Follow the optimal path.",
        generate: (seed) => {
            const steps = [];
            const LINES = NAV_MIX_CODE.split('\n');
            const numSteps = 10;

            // Helper functions
            const isKeyword = (char) => /[a-zA-Z0-9_]/.test(char);

            const getChar = (lines, line, col) => {
                if (line < 0 || line >= lines.length) return null;
                const l = lines[line];
                if (col < 0 || col >= l.length) return null;
                return l[col];
            };

            const getLineLength = (lines, line) => {
                if (line < 0 || line >= lines.length) return 0;
                return lines[line].length;
            };

            const singleMove = (pos, type, lines) => {
                let { line, col } = pos;
                const lineStr = lines[line];
                const MAX_LINE = lines.length - 1;

                const getType = (l, c) => {
                    if (c >= getLineLength(lines, l)) return 0;
                    const char = getChar(lines, l, c);
                    if (char === ' ' || char === '\t') return 0;
                    if (isKeyword(char)) return 1;
                    return 2;
                };

                const advance = (l, c) => {
                    c++;
                    if (c >= getLineLength(lines, l)) {
                        if (l < MAX_LINE) return { l: l + 1, c: 0, wrapped: true };
                        return { l, c: getLineLength(lines, l) - 1, eof: true };
                    }
                    return { l, c };
                };

                const retreat = (l, c) => {
                    c--;
                    if (c < 0) {
                        if (l > 0) return { l: l - 1, c: Math.max(0, getLineLength(lines, l - 1) - 1), wrapped: true };
                        return { l, c: 0, bof: true };
                    }
                    return { l, c };
                };

                const isSpace = (l, c) => {
                    if (getLineLength(lines, l) === 0) return true;
                    if (c >= getLineLength(lines, l)) return true;
                    const char = getChar(lines, l, c);
                    return char === ' ' || char === '\t';
                };

                switch (type) {
                    case 'h': col = Math.max(0, col - 1); break;
                    case 'l': if (lineStr.length > 0) col = Math.min(lineStr.length - 1, col + 1); break;
                    case 'j':
                        line = Math.min(MAX_LINE, line + 1);
                        col = Math.min(Math.max(0, getLineLength(lines, line) - 1), col);
                        if (getLineLength(lines, line) === 0) col = 0;
                        break;
                    case 'k':
                        line = Math.max(0, line - 1);
                        col = Math.min(Math.max(0, getLineLength(lines, line) - 1), col);
                        if (getLineLength(lines, line) === 0) col = 0;
                        break;
                    case 'w':
                        if (getLineLength(lines, line) === 0) {
                            if (line < MAX_LINE) { line++; col = 0; }
                        } else {
                            let currType = getType(line, col);
                            let p = { l: line, c: col };
                            if (currType !== 0) {
                                while (true) {
                                    const next = advance(p.l, p.c);
                                    if (next.eof || next.wrapped) { p = next; break; }
                                    p = next;
                                    if (getType(p.l, p.c) !== currType) break;
                                }
                            }
                            while (true) {
                                if (p.l === MAX_LINE && p.c === getLineLength(lines, p.l) - 1) break;
                                if (getType(p.l, p.c) !== 0) break;
                                const next = advance(p.l, p.c);
                                if (next.eof) { p = next; break; }
                                p = next;
                            }
                            line = p.l; col = p.c;
                        }
                        break;
                    case 'W':
                        let p = { l: line, c: col };
                        if (getLineLength(lines, line) === 0) {
                            if (line < MAX_LINE) { line++; col = 0; }
                        } else {
                            if (!isSpace(p.l, p.c)) {
                                while (true) {
                                    const next = advance(p.l, p.c);
                                    if (next.eof || next.wrapped) { p = next; break; }
                                    p = next;
                                    if (isSpace(p.l, p.c)) break;
                                }
                            }
                            while (true) {
                                if (p.l === MAX_LINE && p.c === getLineLength(lines, p.l) - 1) break;
                                if (!isSpace(p.l, p.c)) break;
                                const next = advance(p.l, p.c);
                                if (next.eof) { p = next; break; }
                                p = next;
                            }
                            line = p.l; col = p.c;
                        }
                        break;
                    case 'b':
                        {
                            const startP = retreat(line, col);
                            if (startP.bof) { line = startP.l; col = startP.c; break; }

                            let p = startP;
                            // 1. Skip spaces backwards
                            while (true) {
                                if (getType(p.l, p.c) !== 0 && getType(p.l, p.c) !== 3) break; // Found non-space
                                const prev = retreat(p.l, p.c);
                                if (prev.bof) { p = prev; break; }
                                p = prev;
                            }

                            // 2. Go to start of word
                            const targetType = getType(p.l, p.c);
                            if (targetType !== 0 && targetType !== 3) {
                                while (true) {
                                    const prev = retreat(p.l, p.c);
                                    if (prev.bof || prev.wrapped || getType(prev.l, prev.c) !== targetType) break;
                                    p = prev;
                                }
                            }
                            line = p.l; col = p.c;
                        }
                        break;
                    case 'B':
                        {
                            const startP = retreat(line, col);
                            if (startP.bof) { line = startP.l; col = startP.c; break; }

                            let p = startP;
                            // 1. Skip spaces backwards
                            while (true) {
                                if (!isSpace(p.l, p.c) && getLineLength(lines, p.l) > 0) break;
                                const prev = retreat(p.l, p.c);
                                if (prev.bof) { p = prev; break; }
                                p = prev;
                            }

                            // 2. Go to start of WORD
                            if (getLineLength(lines, p.l) > 0 && !isSpace(p.l, p.c)) {
                                while (true) {
                                    const prev = retreat(p.l, p.c);
                                    if (prev.bof || prev.wrapped || isSpace(prev.l, prev.c)) break;
                                    p = prev;
                                }
                            }
                            line = p.l; col = p.c;
                        }
                        break;
                }
                return { line, col };
            };

            const move = (pos, type, count, lines) => {
                let current = { ...pos };
                for (let c = 0; c < count; c++) {
                    current = singleMove(current, type, lines);
                }
                return current;
            };

            let currentPos = { line: 0, col: 0 };
            const history = [];
            const typesHistory = { chars: 0, words: 0, bigwords: 0, lines: 0 };

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 111;

                let typeWeights = { 'h': 1, 'l': 1, 'w': 1, 'b': 1, 'W': 1, 'B': 1, 'j': 1, 'k': 1 };
                let countWeights = { 1: 10, 2: 5, 3: 5 };

                if (history.length > 0) {
                    const last = history[history.length - 1];
                    if (last.count === 3) {
                        countWeights[3] = 1;
                        countWeights[1] = 20;
                    }
                }
                if (typesHistory.words > (typesHistory.chars + typesHistory.lines + 2)) {
                    typeWeights['w'] = 0.5; typeWeights['b'] = 0.5;
                }
                if (typesHistory.lines > (typesHistory.chars + typesHistory.words + 2)) {
                    typeWeights['j'] = 0.5; typeWeights['k'] = 0.5;
                }

                let type, count, nextPos;
                let attempts = 0;

                // Retry until we find a move that actually changes position
                do {
                    attempts++;
                    const types = Object.keys(typeWeights);
                    const typePool = [];
                    for (const t of types) {
                        const w = Math.ceil(typeWeights[t] * 10);
                        for (let k = 0; k < w; k++) typePool.push(t);
                    }
                    type = typePool[randomInRange(stepSeed + attempts, 0, typePool.length - 1)];

                    const counts = Object.keys(countWeights);
                    const countPool = [];
                    for (const c of counts) {
                        const w = countWeights[c];
                        for (let k = 0; k < w; k++) countPool.push(parseInt(c));
                    }
                    count = countPool[randomInRange(stepSeed + attempts + 1, 0, countPool.length - 1)];

                    nextPos = move(currentPos, type, count, LINES);
                } while (
                    (nextPos.line === currentPos.line && nextPos.col === currentPos.col) &&
                    attempts < 50
                );

                history.push({ type, count });
                if ('hl'.includes(type)) typesHistory.chars++;
                else if ('wb'.includes(type)) typesHistory.words++;
                else if ('WB'.includes(type)) typesHistory.bigwords++;
                else typesHistory.lines++;

                const targetChar = getChar(LINES, nextPos.line, nextPos.col);
                const displayChar = targetChar === ' ' ? '<SPACE>' : (targetChar === '\\t' ? '<TAB>' : targetChar);
                // Ensure we highlight the newline if we are somehow at the end? (Vim usually sits on last char, not after)
                // But getChar checks bounds.

                const step = {
                    initialContent: NAV_MIX_CODE,
                    targetContent: NAV_MIX_CODE,
                    instructions: `Move to character '${displayChar}' at Line ${nextPos.line + 1}, Column ${nextPos.col + 1} (Hint: try ${count}${type})`,
                    checkType: 'cursor_position',
                    targetValue: { line: nextPos.line + 1, col: nextPos.col + 1 },
                    initialCursor: { line: currentPos.line + 1, col: currentPos.col + 1 },
                    targetLine: nextPos.line + 1,
                    highlightColumn: nextPos.col, // 0-indexed column
                    highlightType: 'target'
                };

                steps.push(step);
                currentPos = nextPos;
            }

            return { steps };
        },
        timePar: 60000,
        keyPressesPar: 25
    }
];

export function getChallengeList() {
    return challenges.map(c => ({
        id: c.id,
        name: c.name,
        difficulty: c.difficulty,
        description: c.description,
        timePar: c.timePar,
        keyPressesPar: c.keyPressesPar
    }));
}

export function generateChallenge(challengeId, seed) {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return null;

    const generated = challenge.generate(seed);
    return {
        id: challenge.id,
        name: challenge.name,
        difficulty: challenge.difficulty,
        description: challenge.description,
        timePar: challenge.timePar,
        keyPressesPar: challenge.keyPressesPar,
        ...generated // Contains { steps: [...] }
    };
}

export default challenges;
