import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
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
                // Prevent all mouse interactions except for focusing the editor
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

        const state = EditorState.create({
            doc: initialContent,
            extensions: [
                vim(),
                vimTheme,
                darkTheme,
                keymap.of(defaultKeymap),
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
    }, [initialContent, disabled, onContentChange, recordKeystroke]);

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
