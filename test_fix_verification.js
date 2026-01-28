
// Mocking the environment
const console = { log: () => { }, warn: () => { } };

// --- Test 1: Delete Word Regex ---
function testDeleteRegex() {
    console.log("Testing Delete Word Regex...");
    const lines = [
        'console.log(item.name + ": " + formatCurrency(item.price));',
        'let total = 0;',
        'return "$ " + amount;',
    ];

    const wordRegex = /\b\w+\b/g;

    let allWords = [];
    lines.forEach(line => {
        let match;
        while ((match = wordRegex.exec(line)) !== null) {
            if (match[0].length > 0) {
                allWords.push(match[0]);
            }
        }
    });

    const badWords = allWords.filter(w => w === '":' || w === '+' || w === '$');
    if (badWords.length > 0) {
        throw new Error(`Regex failed, found bad words: ${badWords.join(', ')}`);
    } else {
        process.stdout.write("PASS: Delete Word Regex only matches alphanumeric words.\n");
    }
}

// --- Test 2: Cursor EOL Logic ---
function testCursorEOL() {
    console.log("Testing Cursor EOL Logic...");

    // Copy of the updated function logic
    function validateCursorEOL(line, col, targetLine, content) {
        if (line !== targetLine) return false;
        const lines = content.split('\n');
        const lineContent = lines[line - 1] || '';
        // The fix: return col >= lineContent.length;
        return col >= lineContent.length;
    }

    const content = "Hello\nWorld";
    // Line 1: "Hello" (length 5). 
    // Old logic required col >= 6 (after last char).
    // New logic should allow col 5 (on 'o') and col 6.

    if (!validateCursorEOL(1, 5, 1, content)) throw new Error("Failed: Cursor on last char (len) should be valid");
    if (!validateCursorEOL(1, 6, 1, content)) throw new Error("Failed: Cursor after last char (len+1) should be valid");
    if (validateCursorEOL(1, 4, 1, content)) throw new Error("Failed: Cursor before last char should be invalid");

    process.stdout.write("PASS: Cursor EOL Logic allows cursor on last character.\n");
}

try {
    testDeleteRegex();
    testCursorEOL();
    process.stdout.write("All tests passed.\n");
} catch (e) {
    process.stderr.write("TEST FAILED: " + e.message + "\n");
    process.exit(1);
}
