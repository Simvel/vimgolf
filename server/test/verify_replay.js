import { verifySolution } from '../services/validator.js';

async function testReplay() {
    console.log('Testing server-side replay verification...');

    // 1. Simple Case: Type "hello"
    const initialContent1 = "";
    const keystrokes1 = [
        { key: 'i', timestamp: 100 },
        { key: 'h', timestamp: 200 },
        { key: 'e', timestamp: 300 },
        { key: 'l', timestamp: 400 },
        { key: 'l', timestamp: 500 },
        { key: 'o', timestamp: 600 },
        { key: 'Escape', timestamp: 700 }
    ];

    console.log('\nTest 1: Simple insert "hello"');
    const result1 = await verifySolution(initialContent1, keystrokes1);
    console.log('Result 1:', result1);

    // 2. Vim Commands: "dw" to delete word
    const initialContent2 = "delete me";
    const keystrokes2 = [
        { key: 'd', timestamp: 100 },
        { key: 'w', timestamp: 200 }
    ];
    // dw deletes "delete ", leaving "me"

    console.log('\nTest 2: Vim command "dw"');
    const result2 = await verifySolution(initialContent2, keystrokes2);
    console.log('Result 2:', result2);

    // 3. Movement and Edit: "l" then "x"
    const initialContent3 = "abc";
    const keystrokes3 = [
        { key: 'l', timestamp: 100 }, // move to 'b'
        { key: 'x', timestamp: 200 }  // delete 'b'
    ];
    // Should result in "ac"

    console.log('\nTest 3: Move and delete "lx"');
    const result3 = await verifySolution(initialContent3, keystrokes3);
    console.log('Result 3:', result3);
}

testReplay().catch(console.error);
