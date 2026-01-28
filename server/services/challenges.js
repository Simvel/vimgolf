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
                        if (match[0].length > 0) {
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
