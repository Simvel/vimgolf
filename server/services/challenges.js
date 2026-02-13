// Challenge definitions with variation generators
// Each challenge has: id, name, difficulty, description, generate method
// Generate method returns an object with { steps: [], ... }

const EXPANDED_CODE_SAMPLE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    total += item.price * item.quantity;
  }
  return total;
}

function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

function displayCart(items) {
  console.log("Shopping Cart:");
  for (const item of items) {
    console.log(item.name + ": " + formatCurrency(item.price));
  }
  const total = calculateTotal(items);
}

const shoppingCart = [
  { name: "Apple", price: 1.50, quantity: 3, id: "p1" },
  { name: "Banana", price: 0.75, quantity: 6, id: "p2" },
  { name: "Orange", price: 2.00, quantity: 2, id: "p3" },
  { name: "Mango", price: 3.50, quantity: 1, id: "p4" }
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

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
Nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor.`;

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
    const count = 30;
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
        name: "Navigation A",
        difficulty: "easy",
        description: "Navigate using h, j, k, l, w, b, W, B. Follow the optimal path.",
        help: [
            {
                title: "Advanced Navigation",
                content: "<ul><li><code>W</code>: Jump forward by WORD (space-separated)</li><li><code>B</code>: Jump backward by WORD</li><li><code>f{char}</code>: Find occurrence of {char} to the right</li><li><code>t{char}</code>: Move 'till' occurrence of {char} to the right</li><li><code>;</code>: Repeat latest f, t, F or T</li><li><code>}</code>: Jump forward by paragraph</li></ul>"
            }
        ],
        generate: (seed) => {
            console.log('--- Generating Challenge 4 --- Seed:', seed);
            const steps = [];
            const LINES = NAV_MIX_CODE.split('\n');
            const numSteps = 15;

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
                console.log('singleMove', type, pos.line, pos.col); // Reduced verbosity
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
                                let loopSafety = 0;
                                while (true) {
                                    if (loopSafety++ > 1000) { console.error('Break loop A'); break; }
                                    const next = advance(p.l, p.c);
                                    if (next.eof || next.wrapped) { p = next; break; }
                                    p = next;
                                    if (getType(p.l, p.c) !== currType) break;
                                }
                            }
                            let loopSafety = 0;
                            while (true) {
                                if (loopSafety++ > 1000) { console.error('Break loop B'); break; }
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
                                let loopSafety = 0;
                                while (true) {
                                    if (loopSafety++ > 1000) { console.error('Break loop C'); break; }
                                    const next = advance(p.l, p.c);
                                    if (next.eof || next.wrapped) { p = next; break; }
                                    p = next;
                                    if (isSpace(p.l, p.c)) break;
                                }
                            }
                            let loopSafety = 0;
                            while (true) {
                                if (loopSafety++ > 1000) { console.error('Break loop D'); break; }
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
                            let loopSafety = 0;
                            while (true) {
                                if (loopSafety++ > 1000) { console.error('Break loop E'); break; }
                                if (getType(p.l, p.c) !== 0 && getType(p.l, p.c) !== 3) break; // Found non-space
                                const prev = retreat(p.l, p.c);
                                if (prev.bof) { p = prev; break; }
                                p = prev;
                            }

                            // 2. Go to start of word
                            const targetType = getType(p.l, p.c);
                            if (targetType !== 0 && targetType !== 3) {
                                loopSafety = 0;
                                while (true) {
                                    if (loopSafety++ > 1000) { console.error('Break loop F'); break; }
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
                            let loopSafety = 0;
                            while (true) {
                                if (loopSafety++ > 1000) { console.error('Break loop G'); break; }
                                if (!isSpace(p.l, p.c) && getLineLength(lines, p.l) > 0) break;
                                const prev = retreat(p.l, p.c);
                                if (prev.bof) { p = prev; break; }
                                p = prev;
                            }

                            // 2. Go to start of WORD
                            if (getLineLength(lines, p.l) > 0 && !isSpace(p.l, p.c)) {
                                loopSafety = 0;
                                while (true) {
                                    if (loopSafety++ > 1000) { console.error('Break loop H'); break; }
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
                console.log('Gen Step', i);
                const stepSeed = seed + i * 111;

                let typeWeights = { 'h': 1, 'l': 1, 'w': 1, 'b': 1, 'W': 1, 'B': 1, 'j': 1, 'k': 1 };
                let countWeights = { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0 };

                // Penalize counts that have been used already
                for (const h of history) {
                    if (countWeights[h.count] !== undefined) {
                        countWeights[h.count] *= 0.5;
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
                    console.log('Attempt', attempts);
                    attempts++;
                    const types = Object.keys(typeWeights);
                    const typePool = [];
                    for (const t of types) {
                        const w = Math.ceil(typeWeights[t] * 10);
                        for (let k = 0; k < w; k++) typePool.push(t);
                    }
                    if (typePool.length === 0) console.error('CRITICAL: TypePool empty!');

                    type = typePool[randomInRange(stepSeed + attempts, 0, typePool.length - 1)];

                    const counts = Object.keys(countWeights);
                    const countPool = [];
                    for (const c of counts) {
                        const w = Math.ceil(countWeights[c] * 100);
                        for (let k = 0; k < w; k++) countPool.push(parseInt(c));
                    }
                    if (countPool.length === 0) console.error('CRITICAL: CountPool empty!');

                    count = countPool[randomInRange(stepSeed + attempts + 1, 0, countPool.length - 1)];

                    console.log(`Trying move: ${count}${type}`);

                    nextPos = move(currentPos, type, count, LINES);
                    console.log('Result pos:', nextPos);
                } while (
                    (nextPos.line === currentPos.line && nextPos.col === currentPos.col) &&
                    attempts < 20
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
                    instructions: `Move to character '${displayChar}' at Line ${nextPos.line + 1}, Column ${nextPos.col + 1}`,
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
        timePar: 30000,
        keyPressesPar: 26
    },
    {
        id: 2,
        name: "Navigation B",
        difficulty: "easy",
        description: "A chain of 5 navigation tasks. Move efficiently to the targets.",
        help: [
            {
                title: "Navigation Basics",
                content: "<ul><li><code>h</code>, <code>j</code>, <code>k</code>, <code>l</code>: Move Left, Down, Up, Right</li><li><code>w</code>: Jump forward to start of word</li><li><code>b</code>: Jump backward to start of word</li><li><code>0</code>: Jump to start of line</li><li><code>$</code>: Jump to end of line</li><li><code>gg</code>: Go to first line</li><li><code>G</code>: Go to last line</li><li><code>%</code>: Move to matching bracket</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];
            const content = generateNavigationContent(seed);
            const numSteps = 10;
            const lines = content.split('\n');

            // Create a pool of tasks: 2 of each type (0-4), total 10.
            const taskTypes = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];

            // Shuffle taskTypes deterministically
            for (let i = taskTypes.length - 1; i > 0; i--) {
                const j = randomInRange(seed + i * 777, 0, i);
                [taskTypes[i], taskTypes[j]] = [taskTypes[j], taskTypes[i]];
            }

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 100;
                const type = taskTypes[i];
                let step = {
                    initialContent: content,
                    targetContent: content,
                    highlightType: 'target'
                };

                if (type === 0) { // Line navigation
                    const targetLine = randomInRange(stepSeed, 5, 29);
                    step.instructions = `Move cursor to Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_line';
                    step.targetValue = targetLine;
                } else if (type === 1) { // Word navigation
                    let searchLine = randomInRange(stepSeed, 10, 27);
                    let attempts = 0;
                    while (!lines[searchLine - 1].includes('data') && !lines[searchLine - 1].includes('SECTION') && attempts < 20) {
                        searchLine++;
                        if (searchLine > 28) searchLine = 10;
                        attempts++;
                    }
                    const targetWord = lines[searchLine - 1].includes('SECTION') ? 'SECTION' : 'value';
                    step.instructions = `Find the word "${targetWord}" on Line ${searchLine}.`;
                    step.targetLine = searchLine;
                    step.checkType = 'cursor_word';
                    step.targetValue = targetWord;
                    step.targetWord = targetWord;
                    step.highlightWord = targetWord;
                    step.highlightColumn = lines[searchLine - 1].indexOf(targetWord);
                } else if (type === 2) { // End of line
                    const targetLine = randomInRange(stepSeed, 13, 28);
                    step.instructions = `Move cursor to the END of Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_eol';
                    step.targetValue = targetLine;
                } else if (type === 3) { // Last line
                    const targetLine = lines.length;
                    step.instructions = "Move cursor to the last line.";
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_line';
                    step.targetValue = targetLine;
                } else if (type === 4) { // Matching bracket
                    // Find a line with {} brackets (no [])
                    const candidates = [];
                    for (let l = 0; l < lines.length; l++) {
                        if (lines[l].includes('{')) candidates.push({ lineIdx: l, open: '{', close: '}' });
                    }

                    let chosen = { lineIdx: 9, open: '{', close: '}' }; // Default fallback
                    if (candidates.length > 0) {
                        chosen = candidates[randomInRange(stepSeed, 0, candidates.length - 1)];
                    }

                    const lineContent = lines[chosen.lineIdx];
                    const openIdx = lineContent.indexOf(chosen.open);
                    const closeIdx = lineContent.indexOf(chosen.close, openIdx);

                    step.instructions = `Move to the matching bracket of "${chosen.open}" on Line ${chosen.lineIdx + 1}.`;

                    // Force start at opening bracket
                    step.initialCursor = { line: chosen.lineIdx + 1, col: openIdx + 1 };

                    step.targetLine = chosen.lineIdx + 1;
                    step.checkType = 'cursor_position';
                    step.targetValue = { line: chosen.lineIdx + 1, col: closeIdx + 1 };
                    step.highlightColumn = closeIdx;
                    step.highlightWord = chosen.close;
                }
                steps.push(step);
            }

            return { steps };

        },
        timePar: 25000,
        keyPressesPar: 27
    },
    {
        id: 3,
        name: "Deletion A",
        difficulty: "easy",
        description: "Sequentially delete unwanted code from the file.",
        help: [
            {
                title: "Deletion Commands",
                content: "<ul><li><code>x</code>: Delete character under cursor</li><li><code>dd</code>: Delete (cut) current line</li><li><code>dw</code>: Delete (cut) from cursor to next word start</li><li><code>u</code>: Undo change</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            const numSteps = 6;

            // Create a pool of tasks: 2 of each type (0-2)
            const taskTypes = [0, 0, 1, 1, 2, 2];

            // Shuffle taskTypes deterministically
            for (let i = taskTypes.length - 1; i > 0; i--) {
                const j = randomInRange(seed + i * 777, 0, i);
                [taskTypes[i], taskTypes[j]] = [taskTypes[j], taskTypes[i]];
            }

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 50;
                const type = taskTypes[i];
                const lines = currentContent.split('\n');

                let step = {
                    checkType: 'content_match',
                    highlightType: 'delete'
                };

                let nextContent = '';
                let validStep = false;
                let targetLineIdx = -1;

                if (type === 0) {
                    // Type 0: Delete Line
                    let attempts = 0;
                    while (targetLineIdx === -1 && attempts < 100) {
                        // Avoid first/last lines if possible
                        const idx = randomInRange(stepSeed + attempts, 1, lines.length - 2);
                        if (lines[idx].trim().length > 5) {
                            targetLineIdx = idx;
                        }
                        attempts++;
                    }
                    if (targetLineIdx === -1) targetLineIdx = 5;

                    const lineContent = lines[targetLineIdx];
                    const nextLines = [...lines];
                    nextLines.splice(targetLineIdx, 1);
                    nextContent = nextLines.join('\n');

                    step.instructions = `Delete line ${targetLineIdx + 1}: "${lineContent.trim()}"`;
                    step.targetLine = targetLineIdx + 1;
                    step.startLine = targetLineIdx + 1;
                    validStep = true;

                } else if (type === 1) {
                    // Type 1: Delete Word
                    // Find a line that has words
                    let attempts = 0;
                    while (targetLineIdx === -1 && attempts < 100) {
                        const idx = randomInRange(stepSeed + attempts + 1000, 1, lines.length - 2);
                        if (lines[idx].trim().length > 10) {
                            // Must have at least one word > 2 chars
                            if (/\b\w{3,}\b/.test(lines[idx])) targetLineIdx = idx;
                        }
                        attempts++;
                    }
                    if (targetLineIdx === -1) targetLineIdx = 7;

                    const lineContent = lines[targetLineIdx];
                    const wordsMap = [];
                    let match;
                    const wordRegex = /\b\w+\b/g;
                    while ((match = wordRegex.exec(lineContent)) !== null) {
                        if (match[0].length > 2) {
                            wordsMap.push({ word: match[0], index: match.index });
                        }
                    }

                    if (wordsMap.length > 0) {
                        const targetObj = wordsMap[randomInRange(stepSeed, 0, wordsMap.length - 1)];
                        const wordToDelete = targetObj.word;

                        // Vim dw logic simulation
                        const prefix = lineContent.substring(0, targetObj.index);
                        const suffix = lineContent.substring(targetObj.index + wordToDelete.length);
                        let newLine;

                        if (suffix.startsWith(' ')) {
                            newLine = prefix + suffix.substring(1);
                        } else {
                            newLine = prefix + suffix;
                        }

                        const nextLines = [...lines];
                        nextLines[targetLineIdx] = newLine;
                        nextContent = nextLines.join('\n');

                        step.instructions = `Delete the word "${wordToDelete}" on line ${targetLineIdx + 1}.`;
                        step.highlightWord = wordToDelete;
                        step.highlightColumn = targetObj.index;
                        step.targetLine = targetLineIdx + 1;
                        step.startLine = targetLineIdx + 1;
                        validStep = true;
                    }
                } else if (type === 2) {
                    // Type 2: Delete 's' from 'items'
                    const candidates = [];
                    for (let l = 0; l < lines.length; l++) {
                        let match;
                        const regex = /items/g;
                        while ((match = regex.exec(lines[l])) !== null) {
                            if (match[0] === 'items') {
                                candidates.push({ line: l, index: match.index, word: match[0] });
                            }
                        }
                    }

                    if (candidates.length > 0) {
                        const choice = candidates[randomInRange(stepSeed, 0, candidates.length - 1)];
                        const lineContent = lines[choice.line];

                        // The 's' is at choice.index + 4 ("items" is 5 chars, indices 0-4)
                        const sIndex = choice.index + 4;
                        const sChar = lineContent[sIndex];

                        if (sChar === 's') {
                            // Delete just the 's'
                            const newLine = lineContent.substring(0, sIndex) + lineContent.substring(sIndex + 1);

                            const nextLines = [...lines];
                            nextLines[choice.line] = newLine;
                            nextContent = nextLines.join('\n');

                            step.instructions = `Go to "${choice.word}" on line ${choice.line + 1} and delete the "s" at the end.`;
                            step.highlightWord = "s"; // Highlighting just the 's'
                            step.highlightColumn = sIndex;
                            step.targetLine = choice.line + 1;
                            step.startLine = choice.line + 1;
                            validStep = true;
                        }
                    }
                }

                // Fallback
                if (!validStep) {
                    const fallbackIdx = 6;
                    const nextLines = [...lines];
                    if (nextLines.length > fallbackIdx) {
                        nextLines.splice(fallbackIdx, 1);
                        nextContent = nextLines.join('\n');
                        step.instructions = `Delete line ${fallbackIdx + 1}.`;
                        step.targetLine = fallbackIdx + 1;
                        step.startLine = fallbackIdx + 1;
                    } else {
                        // Extremely unlikely fallback
                        nextContent = currentContent;
                    }
                }

                step.initialContent = currentContent;
                step.targetContent = nextContent;
                steps.push(step);
                currentContent = nextContent;
            }

            return { steps };
        },
        timePar: 22000,
        keyPressesPar: 33
    },
    {
        id: 4,
        name: "Refactor",
        difficulty: "easy",
        description: "A series of replacement and formatting tasks.",
        help: [
            {
                title: "Changing Text",
                content: "<ul><li><code>r</code>: Replace single character</li><li><code>cw</code>: Change word (delete word and enter insert mode)</li><li><code>cc</code>: Change entire line</li><li><code>C</code>: Change from cursor to end of line</li><li><code>A</code>: Append text at end of line</li><li><code>I</code>: Insert text at start of line</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            const numSteps = 6;

            // 1. Replacements / Suffixes
            const REPLACEMENTS = ["quack", "Lorem", "ipsum"];
            const SUFFIXES = ["// TODO", "// WTF?", "// NOTE"];

            // 2. Line Replacements
            const NEW_LINES = ["return;", "let cc;", "var bob;"];
            const taskTypes = [0, 0, 1, 1, 2, 2];

            // Shuffle types
            for (let i = taskTypes.length - 1; i > 0; i--) {
                const j = randomInRange(seed + i * 99, 0, i);
                [taskTypes[i], taskTypes[j]] = [taskTypes[j], taskTypes[i]];
            }

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 77;
                const lines = currentContent.split('\n');
                let step = null;
                const type = taskTypes[i % taskTypes.length]; // cycle if numSteps > 5

                if (type === 0) {
                    // --- Type 0: Word Replacement or Suffix Append ---
                    // Find a suitable line (not empty, valid words)
                    let targetLineIdx = -1;
                    let attempts = 0;
                    while (targetLineIdx === -1 && attempts < 50) {
                        const idx = randomInRange(stepSeed + attempts, 1, lines.length - 2);
                        if (lines[idx].trim().length > 5 && !lines[idx].includes('quantity:')) {
                            targetLineIdx = idx;
                        }
                        attempts++;
                    }
                    if (targetLineIdx === -1) targetLineIdx = 10; // Fallback

                    const lineContent = lines[targetLineIdx];
                    const words = lineContent.match(/\b\w+\b/g);

                    // Decide: Replace Word (0) or Append Suffix (1)
                    const subType = randomInRange(stepSeed, 0, 1);

                    step = {
                        targetLine: targetLineIdx + 1,
                        checkType: 'content_match',
                        highlightType: 'change'
                    };

                    if (words && words.length > 0 && subType === 0) {
                        // Replace Word
                        const targetWord = words[randomInRange(stepSeed + 1, 0, words.length - 1)];
                        const newWord = REPLACEMENTS[randomInRange(stepSeed + 2, 0, REPLACEMENTS.length - 1)];
                        const newLine = lineContent.replace(targetWord, newWord);

                        step.instructions = `Change "${targetWord}" to "${newWord}" on line ${targetLineIdx + 1}.`;
                        step.highlightWord = targetWord;
                        step.highlightColumn = lineContent.indexOf(targetWord);
                        step.overlays = [{
                            line: targetLineIdx + 1,
                            col: lineContent.indexOf(targetWord) + 1,
                            text: `Change to "${newWord}"`
                        }];

                        const nextLines = [...lines];
                        nextLines[targetLineIdx] = newLine;
                        step.initialContent = currentContent;
                        step.targetContent = nextLines.join('\n');

                    } else {
                        // Append Suffix
                        const suffix = SUFFIXES[randomInRange(stepSeed + 3, 0, SUFFIXES.length - 1)];
                        const newLine = lineContent + suffix;

                        step.instructions = `Append "${suffix.trim()}" to the end of line ${targetLineIdx + 1}.`;
                        step.overlays = [{
                            line: targetLineIdx + 1,
                            col: lineContent.length + 1,
                            text: `Append "${suffix.trim()}"`
                        }];

                        const nextLines = [...lines];
                        nextLines[targetLineIdx] = newLine;
                        step.initialContent = currentContent;
                        step.targetContent = nextLines.join('\n');
                    }
                } else if (type === 1) {
                    // --- Type 1: Entire Line Replacement ---
                    let targetLineIdx = -1;
                    let attempts = 0;
                    while (targetLineIdx === -1 && attempts < 50) {
                        // Prefer lines inside functions (indented)
                        const idx = randomInRange(stepSeed + attempts * 2, 6, 28);
                        const line = lines[idx] || "";
                        // Simple heuristic for indentation: starts with space, and long enough to be interesting
                        if (line.startsWith('  ') && line.trim().length > 20) {
                            targetLineIdx = idx;
                        }
                        attempts++;
                    }
                    if (targetLineIdx === -1) targetLineIdx = 12;

                    const originalLine = lines[targetLineIdx];
                    const indentMatch = originalLine.match(/^\s*/);
                    const indent = indentMatch ? indentMatch[0] : "";

                    const newContentRaw = NEW_LINES[randomInRange(stepSeed, 0, NEW_LINES.length - 1)];
                    const newLine = indent + newContentRaw;

                    step = {
                        targetLine: targetLineIdx + 1,
                        checkType: 'content_match',
                        highlightType: 'change',
                        instructions: `Change the entire line ${targetLineIdx + 1} to "${newContentRaw}" (keep indentation).`,
                        initialContent: currentContent,
                        overlays: [{
                            line: targetLineIdx + 1,
                            col: indent.length + 1,
                            text: `Change line to "${newContentRaw}"`
                        }]
                    };

                    const nextLines = [...lines];
                    nextLines[targetLineIdx] = newLine;
                    step.targetContent = nextLines.join('\n');

                } else if (type === 2) {
                    // --- Type 2: Quantity Change ---
                    // Find lines resembling: { ... quantity: N, ... }
                    const quantityCandidates = [];
                    const pattern = /quantity:\s*(\d+)/;

                    for (let l = 0; l < lines.length; l++) {
                        const match = lines[l].match(pattern);
                        if (match) {
                            quantityCandidates.push({
                                lineIdx: l,
                                value: parseInt(match[1]),
                                fullMatch: match[0],
                                index: match.index
                            });
                        }
                    }

                    if (quantityCandidates.length > 0) {
                        const choice = quantityCandidates[randomInRange(stepSeed, 0, quantityCandidates.length - 1)];

                        let newQty = choice.value;
                        let qtyAttempts = 0;
                        // specific logic: "any other single digit"
                        while (newQty === choice.value && qtyAttempts < 10) {
                            newQty = randomInRange(stepSeed + newQty + 1 + qtyAttempts, 1, 9);
                            qtyAttempts++;
                        }
                        if (newQty === choice.value) {
                            newQty = (newQty === 9) ? 1 : newQty + 1; // Deterministic fallback
                        }

                        const newLine = lines[choice.lineIdx].replace(
                            `quantity: ${choice.value}`,
                            `quantity: ${newQty}`
                        );

                        step = {
                            targetLine: choice.lineIdx + 1,
                            checkType: 'content_match',
                            highlightType: 'change',
                            instructions: `Change quantity from ${choice.value} to ${newQty} on line ${choice.lineIdx + 1}.`,
                            initialContent: currentContent,
                            highlightWord: String(choice.value),
                            highlightColumn: choice.index + 10, // "quantity: ".length is roughly 10
                            overlays: [{
                                line: choice.lineIdx + 1,
                                col: choice.index + 10 + 1,
                                text: `Change to ${newQty}`
                            }]
                        };

                        const nextLines = [...lines];
                        nextLines[choice.lineIdx] = newLine;
                        step.targetContent = nextLines.join('\n');
                    } else {
                        // Fallback to Type 0 if no quantity found (shouldn't happen with EXPANDED_CODE_SAMPLE)
                        // ... (Re-use Type 0 logic or just skip/no-op? Better to just pick a random line replacement fallback)
                        const fallbackIdx = 13;
                        step = {
                            targetLine: fallbackIdx,
                            checkType: 'content_match',
                            highlightType: 'change',
                            instructions: `Delete line ${fallbackIdx} (fallback).`, // Simple fallback
                            initialContent: currentContent
                        };
                        const nextLines = [...lines];
                        nextLines.splice(fallbackIdx - 1, 1);
                        step.targetContent = nextLines.join('\n');
                    }
                }

                if (step) {
                    currentContent = step.targetContent;
                    steps.push(step);
                }
            }

            return { steps };
        },
        timePar: 30000,
        keyPressesPar: 65
    },
    {
        id: 5,
        name: "Deletion B",
        difficulty: "medium",
        description: "Delete using precise Vim commands: dd, dw, dW, 2dd, etc.",
        help: [
            {
                title: "Advanced Deletion",
                content: "<ul><li><code>dW</code>: Delete to next SPACE-separated WORD</li><li><code>d$</code>: Delete to end of line</li><li><code>d0</code>: Delete to start of line</li><li><code>2dd</code>: Delete 2 lines</li><li><code>3dw</code>: Delete 3 words</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            // Track cursor position to persist across steps
            let currentCursor = { line: 1, col: 1 };
            const numSteps = 10;

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 222;
                const lines = currentContent.split('\n');

                const operations = ['dd', '2dd', '3dd', 'dw', '2dw', 'dW', '2dW'];
                const op = operations[randomInRange(stepSeed, 0, operations.length - 1)];

                let step = {
                    checkType: 'content_match',
                    highlightType: 'delete'
                };

                let validMove = false;
                let attempts = 0;

                while (!validMove && attempts < 50) {
                    attempts++;

                    // Pick a random line to target
                    let lineIdx = randomInRange(stepSeed + attempts, 0, lines.length - 1);
                    if (lines[lineIdx] === undefined) continue;

                    // Line Deletion (dd, 2dd, 3dd)
                    if (op.includes('dd')) {
                        const count = op.startsWith('d') ? 1 : parseInt(op[0]);
                        if (lineIdx + count <= lines.length) {
                            step.targetLine = lineIdx + 1;
                            step.deleteCount = count; // Used for multi-line highlighting
                            step.instructions = `Delete ${count === 1 ? 'one line' : count + ' lines'} at Line ${lineIdx + 1}.`;

                            // Calculate new content
                            const nextLines = [...lines];
                            nextLines.splice(lineIdx, count);
                            step.targetContent = nextLines.join('\n');

                            // Set initial cursor for this step (persisted from previous)
                            step.initialCursor = { ...currentCursor };

                            // Update currentCursor for the NEXT step
                            // After dd, cursor lands on the line that replaced the deleted one (same index), or EOF.
                            let newLineIdx = Math.min(lineIdx, nextLines.length - 1);
                            if (nextLines.length === 0) newLineIdx = 0;
                            currentCursor = { line: newLineIdx + 1, col: 1 };

                            validMove = true;
                        }
                    } else {
                        // Word Deletion (dw, dW)
                        const count = op.length === 2 ? 1 : parseInt(op[0]);
                        const type = op.includes('W') ? 'W' : 'w';

                        const lineLen = lines[lineIdx].length;
                        if (lineLen === 0) continue;

                        // Find valid word starts to ensure clean targets
                        const validStarts = [];
                        for (let c = 0; c < lineLen; c++) {
                            if (VimLogic.isWordStart(lines, lineIdx, c, type)) {
                                validStarts.push(c);
                            }
                        }

                        if (validStarts.length === 0) continue;

                        // Pick a random valid word start
                        const colIdx = validStarts[randomInRange(stepSeed + attempts, 0, validStarts.length - 1)];

                        const startPos = { line: lineIdx, col: colIdx };
                        const endPos = VimLogic.move(startPos, type, count, lines);

                        // Constraints for clarity:
                        // 1. Don't cross line boundaries (keep it simple for now)
                        if (endPos.line !== lineIdx) continue;
                        // 2. Must delete something
                        if (endPos.col <= colIdx) continue;

                        const textToDelete = lines[lineIdx].substring(colIdx, endPos.col);
                        if (textToDelete.trim().length === 0) continue; // Avoid invisible targets

                        // Construct target content
                        const newLine = lines[lineIdx].substring(0, colIdx) + lines[lineIdx].substring(endPos.col);
                        const nextLines = [...lines];
                        nextLines[lineIdx] = newLine;

                        step.targetContent = nextLines.join('\n');
                        step.targetLine = lineIdx + 1;
                        step.highlightColumn = colIdx;

                        step.highlightWord = textToDelete;

                        const unit = type === 'W' ? 'WORD' : 'word';
                        step.instructions = `Delete ${count === 1 ? 'one ' + unit : count + ' ' + unit + 's'} ("${textToDelete.trim()}") at Line ${lineIdx + 1}.`;

                        step.initialCursor = { ...currentCursor };

                        // Update cursor for next step: it stays at the cut point
                        currentCursor = { line: lineIdx + 1, col: colIdx + 1 };

                        validMove = true;
                    }
                }

                if (!validMove) {
                    // Fallback
                    const lineIdx = 5;
                    const nextLines = [...lines];
                    nextLines.splice(lineIdx, 1);
                    step.targetContent = nextLines.join('\n');
                    step.targetLine = lineIdx + 1;
                    step.instructions = "Delete line 6 (dd).";
                    step.deleteCount = 1;
                    step.initialCursor = { ...currentCursor };
                    currentCursor = { line: lineIdx + 1, col: 1 };
                }

                // Override first step cursor to be deterministic (1,1)
                if (i === 0) {
                    step.initialCursor = { line: 1, col: 1 };
                }

                step.initialContent = currentContent;
                steps.push(step);
                currentContent = step.targetContent;
            }
            return { steps };
        },
        timePar: 40000,
        keyPressesPar: 60
    },
    {
        id: 6,
        name: "Yank & Paste A",
        difficulty: "medium",
        description: "Yank (copy) text and paste it in specific locations.",
        help: [
            {
                title: "Copy and Paste",
                content: "<ul><li><code>yy</code>: Yank (copy) current line</li><li><code>yw</code>: Yank word</li><li><code>p</code>: Paste after cursor</li><li><code>P</code>: Paste before cursor</li><li><code>y$</code>: Yank to end of line</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];
            let currentContent = LOREM_IPSUM;
            const numSteps = 5;

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 333;
                const lines = currentContent.split('\n');

                // Decide what to yank: a word or a whole line
                const type = i % 2 === 0 ? 'word' : 'line';

                let sourceLineIdx = randomInRange(stepSeed, 0, lines.length - 1);
                let destLineIdx = sourceLineIdx;
                let attempts = 0;
                while (destLineIdx === sourceLineIdx && attempts < 100) {
                    attempts++;
                    destLineIdx = randomInRange(stepSeed + attempts + 100, 0, lines.length - 1);
                }

                const step = {
                    checkType: 'content_match',
                    highlightType: 'target' // Light green for source
                };

                if (type === 'line') {
                    // Yank whole line (yy) and paste (p)
                    // We paste AFTER the pointer line. 
                    const contentToYank = lines[sourceLineIdx];
                    step.instructions = `Yank line ${sourceLineIdx + 1} (yy) and paste it after line ${destLineIdx + 1} (p).`;
                    step.targetLine = sourceLineIdx + 1;

                    const pasteContent = contentToYank;
                    const truncatedPaste = pasteContent.length > 20 ? pasteContent.substring(0, 20) + '...' : pasteContent;

                    const nextLines = [...lines];
                    nextLines.splice(destLineIdx + 1, 0, contentToYank);
                    step.targetContent = nextLines.join('\n');

                    // Horizontal pointer at the destination line
                    // CSS positions it at the bottom of this line (between lines)
                    // For pasting after line N, we point to line N+1's position (even if it doesn't exist yet)
                    const overlayLine = destLineIdx + 2;

                    step.overlays = [{
                        line: overlayLine,
                        col: 1,
                        text: `Paste line here`,
                        type: 'horizontal'
                    }];

                } else {
                    // Yank words (2-4 words with surrounding spaces)
                    const sourceLine = lines[sourceLineIdx];

                    // Find sequences of words
                    const wordsMatch = []; // { text, index, length }
                    // Match words, we'll group them manually
                    const allWords = [];
                    let match;
                    const wordRegex = /\b\w+\b/g;
                    while ((match = wordRegex.exec(sourceLine)) !== null) {
                        allWords.push({ word: match[0], index: match.index, end: match.index + match[0].length });
                    }

                    if (allWords.length < 3) {
                        // Fallback to line yank
                        const contentToYank = lines[sourceLineIdx];
                        step.instructions = `Yank line ${sourceLineIdx + 1} (yy) and paste it after line ${destLineIdx + 1} (p).`;
                        step.targetLine = sourceLineIdx + 1;
                        const nextLines = [...lines];
                        nextLines.splice(destLineIdx + 1, 0, contentToYank);
                        step.targetContent = nextLines.join('\n');
                        const overlayLine = Math.min(destLineIdx + 2, lines.length);
                        step.overlays = [{
                            line: overlayLine,
                            col: 1,
                            text: `Paste line here`,
                            type: 'horizontal'
                        }];
                    } else {
                        // Pick random length 2-4
                        const count = randomInRange(stepSeed, 2, Math.min(4, allWords.length - 1));
                        // Start index
                        const startIdx = randomInRange(stepSeed + 1, 1, allWords.length - count - 1);

                        // We need "space before first word" and "space after last word"
                        // So we need to grab the slice from (firstWord.index - 1) to (lastWord.end + 1)
                        // Verify bounds/spaces
                        const firstWord = allWords[startIdx];
                        const lastWord = allWords[startIdx + count - 1];

                        // Check if spaces exist around selection
                        const hasSpaceBefore = sourceLine[firstWord.index - 1] === ' ';
                        const hasSpaceAfter = sourceLine[lastWord.end] === ' ';

                        // We force finding a valid text segment or fallback
                        if (!hasSpaceBefore || !hasSpaceAfter) {
                            // Fallback to just yanking words without specific space constraint if rare failure
                            // Or simpler: just yank the words and spaces between them.
                            // User requirement: "make sure that the first word has a space before it and the last word has a space after it in this yank segment"
                            // Let's try to include them if possible.
                        }

                        // Construct the string to be yanked
                        // User clarification: segment surrounded by spaces in raw text, but yank EXCLUDES leading space
                        // So: yank starts at first word, includes trailing space
                        const yankStart = firstWord.index; // No leading space
                        const yankEnd = hasSpaceAfter ? lastWord.end + 1 : lastWord.end; // Include trailing space
                        const textToYank = sourceLine.substring(yankStart, yankEnd);

                        // Destination logic: find a gap
                        let destLineWithGap = -1;
                        let gapIndex = -1;
                        let attempts = 0;
                        while (destLineWithGap === -1 && attempts < 50) {
                            const idx = randomInRange(stepSeed + attempts + 200, 0, lines.length - 1);
                            // Need a line with a space
                            if (lines[idx].includes(' ')) {
                                destLineWithGap = idx;
                                gapIndex = lines[idx].indexOf(' ');
                            }
                            attempts++;
                        }

                        if (destLineWithGap === -1) destLineWithGap = sourceLineIdx; // fallback
                        if (gapIndex === -1) gapIndex = 0;

                        step.instructions = `Yank "${textToYank}" from line ${sourceLineIdx + 1} and paste it on line ${destLineWithGap + 1} between words.`;
                        step.highlightWord = textToYank;
                        step.highlightColumn = yankStart;
                        step.targetLine = sourceLineIdx + 1;

                        // Calculate target content
                        const destLine = lines[destLineWithGap];
                        // Insert at gap. Gap is a space.
                        // "Word1 Word2". Gap at space (idx 5).
                        // If we paste ' text ', result: "Word1" + " text " + " Word2" -> "Word1 text  Word2" (double space?)
                        // User said: "annoying because... target expects a space... with no space after it"
                        // If we include spaces in yank: " word1 word2 "
                        // And paste it at a gap?
                        // "A B". Paste at space between A and B.
                        // "A" + " word1 word2 " + " B" -> "A word1 word2  B"
                        // This seems tricky visually.
                        // Maybe the user implies the Yank should captures the spaces so the Paste is super simple `p`?
                        // If I yank " word " and paste after "A", I get "A word ". If "B" follows, "A word B". Perfect.
                        // So I should target a paste position that is NOT a space, but rather the end of a word?
                        // "A B". Cursor at 'A'. `p` -> "A word B".

                        // Paste AFTER the space. gapIndex is the space char.
                        // "Lorem ipsum" with gap at index 5 (the space).
                        // We want: "Lorem " + "et dolore magna " + "ipsum"
                        // = substring(0, 6) + textToYank + substring(6)
                        const newDestLine = destLine.substring(0, gapIndex + 1) + textToYank + destLine.substring(gapIndex + 1);

                        const nextLines = [...lines];
                        nextLines[destLineWithGap] = newDestLine;
                        step.targetContent = nextLines.join('\n');

                        // Point to the location just before the space (end of previous word)
                        step.overlays = [{
                            line: destLineWithGap + 1,
                            col: gapIndex + 1, // Visual pos 1-based.
                            text: `Paste here (p)`
                        }];
                    }
                }

                step.initialContent = currentContent;
                currentContent = step.targetContent;
                steps.push(step);
            }

            return { steps };
        },
        timePar: 30000,
        keyPressesPar: 40
    },
    {
        id: 7,
        name: "Yank & Paste B",
        difficulty: "hard",
        description: "Use registers to copy UUIDs and replace placeholders.",
        help: [
            {
                title: "Registers",
                content: "<ul><li><code>\"ay</code>: Yank into register 'a'</li><li><code>\"ap</code>: Paste from register 'a'</li><li><code>\"byy</code>: Yank line into register 'b'</li></ul>"
            },
            {
                title: "Visual Mode",
                content: "<ul><li><code>v</code>: Start visual mode</li><li><code>V</code>: Start visual line mode</li></ul>"
            }
        ],
        generate: (seed) => {
            const steps = [];

            // 1. Generate UUIDs
            const genUUID = (s, tag) => {
                const r = (n) => {
                    const x = Math.sin(s + n + tag.charCodeAt(0)) * 10000;
                    return Math.floor((x - Math.floor(x)) * 16).toString(16);
                };
                let uuid = "";
                let c = 0;
                for (let i = 0; i < 36; i++) {
                    if (i === 8 || i === 13 || i === 18 || i === 23) {
                        uuid += "-";
                    } else if (i === 14) {
                        uuid += "4";
                    } else if (i === 19) {
                        uuid += "8";
                    } else {
                        uuid += r(c++);
                    }
                }
                return uuid;
            };

            const uuids = {
                A: genUUID(seed, 'A'),
                B: genUUID(seed, 'B'),
                C: genUUID(seed, 'C')
            };

            // Initial Content
            let currentContent = `{
  "A": "${uuids.A}",
  "B": "${uuids.B}",
  "C": "${uuids.C}"
}

const config = {
  apiKey: "foo",
  secret: "bar",
  tenantId: "baz"
};`;

            // Steps 1-3: Replace placeholders
            const placeholders = ["foo", "bar", "baz"];
            const keys = ["A", "B", "C"];

            // Shuffle placeholders and keys to randomize order
            const shuffledPlaceholders = [...placeholders];
            const shuffledKeys = [...keys];

            for (let i = shuffledPlaceholders.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + i) * (i + 1));
                [shuffledPlaceholders[i], shuffledPlaceholders[j]] = [shuffledPlaceholders[j], shuffledPlaceholders[i]];
            }
            for (let i = shuffledKeys.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + i + 100) * (i + 1));
                [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
            }

            for (let i = 0; i < 3; i++) {
                const targetPlaceholder = shuffledPlaceholders[i];
                const targetKey = shuffledKeys[i];
                const targetUUID = uuids[targetKey];

                const step = {
                    checkType: 'content_match',
                    highlightType: 'change'
                };

                // Find line of placeholder
                const lines = currentContent.split('\n');
                let lineIdx = -1;
                for (let l = 0; l < lines.length; l++) {
                    if (lines[l].includes(`"${targetPlaceholder}"`)) {
                        lineIdx = l;
                        break;
                    }
                }

                step.instructions = `Change "${targetPlaceholder}" to UUID ${targetKey}.`;
                if (lineIdx !== -1) {
                    step.targetLine = lineIdx + 1;
                    step.highlightWord = targetPlaceholder;
                    step.highlightColumn = lines[lineIdx].indexOf(targetPlaceholder);

                    step.overlays = [{
                        line: lineIdx + 1,
                        col: lines[lineIdx].indexOf(targetPlaceholder) + 1,
                        text: `Change to UUID ${targetKey}`
                    }];
                }

                const nextContent = currentContent.replace(targetPlaceholder, targetUUID);
                step.initialContent = currentContent;
                step.targetContent = nextContent;

                steps.push(step);
                currentContent = nextContent;
            }

            // Step 4: Concatenation task
            const finalUUIDs = [
                genUUID(seed + 100, 'X'),
                genUUID(seed + 101, 'Y'),
                genUUID(seed + 102, 'Z')
            ];

            const step5Content = `${finalUUIDs[0]}
${finalUUIDs[1]}
${finalUUIDs[2]}`;

            const targetConcatenation = finalUUIDs[0] + finalUUIDs[1] + finalUUIDs[2]; // Concat all 3
            // Target: 3 lines of UUIDs + concatenated line (4th line)
            const step5TargetContent = step5Content + '\n' + targetConcatenation;

            const step5 = {
                checkType: 'content_match',
                initialContent: step5Content,
                targetContent: step5TargetContent,
                instructions: `Create a new 4th line that is the concatenation of all three UUIDs found above.`,
                overlays: [{
                    line: 4,
                    col: 1,
                    text: `Concatenate All 3 UUIDs`
                }]
            };

            steps.push(step5);

            return { steps };
        },
        timePar: 55000,
        keyPressesPar: 80
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

// --- Vim Logic Helpers ---

const VimLogic = {
    isKeyword: (char) => /[a-zA-Z0-9_]/.test(char),

    getLineLength: (lines, line) => {
        if (line < 0 || line >= lines.length) return 0;
        return lines[line].length;
    },

    getChar: (lines, line, col) => {
        if (line < 0 || line >= lines.length) return null;
        const l = lines[line];
        if (col < 0 || col >= l.length) return null;
        return l[col];
    },

    // Move logic reused/adapted from Challenge 4
    move: (pos, type, count, lines) => {
        let current = { ...pos };
        for (let c = 0; c < count; c++) {
            current = VimLogic.singleMove(current, type, lines);
        }
        return current;
    },

    getType: (lines, l, c) => {
        if (c >= VimLogic.getLineLength(lines, l)) return 0; // EOL/Empty
        const char = VimLogic.getChar(lines, l, c);
        if (char === ' ' || char === '\t') return 0; // Space
        if (VimLogic.isKeyword(char)) return 1; // Keyword
        return 2; // Symbol
    },

    // Check if position is start of a word/WORD
    isWordStart: (lines, l, c, type) => {
        if (c === 0) return true;
        const currType = VimLogic.getType(lines, l, c);
        const prevType = VimLogic.getType(lines, l, c - 1);

        if (type === 'W') {
            // WORD stores: Space (0) vs Non-Space (1 or 2).
            // Start if current is Non-Space and prev is Space.
            const currIsSpace = currType === 0;
            const prevIsSpace = prevType === 0;
            return !currIsSpace && prevIsSpace;
        } else {
            // word match:
            // 1. Space -> Non-Space
            // 2. Keyword -> Symbol
            // 3. Symbol -> Keyword
            // Basically change in type, excluding Space->Space
            if (currType === 0) return false; // Space is never start of "word" (in this context?) 
            // Actually, 'w' lands on first char of word.

            if (prevType === 0 && currType !== 0) return true; // Space -> Word
            if (prevType === 1 && currType === 2) return true; // Keyword -> Symbol
            if (prevType === 2 && currType === 1) return true; // Symbol -> Keyword
            return false;
        }
    },

    singleMove: (pos, type, lines) => {
        let { line, col } = pos;
        const lineStr = lines[line];
        const MAX_LINE = lines.length - 1;

        const advance = (l, c) => {
            c++;
            if (c >= VimLogic.getLineLength(lines, l)) {
                if (l < MAX_LINE) return { l: l + 1, c: 0, wrapped: true };
                return { l, c: VimLogic.getLineLength(lines, l) - 1, eof: true };
            }
            return { l, c };
        };

        const isSpace = (l, c) => {
            if (VimLogic.getLineLength(lines, l) === 0) return true;
            if (c >= VimLogic.getLineLength(lines, l)) return true;
            const char = VimLogic.getChar(lines, l, c);
            return char === ' ' || char === '\t';
        };

        const getType = (l, c) => VimLogic.getType(lines, l, c);

        switch (type) {
            case 'w':
                if (VimLogic.getLineLength(lines, line) === 0) {
                    if (line < MAX_LINE) { line++; col = 0; }
                } else {
                    let currType = getType(line, col);
                    let p = { l: line, c: col };
                    // If on a word/symbol, scan to end of it
                    if (currType !== 0) {
                        while (true) {
                            const next = advance(p.l, p.c);
                            if (next.eof || next.wrapped) { p = next; break; }
                            p = next;
                            if (getType(p.l, p.c) !== currType) break;
                        }
                    }
                    // Then scan through spaces
                    while (true) {
                        if (p.l === MAX_LINE && p.c === VimLogic.getLineLength(lines, p.l) - 1) break;
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
                if (VimLogic.getLineLength(lines, line) === 0) {
                    if (line < MAX_LINE) { line++; col = 0; }
                } else {
                    // If on non-space, scan to end of WORD (space)
                    if (!isSpace(p.l, p.c)) {
                        while (true) {
                            const next = advance(p.l, p.c);
                            if (next.eof || next.wrapped) { p = next; break; }
                            p = next;
                            if (isSpace(p.l, p.c)) break;
                        }
                    }
                    // Then scan through spaces
                    while (true) {
                        if (p.l === MAX_LINE && p.c === VimLogic.getLineLength(lines, p.l) - 1) break;
                        if (!isSpace(p.l, p.c)) break;
                        const next = advance(p.l, p.c);
                        if (next.eof) { p = next; break; }
                        p = next;
                    }
                    line = p.l; col = p.c;
                }
                break;
        }
        return { line, col };
    }
};

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
        timePar: challenge.timePar,
        keyPressesPar: challenge.keyPressesPar,
        help: challenge.help,
        ...generated // Contains { steps: [...] }
    };
}

export default challenges;
