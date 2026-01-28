import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, Decoration } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';

// Custom theme for the vim editor
const vimTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '14px',
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    },
    '.cm-content': {
        caretColor: '#00ff00',
        padding: '10px',
    },
    '.cm-cursor': {
        borderLeftColor: '#00ff00',
        borderLeftWidth: '2px',
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
    },
    '.cm-gutters': {
        backgroundColor: '#1a1a2e',
        color: '#7f8c8d',
        border: 'none',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(0, 255, 0, 0.3)',
    },
    '.cm-vim-panel': {
        backgroundColor: '#1a1a2e',
        color: '#00ff00',
        padding: '4px 8px',
    },
    // Visual cue styles
    '.cm-target-line': {
        backgroundColor: 'rgba(0, 255, 136, 0.15)',
    },
    '.cm-target-match': { // Default fallback
        backgroundColor: 'rgba(0, 255, 136, 0.2)',
        color: '#ffffff',
        fontWeight: 'bold',
        borderRadius: '2px',
        padding: '0 2px',
    },
    '.cm-delete-match': {
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
        color: '#f87171',
        fontWeight: 'bold',
        textDecoration: 'line-through',
        borderRadius: '2px',
        padding: '0 2px',
    },
    '.cm-change-match': {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        color: '#fbbf24',
        fontWeight: 'bold',
        borderRadius: '2px',
        padding: '0 2px',
    },
    '.cm-delete-line': {
        backgroundColor: 'rgba(248, 113, 113, 0.15)',
    },
});

// Dark background
const darkTheme = EditorView.theme({
    '&': {
        backgroundColor: '#0f0f1a',
        color: '#e0e0e0',
    },
    '.cm-content': {
        backgroundColor: '#0f0f1a',
    },
}, { dark: true });

function VimEditor({
    initialContent,
    targetContent,
    onContentChange,
    onKeystroke,
    onSubmit,
    highlightWord,
    targetLine,
    highlightType,
    disabled = false
}) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const keystrokesRef = useRef([]);
    const startTimeRef = useRef(null);
    const [mode, setMode] = useState('NORMAL');
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [keystrokeCount, setKeystrokeCount] = useState(0);

    // Record keystroke with timestamp
    const recordKeystroke = useCallback((key) => {
        if (!startTimeRef.current) {
            startTimeRef.current = performance.now();
        }

        const timestamp = performance.now() - startTimeRef.current;
        const keystroke = { key, timestamp: Math.round(timestamp) };
        keystrokesRef.current.push(keystroke);
        setKeystrokeCount(keystrokesRef.current.length);

        if (onKeystroke) {
            onKeystroke(keystroke, keystrokesRef.current.length);
        }
    }, [onKeystroke]);

    // Handle submit
    const handleSubmit = useCallback(() => {
        if (!viewRef.current) return;

        const content = viewRef.current.state.doc.toString();
        const keystrokes = keystrokesRef.current;
        const totalTime = keystrokes.length > 0
            ? keystrokes[keystrokes.length - 1].timestamp
            : 0;

        // Get current cursor position for navigation challenge validation
        const pos = viewRef.current.state.selection.main.head;
        const lineInfo = viewRef.current.state.doc.lineAt(pos);
        const cursorPosition = {
            line: lineInfo.number,
            col: pos - lineInfo.from + 1
        };

        onSubmit({
            content,
            keystrokes,
            totalTime,
            keystrokeCount: keystrokes.length,
            cursorPosition
        });
    }, [onSubmit]);



    useEffect(() => {
        if (!editorRef.current || disabled) return;

        // Block macro recording by overriding 'q' in normal mode
        Vim.defineEx('q', '', () => {
            // Do nothing - macros disabled
        });

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged && onContentChange) {
                onContentChange(update.state.doc.toString());
            }

            // Update cursor position
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursorPos({
                line: line.number,
                col: pos - line.from + 1
            });
        });

        // Mode change listener
        const modeListener = EditorView.updateListener.of((update) => {
            try {
                const cm = update.view.cm;
                if (cm && cm.state && cm.state.vim) {
                    const vimMode = cm.state.vim.mode || 'normal';
                    setMode(vimMode.toUpperCase());
                }
            } catch (e) {
                // Fallback
            }
        });

        // Block mouse clicks from moving the cursor (prevents cheating)
        const blockMouseEvents = EditorView.domEventHandlers({
            mousedown: (event) => {
                event.preventDefault();
                return true;
            },
            click: (event) => {
                event.preventDefault();
                return true;
            },
            dblclick: (event) => {
                event.preventDefault();
                return true;
            },
        });

        // Effect to update visual cues
        const setVisualCues = StateEffect.define();

        const visualCuesField = StateField.define({
            create() { return Decoration.none; },
            update(decorations, tr) {
                decorations = decorations.map(tr.changes);
                for (let e of tr.effects) {
                    if (e.is(setVisualCues)) {
                        decorations = e.value;
                    }
                }
                return decorations;
            },
            provide: f => EditorView.decorations.from(f)
        });

        // Calculate initial decorations based on diff between initial and target content
        let initialDecorations = [];
        const doc = EditorState.create({ doc: initialContent }).doc;

        // For navigation challenges: highlight target line in green
        // Navigation challenges have identical initial and target content
        if (targetLine && highlightType === 'target' && initialContent === targetContent) {
            if (targetLine <= doc.lines) {
                const lineInfo = doc.line(targetLine);
                initialDecorations.push(
                    Decoration.line({ class: 'cm-target-line' }).range(lineInfo.from)
                );
            }
        }

        // For deletion/edit challenges: compute diff and highlight differences
        if (targetContent && initialContent !== targetContent) {
            const initialLines = initialContent.split('\n');
            const targetLines = targetContent.split('\n');

            // Determine if this is a line deletion (fewer lines in target)
            const isLineDeletion = targetLines.length < initialLines.length;

            // Track character offset in the document
            let charOffset = 0;

            for (let i = 0; i < initialLines.length; i++) {
                const line = initialLines[i];
                const lineStart = charOffset;
                const lineEnd = charOffset + line.length;

                if (isLineDeletion) {
                    // Check if this specific line is being deleted
                    // A line is deleted if it exists in initial but not in target (exact match)
                    const lineExistsInTarget = targetLines.includes(line);

                    if (!lineExistsInTarget && line.trim().length > 0) {
                        // This entire line is being deleted
                        initialDecorations.push(
                            Decoration.line({ class: 'cm-delete-line' }).range(lineStart)
                        );
                    }
                } else {
                    // Same number of lines - compare line by line for word-level changes
                    const correspondingTargetLine = targetLines[i] || '';

                    if (correspondingTargetLine !== line) {
                        // Find the words/characters that are different
                        const initialWords = line.split(/(\s+)/);
                        const targetWords = correspondingTargetLine.split(/(\s+)/);
                        const targetWordSet = new Set(targetWords);

                        let wordOffset = lineStart;
                        for (const word of initialWords) {
                            if (word.trim() && !targetWordSet.has(word)) {
                                // This word is being deleted or changed
                                const className = highlightType === 'change' ? 'cm-change-match' : 'cm-delete-match';
                                initialDecorations.push(
                                    Decoration.mark({ class: className }).range(wordOffset, wordOffset + word.length)
                                );
                            }
                            wordOffset += word.length;
                        }
                    }
                }

                // Move to next line (+1 for newline character, except for last line)
                charOffset = lineEnd + (i < initialLines.length - 1 ? 1 : 0);
            }
        }

        // Also support explicit highlightWord for backwards compatibility
        if (highlightWord && (highlightType === 'delete' || highlightType === 'change' || highlightType === 'target')) {
            const regex = new RegExp(highlightWord, 'g');
            let match;
            const text = initialContent;
            while ((match = regex.exec(text)) !== null) {
                const className = highlightType === 'delete' ? 'cm-delete-match'
                    : highlightType === 'change' ? 'cm-change-match'
                        : 'cm-target-match';

                initialDecorations.push(
                    Decoration.mark({ class: className }).range(match.index, match.index + match[0].length)
                );
            }
        }

        const decorationsSet = Decoration.set(initialDecorations.sort((a, b) => a.from - b.from));

        const state = EditorState.create({
            doc: initialContent,
            extensions: [
                vim(),
                vimTheme,
                darkTheme,
                keymap.of(defaultKeymap),
                lineNumbers(),
                visualCuesField.init(() => decorationsSet),
                updateListener,
                modeListener,
                EditorView.lineWrapping,
                blockMouseEvents,
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        // Native keydown listener to capture ALL keystrokes before Vim processes them
        const handleKeyDown = (event) => {
            // Block 'q' for macro recording in normal mode
            if (event.key === 'q' && !event.ctrlKey && !event.metaKey) {
                try {
                    const vimState = view.state.field(vim().field, false);
                    if (vimState && vimState.mode !== 'insert') {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                } catch (e) {
                    // If we can't check mode, allow the key
                }
            }

            // Ignore repeated keys (holding down a key)
            if (event.repeat) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // Record the keystroke
            let keyName = event.key;
            if (event.ctrlKey) keyName = `Ctrl+${keyName}`;
            if (event.metaKey) keyName = `Cmd+${keyName}`;
            if (event.altKey) keyName = `Alt+${keyName}`;

            // Ignore modifier-only keys
            if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
                // console.log('Recording key:', keyName, event.timeStamp); // Debug log
                recordKeystroke(keyName);
            }
        };

        // Use capture phase to get events before Vim extension
        const currentEditor = editorRef.current;
        currentEditor.addEventListener('keydown', handleKeyDown, true);

        // Focus the editor
        view.focus();

        return () => {
            currentEditor?.removeEventListener('keydown', handleKeyDown, true);
            view.destroy();
        };
    }, [initialContent, disabled, onContentChange, recordKeystroke, highlightWord, targetLine, highlightType]);

    // Reset keystrokes when content changes
    useEffect(() => {
        keystrokesRef.current = [];
        startTimeRef.current = null;
        setKeystrokeCount(0);
    }, [initialContent]);

    return (
        <div className="vim-editor-container">
            <div className="vim-editor-header">
                <div className="vim-mode">
                    <span className={`mode-indicator mode-${mode.toLowerCase()}`}>
                        -- {mode} --
                    </span>
                </div>
                <div className="vim-stats">
                    <span className="cursor-pos">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                    <span className="keystroke-count">{keystrokeCount} keys</span>
                </div>
            </div>

            <div
                ref={editorRef}
                className="vim-editor"
                style={{ opacity: disabled ? 0.5 : 1 }}
            />

            {highlightWord && (
                <div className="target-hint">
                    <span className="hint-label">Target:</span> Find "{highlightWord}"
                </div>
            )}

            {targetLine && (
                <div className="target-hint">
                    <span className="hint-label">Target:</span> Line {targetLine}
                </div>
            )}

            <div className="vim-editor-footer">
                <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={disabled}
                >
                    ✓ Submit Solution
                </button>
                <div className="vim-help">
                    <span>:help | ESC = Normal | i = Insert | v = Visual | Macros disabled</span>
                </div>
            </div>
        </div>
    );
}

export default VimEditor;
