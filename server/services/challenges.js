// Challenge definitions with variation generators
// Each challenge has: id, name, difficulty, description, baseContent generator, 
// targetContent generator, and variation parameters

const LOREM_PARAGRAPHS = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit.",
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae.",
    "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat.",
    "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur quis autem vel eum iure.",
    "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati.",
    "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.",
];

const CODE_SAMPLE = `function calculateTotal(items) {
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
  { name: "Apple", price: 1.50, quantity: 3 },
  { name: "Banana", price: 0.75, quantity: 6 },
  { name: "Orange", price: 2.00, quantity: 2 },
  { name: "Mango", price: 3.50, quantity: 1 },
];

displayCart(shoppingCart);`;

const CONFIG_SAMPLE = `# Application Configuration
server:
  host: localhost
  port: 8080
  timeout: 30

database:
  type: postgresql
  host: db.example.com
  port: 5432
  name: myapp
  user: admin
  password: secret123

logging:
  level: debug
  format: json
  output: stdout

cache:
  enabled: true
  ttl: 3600
  max_size: 1000

features:
  dark_mode: false
  notifications: true
  analytics: false`;

// Helper to generate line-numbered content
function generateNumberedLines(count) {
    const lines = [];
    for (let i = 1; i <= count; i++) {
        lines.push(`Line ${i}: This is content for demonstration purposes.`);
    }
    return lines.join('\n');
}

// Random number in range (seeded)
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function randomInRange(seed, min, max) {
    return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

const challenges = [
    // ===== EASY CHALLENGES (1-8) =====
    {
        id: 1,
        name: "First Steps",
        difficulty: "easy",
        description: "Navigate to the highlighted line and position your cursor there.",
        generate: (seed) => {
            const targetLine = randomInRange(seed, 10, 20);
            const content = generateNumberedLines(30);
            return {
                initialContent: content,
                targetContent: content, // No modification needed, just navigation
                instructions: `Move your cursor to line ${targetLine}. Press SUBMIT when your cursor is on that line.`,
                targetLine,
                checkType: 'cursor_line',
                targetValue: targetLine,
                highlightType: 'target'
            };
        },
        timePar: 10000,
        keyPressesPar: 4
    },
    {
        id: 2,
        name: "Word Hop",
        difficulty: "easy",
        description: "Navigate to a specific word on a line.",
        generate: (seed) => {
            const words = ["apple", "banana", "orange", "grape", "mango", "lemon", "cherry"];
            const targetWord = words[randomInRange(seed, 0, words.length - 1)];
            const lineNum = randomInRange(seed + 1, 5, 15);
            const lines = [];
            for (let i = 1; i <= 20; i++) {
                if (i === lineNum) {
                    const wordIndex = randomInRange(seed + 2, 2, 5);
                    const lineWords = ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"];
                    lineWords.splice(wordIndex, 0, targetWord);
                    lines.push(lineWords.join(' '));
                } else {
                    lines.push(`Line ${i}: Some placeholder text here for context.`);
                }
            }
            return {
                initialContent: lines.join('\n'),
                targetContent: lines.join('\n'),
                instructions: `Find and position your cursor on the word "${targetWord}" on line ${lineNum}.`,
                targetLine: lineNum,
                targetWord,
                checkType: 'cursor_word',
                targetValue: targetWord,
                highlightType: 'target'
            };
        },
        timePar: 15000,
        keyPressesPar: 8
    },
    {
        id: 3,
        name: "End of Line",
        difficulty: "easy",
        description: "Navigate to the end of a specific line.",
        generate: (seed) => {
            const targetLine = randomInRange(seed, 8, 18);
            const content = generateNumberedLines(25);
            return {
                initialContent: content,
                targetContent: content,
                instructions: `Move your cursor to the END of line ${targetLine}. Use the $ command.`,
                targetLine,
                checkType: 'cursor_eol',
                targetValue: targetLine,
                highlightType: 'target'
            };
        },
        timePar: 10000,
        keyPressesPar: 4
    },
    {
        id: 4,
        name: "Delete Word",
        difficulty: "easy",
        description: "Delete a highlighted word from the text.",
        generate: (seed) => {
            const lineNum = randomInRange(seed, 5, 12);
            const words = ["ERROR", "BUG", "FIXME", "TODO", "HACK"];
            const targetWord = words[randomInRange(seed + 1, 0, words.length - 1)];

            const lines = [];
            for (let i = 1; i <= 20; i++) {
                if (i === lineNum) {
                    lines.push(`This line contains a ${targetWord} that needs to be removed from the code.`);
                } else {
                    lines.push(`Line ${i}: Normal content without any issues here.`);
                }
            }

            const targetLines = [...lines];
            // When deleting a word, we expect one of the surrounding spaces to go with it
            // "contains a TARGET that" -> "contains a that" (single space)
            targetLines[lineNum - 1] = `This line contains a that needs to be removed from the code.`;

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Delete the word "${targetWord}" on line ${lineNum}. Use 'dw' or 'daw'.`,
                targetLine: lineNum,
                highlightWord: targetWord,
                checkType: 'content_match',
                highlightType: 'delete'
            };
        },
        timePar: 15000,
        keyPressesPar: 6
    },
    {
        id: 5,
        name: "Beginning",
        difficulty: "easy",
        description: "Navigate to the first non-blank character of a line.",
        generate: (seed) => {
            const targetLine = randomInRange(seed, 10, 20);
            const lines = [];
            for (let i = 1; i <= 25; i++) {
                const indent = i === targetLine ? "    " : "";
                lines.push(`${indent}Line ${i}: Content with possible indentation.`);
            }
            return {
                initialContent: lines.join('\n'),
                targetContent: lines.join('\n'),
                instructions: `Move to line ${targetLine} and position cursor at the first non-blank character. Use '^'.`,
                targetLine,
                checkType: 'cursor_bol',
                targetValue: targetLine,
                highlightType: 'target'
            };
        },
        timePar: 10000,
        keyPressesPar: 4
    },
    {
        id: 6,
        name: "Page Down",
        difficulty: "easy",
        description: "Navigate to a line deep in the document.",
        generate: (seed) => {
            const targetLine = randomInRange(seed, 50, 70);
            const content = generateNumberedLines(80);
            return {
                initialContent: content,
                targetContent: content,
                instructions: `Navigate to line ${targetLine}. Try using '${targetLine}G' or ':${targetLine}'.`,
                targetLine,
                checkType: 'cursor_line',
                targetValue: targetLine,
                highlightType: 'target'
            };
        },
        timePar: 10000,
        keyPressesPar: 4
    },
    {
        id: 7,
        name: "Word Delete x2",
        difficulty: "easy",
        description: "Delete two consecutive words.",
        generate: (seed) => {
            const lineNum = randomInRange(seed, 5, 15);
            const lines = [];
            for (let i = 1; i <= 20; i++) {
                if (i === lineNum) {
                    lines.push("Please remove these WRONG WORDS from this sentence carefully.");
                } else {
                    lines.push(`Line ${i}: Just some regular content here.`);
                }
            }

            const targetLines = [...lines];
            targetLines[lineNum - 1] = "Please remove these from this sentence carefully.";

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Delete "WRONG WORDS" on line ${lineNum}. Try '2dw' or 'd2w'.`,
                targetLine: lineNum,
                checkType: 'content_match',
                highlightType: 'delete'
            };
        },
        timePar: 12000,
        keyPressesPar: 6
    },
    {
        id: 8,
        name: "Line Delete",
        difficulty: "easy",
        description: "Delete an entire line.",
        generate: (seed) => {
            const targetLine = randomInRange(seed, 8, 18);
            const lines = [];
            for (let i = 1; i <= 25; i++) {
                if (i === targetLine) {
                    lines.push(">>> DELETE THIS ENTIRE LINE <<<");
                } else {
                    lines.push(`Line ${i}: Keep this line in the document.`);
                }
            }

            const targetLines = lines.filter((_, idx) => idx !== targetLine - 1);

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Delete line ${targetLine} entirely. Use 'dd'.`,
                targetLine,
                checkType: 'content_match',
                highlightType: 'delete'
            };
        },
        timePar: 10000,
        keyPressesPar: 3
    },

    // ===== MEDIUM CHALLENGES (9-13) =====
    {
        id: 9,
        name: "Paragraph Jump",
        difficulty: "medium",
        description: "Navigate between paragraphs efficiently.",
        generate: (seed) => {
            const paragraphCount = randomInRange(seed, 4, 6);
            const targetParagraph = randomInRange(seed + 1, 2, paragraphCount);
            const paragraphs = LOREM_PARAGRAPHS.slice(0, paragraphCount);
            const content = paragraphs.join('\n\n');

            return {
                initialContent: content,
                targetContent: content,
                instructions: `Navigate to the beginning of paragraph ${targetParagraph}. Use '{' and '}' to jump.`,
                targetParagraph,
                checkType: 'cursor_paragraph',
                targetValue: targetParagraph,
                highlightType: 'target'
            };
        },
        timePar: 15000,
        keyPressesPar: 5
    },
    {
        id: 10,
        name: "Double Delete",
        difficulty: "medium",
        description: "Delete two non-adjacent lines.",
        generate: (seed) => {
            const line1 = randomInRange(seed, 5, 10);
            const line2 = randomInRange(seed + 1, 15, 20);

            const lines = [];
            for (let i = 1; i <= 25; i++) {
                if (i === line1 || i === line2) {
                    lines.push(`>>> DELETE LINE ${i} <<<`);
                } else {
                    lines.push(`Line ${i}: This line should remain.`);
                }
            }

            const targetLines = lines.filter((_, idx) => idx !== line1 - 1 && idx !== line2 - 1);

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Delete lines ${line1} and ${line2}. They are not adjacent!`,
                checkType: 'content_match'
            };
        },
        timePar: 18000,
        keyPressesPar: 7
    },
    {
        id: 11,
        name: "Yank and Paste",
        difficulty: "medium",
        description: "Copy a line and paste it elsewhere.",
        generate: (seed) => {
            const sourceLine = randomInRange(seed, 5, 10);
            const destLine = randomInRange(seed + 1, 15, 20);

            const lines = [];
            for (let i = 1; i <= 25; i++) {
                if (i === sourceLine) {
                    lines.push("IMPORTANT: Copy this configuration line to the target location.");
                } else if (i === destLine) {
                    lines.push("<!-- PASTE THE LINE BELOW HERE -->");
                } else {
                    lines.push(`Line ${i}: Regular content.`);
                }
            }

            const targetLines = [...lines];
            targetLines.splice(destLine, 0, "IMPORTANT: Copy this configuration line to the target location.");

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Copy line ${sourceLine} and paste it after line ${destLine}. Use 'yy' and 'p'.`,
                checkType: 'content_match',
                highlightType: 'target',
                startLine: sourceLine,
                endLine: sourceLine
            };
        },
        timePar: 20000,
        keyPressesPar: 8
    },
    {
        id: 12,
        name: "Find and Change",
        difficulty: "medium",
        description: "Find a word and change it to something else.",
        generate: (seed) => {
            const oldWord = ["foo", "bar", "baz", "qux"][randomInRange(seed, 0, 3)];
            const newWord = ["alpha", "beta", "gamma", "delta"][randomInRange(seed + 1, 0, 3)];
            const lineNum = randomInRange(seed + 2, 8, 15);

            const lines = [];
            for (let i = 1; i <= 20; i++) {
                if (i === lineNum) {
                    lines.push(`const result = ${oldWord}(input);  // Change ${oldWord} to ${newWord}`);
                } else {
                    lines.push(`// Line ${i}: Some code comment here`);
                }
            }

            const targetLines = [...lines];
            targetLines[lineNum - 1] = `const result = ${newWord}(input);  // Change ${oldWord} to ${newWord}`;

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `On line ${lineNum}, change "${oldWord}" to "${newWord}". Use 'cw' or 'ciw'.`,
                checkType: 'content_match',
                highlightWord: oldWord,
                highlightType: 'change'
            };
        },
        timePar: 35000,
        keyPressesPar: 10
    },
    {
        id: 13,
        name: "Block Delete",
        difficulty: "medium",
        description: "Delete an entire paragraph or block.",
        generate: (seed) => {
            const targetParagraph = randomInRange(seed, 1, 3);
            const paragraphs = LOREM_PARAGRAPHS.slice(0, 5);
            paragraphs[targetParagraph] = `>>> DELETE THIS ENTIRE PARAGRAPH <<<\n${paragraphs[targetParagraph]}`;

            const content = paragraphs.join('\n\n');
            const targetParagraphs = paragraphs.filter((_, idx) => idx !== targetParagraph);
            const targetContent = targetParagraphs.join('\n\n');

            return {
                initialContent: content,
                targetContent,
                instructions: `Delete paragraph ${targetParagraph + 1} entirely. Use 'dap' (delete a paragraph).`,
                checkType: 'content_match'
            };
        },
        timePar: 20000,
        keyPressesPar: 5
    },

    // ===== HARD CHALLENGES (14-16) =====
    {
        id: 14,
        name: "Visual Indent",
        difficulty: "hard",
        description: "Use visual mode to fix indentation in a code block.",
        generate: (seed) => {
            const startLine = randomInRange(seed, 3, 6);
            const endLine = startLine + randomInRange(seed + 1, 3, 5);

            const codeLines = CODE_SAMPLE.split('\n');
            // Mess up indentation for the target range
            for (let i = startLine - 1; i < endLine && i < codeLines.length; i++) {
                codeLines[i] = codeLines[i].replace(/^(\s*)/, '');  // Remove leading spaces
            }

            const targetLines = CODE_SAMPLE.split('\n');

            return {
                initialContent: codeLines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `Lines ${startLine}-${endLine} have wrong indentation. Select them with 'V' and indent with '>'.`,
                startLine,
                endLine,
                checkType: 'content_match',
                highlightType: 'target'
            };
        },
        timePar: 25000,
        keyPressesPar: 8
    },
    {
        id: 15,
        name: "Case Change",
        difficulty: "hard",
        description: "Convert specific words to UPPERCASE using visual mode.",
        generate: (seed) => {
            const targetWords = ["server", "database", "cache"][randomInRange(seed, 0, 2)];

            const lines = CONFIG_SAMPLE.split('\n');
            const targetLines = lines.map(line => {
                if (line.includes(targetWords + ':')) {
                    return line.replace(targetWords, targetWords.toUpperCase());
                }
                return line;
            });

            return {
                initialContent: CONFIG_SAMPLE,
                targetContent: targetLines.join('\n'),
                instructions: `Change "${targetWords}" to "${targetWords.toUpperCase()}" in the config section header. Use 'gU' with motion or visual mode.`,
                highlightWord: targetWords,
                checkType: 'content_match',
                highlightType: 'change'
            };
        },
        timePar: 35000,
        keyPressesPar: 10
    },
    {
        id: 16,
        name: "Complex Refactor",
        difficulty: "hard",
        description: "Perform multiple edits: delete, change, and move.",
        generate: (seed) => {
            const deleteLineOffset = randomInRange(seed, 2, 4);
            const changeWord = randomInRange(seed + 1, 0, 1) === 0 ? "calculateTotal" : "formatCurrency";
            const newWord = changeWord === "calculateTotal" ? "computeSum" : "formatMoney";

            const lines = CODE_SAMPLE.split('\n');
            // Task: 1) Delete a comment line, 2) Rename a function
            lines.splice(deleteLineOffset, 0, "// TODO: Remove this deprecated comment");

            const targetLines = CODE_SAMPLE.split('\n').map(line =>
                line.replace(new RegExp(changeWord, 'g'), newWord)
            );

            return {
                initialContent: lines.join('\n'),
                targetContent: targetLines.join('\n'),
                instructions: `1) Delete the TODO comment line. 2) Rename all occurrences of "${changeWord}" to "${newWord}".`,
                checkType: 'content_match'
            };
        },
        timePar: 50000,
        keyPressesPar: 15
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
        ...generated
    };
}

export default challenges;
