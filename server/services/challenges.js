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
                const type = i % 3;
                let step = {
                    initialContent: content,
                    targetContent: content,
                    highlightType: 'target'
                };

                const lines = content.split('\n');

                if (type === 0) { // Line navigation
                    const targetLine = randomInRange(stepSeed, 5, 95);
                    step.instructions = `Move cursor to Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_line';
                    step.targetValue = targetLine;
                } else if (type === 1) { // Word navigation
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
                    step.highlightColumn = lines[searchLine - 1].indexOf(targetWord);
                } else { // End of line
                    const targetLine = randomInRange(stepSeed, 20, 80);
                    step.instructions = `Move cursor to the END of Line ${targetLine}.`;
                    step.targetLine = targetLine;
                    step.checkType = 'cursor_eol';
                    step.targetValue = targetLine;
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

            for (let i = 0; i < numSteps; i++) {
                const stepSeed = seed + i * 50;
                const lines = currentContent.split('\n');
                let targetLineIdx = -1;
                let attempts = 0;
                while (targetLineIdx === -1 && attempts < 100) {
                    const idx = randomInRange(stepSeed + attempts, 1, lines.length - 2);
                    if (lines[idx].trim().length > 5) {
                        targetLineIdx = idx;
                    }
                    attempts++;
                }
                if (targetLineIdx === -1) targetLineIdx = 5;

                const lineContent = lines[targetLineIdx];
                const type = i % 2;
                let nextContent = '';
                const step = {
                    startLine: targetLineIdx + 1,
                    checkType: 'content_match',
                    highlightType: 'delete'
                };

                if (type === 0 || lineContent.length < 10) {
                    const nextLines = [...lines];
                    nextLines.splice(targetLineIdx, 1);
                    nextContent = nextLines.join('\n');
                    step.instructions = `Delete line ${targetLineIdx + 1}: "${lineContent.trim()}"`;
                    step.targetLine = targetLineIdx + 1;
                } else {
                    const wordsMap = [];
                    let match;
                    const wordRegex = /\b\w+\b/g;
                    while ((match = wordRegex.exec(lineContent)) !== null) {
                        if (match[0].length > 1) {
                            wordsMap.push({ word: match[0], index: match.index });
                        }
                    }

                    if (wordsMap.length > 0) {
                        const targetObj = wordsMap[randomInRange(stepSeed, 0, wordsMap.length - 1)];
                        const wordToDelete = targetObj.word;
                        const prefix = lineContent.substring(0, targetObj.index);
                        const suffix = lineContent.substring(targetObj.index + wordToDelete.length);
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
                    step.overlays = [{
                        line: targetLineIdx + 1,
                        col: lineContent.indexOf(targetWord) + 1,
                        text: `Change to "${newWord}"`
                    }];
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
                    step.overlays = [{
                        line: targetLineIdx + 1,
                        col: lineContent.length + 1,
                        text: `Append "${suffix.trim()}"`
                    }];
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
    },
    {
        id: 5,
        name: "Smart Deletion",
        difficulty: "hard",
        description: "Delete using precise Vim commands: dd, dw, dW, 2dd, etc.",
        generate: (seed) => {
            const steps = [];
            let currentContent = EXPANDED_CODE_SAMPLE;
            // Track cursor position to persist across steps
            let currentCursor = { line: 1, col: 1 };
            const numSteps = 5;

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
                            step.instructions = `Delete ${count === 1 ? 'one line' : count + ' lines'} at Line ${lineIdx + 1} (${op}).`;

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

                        const escapedText = textToDelete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        step.highlightWord = escapedText;

                        const unit = type === 'W' ? 'WORD' : 'word';
                        step.instructions = `Delete ${count === 1 ? 'one ' + unit : count + ' ' + unit + 's'} ("${textToDelete.trim()}") at Line ${lineIdx + 1} (${op}).`;

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
        timePar: 50000,
        keyPressesPar: 40
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
        keyPressesPar: challenge.keyPressesPar,
        ...generated // Contains { steps: [...] }
    };
}

export default challenges;
