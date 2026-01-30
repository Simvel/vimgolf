import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import './Overlay.css';
import { EditorView, keymap, lineNumbers, Decoration } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap, history } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';
import { validateContent, validateCursorPosition } from '../utils/validator';

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

const EMPTY_OVERLAYS = [];

function VimEditor({
    initialContent,
    targetContent,
    onContentChange,
    onKeystroke,
    onStepComplete,
    highlightWord,
    targetLine,
    highlightType,
    checkType,
    targetValue,
    targetWord,
    highlightColumn,
    deleteCount,

    initialCursor = null,
    overlays = EMPTY_OVERLAYS,
    disabled = false
}) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const keystrokesRef = useRef([]);
    const startTimeRef = useRef(null);
    const [mode, setMode] = useState('NORMAL');
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [keystrokeCount, setKeystrokeCount] = useState(0);
    const [overlayPositions, setOverlayPositions] = useState([]);

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

    // Check completion condition
    useEffect(() => {
        if (disabled || !viewRef.current) return;

        // Give a small delay to ensure state is updated
        const timer = setTimeout(() => {
            const content = viewRef.current.state.doc.toString();
            let isComplete = false;

            // console.log('Checking completion:', { checkType, cursorPos, targetLine, targetValue });

            if (checkType && (checkType.startsWith('cursor_'))) {
                isComplete = validateCursorPosition(cursorPos, content, checkType, targetValue, targetWord, targetLine);
            } else {
                isComplete = validateContent(content, targetContent, checkType);
            }

            if (isComplete) {
                const totalTime = keystrokesRef.current.length > 0
                    ? keystrokesRef.current[keystrokesRef.current.length - 1].timestamp
                    : 0;

                onStepComplete && onStepComplete({
                    content,
                    keystrokes: keystrokesRef.current,
                    totalTime,
                    keystrokeCount: keystrokesRef.current.length,
                    cursorPosition: cursorPos
                });
            }
        }, 50); // Small debounce/delay

        return () => clearTimeout(timer);
    }, [cursorPos, initialContent, targetContent, checkType, targetValue, targetWord, disabled, onStepComplete]);


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
            // Only update state if changed to avoid loops
            const newLine = line.number;
            const newCol = pos - line.from + 1;

            setCursorPos(prev => {
                if (prev.line !== newLine || prev.col !== newCol) {
                    return { line: newLine, col: newCol };
                }
                return prev;
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
            scroll: () => {
                // Trigger overlay update on scroll
                updateOverlayPositions();
            }
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

        // For navigation challenges: highlight target line or specific char
        // Navigation challenges have identical initial and target content
        if (targetLine && highlightType === 'target') {
            if (targetLine <= doc.lines) {
                const lineInfo = doc.line(targetLine);

                // If specific column provided (0-indexed or 1-indexed? Step definition says 0-indexed passed as highlightColumn)
                // Let's assume passed prop highlightColumn is 0-indexed as per normal usage in this app so far (passed from step.highlightColumn).
                if (typeof highlightColumn === 'number') {
                    // Highlight the specific character
                    // Ensure it's within line bounds
                    const from = lineInfo.from + highlightColumn;
                    const to = from + 1; // Highlight single char

                    if (to <= lineInfo.to + 1) { // Allow highlighting slightly past end for EOL?
                        // Vim EOL is usually just the last char or a special block.
                        // But usually we just highlight the char at that pos.
                        initialDecorations.push(
                            Decoration.mark({ class: 'cm-target-match' }).range(from, Math.min(to, lineInfo.to))
                        );
                    }
                } else {
                    // Fallback: Highlight entire line
                    initialDecorations.push(
                        Decoration.line({ class: 'cm-target-line' }).range(lineInfo.from)
                    );
                }
            }
        }

        // Explicit deletion highlighting (Smart Deletion)
        if (highlightType === 'delete' && targetLine && deleteCount) {
            for (let i = 0; i < deleteCount; i++) {
                const currentLineNum = targetLine + i;
                if (currentLineNum <= doc.lines) {
                    const l = doc.line(currentLineNum);
                    initialDecorations.push(
                        Decoration.line({ class: 'cm-delete-line' }).range(l.from)
                    );
                }
            }
        }

        // For deletion/edit challenges: compute diff and highlight differences
        // Pre-calculate targetLines and isLineDeletion
        let isLineDeletion = false;
        let targetLines = [];

        if (targetContent && initialContent !== targetContent && !highlightWord && !deleteCount) {
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
                        // Split by non-word characters to get words and punctuation as separate tokens
                        const initialWords = line.split(/([^\w]+)/);
                        const targetWords = correspondingTargetLine.split(/([^\w]+)/);
                        const targetWordSet = new Set(targetWords);

                        let wordOffset = lineStart;
                        for (const word of initialWords) {
                            if (word !== '' && !targetWordSet.has(word)) {
                                // This token is being deleted or changed
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

        if (highlightWord && (highlightType === 'delete' || highlightType === 'change' || highlightType === 'target')) {
            const regex = new RegExp(highlightWord, 'g');
            let match;
            const text = initialContent;

            while ((match = regex.exec(text)) !== null) {
                // If specific column is provided (preferred)
                if (targetLine && typeof highlightColumn === 'number') {
                    const lineInfo = doc.line(targetLine);
                    const relativeIndex = match.index - lineInfo.from;
                    if (match.index >= lineInfo.from && match.index < lineInfo.to && relativeIndex === highlightColumn) {
                        const className = highlightType === 'delete' ? 'cm-delete-match'
                            : highlightType === 'change' ? 'cm-change-match'
                                : 'cm-target-match';

                        initialDecorations.push(
                            Decoration.mark({ class: className }).range(match.index, match.index + match[0].length)
                        );
                    }
                }
                // Fallback: if only targetLine is provided
                else if (targetLine) {
                    const lineInfo = doc.line(targetLine);
                    // Check if line is deleted
                    let isDeleted = false;
                    if (targetContent) {
                        const initialLines = initialContent.split('\n');
                        const targetLines = targetContent.split('\n');
                        const isLineDeletion = targetLines.length < initialLines.length;
                        if (isLineDeletion && !targetLines.includes(lineInfo.text)) {
                            isDeleted = true;
                        }
                    }

                    if (!isDeleted) {
                        if (match.index >= lineInfo.from && match.index < lineInfo.to) {
                            const className = highlightType === 'delete' ? 'cm-delete-match'
                                : highlightType === 'change' ? 'cm-change-match'
                                    : 'cm-target-match';

                            initialDecorations.push(
                                Decoration.mark({ class: className }).range(match.index, match.index + match[0].length)
                            );
                        }
                    }
                }
                // Fallback: global highlight (legacy)
                else {
                    const className = highlightType === 'delete' ? 'cm-delete-match'
                        : highlightType === 'change' ? 'cm-change-match'
                            : 'cm-target-match';

                    initialDecorations.push(
                        Decoration.mark({ class: className }).range(match.index, match.index + match[0].length)
                    );
                }
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
                history(),
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

        // Set initial cursor position if provided
        if (initialCursor && initialCursor.line > 0) {
            try {
                // Convert 1-indexed line/col to offset
                const lineInfo = view.state.doc.line(initialCursor.line);
                if (!lineInfo) return; // Guard clause

                // Ensure column is within bounds
                // Ensure column is within bounds
                const col = Math.min(Math.max(1, initialCursor.col), lineInfo.length + 1);
                const offset = lineInfo.from + col - 1;

                view.dispatch({
                    selection: { anchor: offset, head: offset },
                    scrollIntoView: true
                });

                // Update local state immediately
                setCursorPos({ line: initialCursor.line, col: col });
            } catch (e) {
                console.warn('Failed to set initial cursor position:', e);
            }
        }

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
    }, [initialContent, disabled, onContentChange, recordKeystroke, highlightWord, targetLine, highlightType, initialCursor, deleteCount]);



    const updateOverlayPositions = useCallback(() => {
        if (!viewRef.current || !overlays || overlays.length === 0) {
            setOverlayPositions([]);
            return;
        }

        const view = viewRef.current;
        const positions = [];

        overlays.forEach((overlay) => {
            try {
                // Determine position
                // If line/col provided
                if (overlay.line && overlay.col) {
                    const doc = view.state.doc;
                    if (overlay.line <= doc.lines) {
                        const lineInfo = doc.line(overlay.line);
                        // 1-indexed col for the overlay prop inputs, but let's be careful.
                        // Usually we use 1-indexed for these challenges.
                        // CodeMirror likes offsets.
                        const colIndex = overlay.col - 1; // Convert 1-indexed to 0-indexed
                        const pos = Math.min(lineInfo.from + colIndex, lineInfo.to);

                        const coords = view.coordsAtPos(pos);
                        if (coords) {
                            // Coords are relative to viewport, but we're rendering absolute in container
                            // We need to adjust for the editor's bounding rect
                            const editorRect = view.dom.getBoundingClientRect();

                            positions.push({
                                top: coords.top - editorRect.top,
                                left: coords.left - editorRect.left,
                                text: overlay.text,
                                type: overlay.type,
                                key: `${overlay.line}-${overlay.col}`
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn("Error calculating overlay position", e);
            }
        });

        // Only update if changed visually - simpler check: if length is 0 and was 0
        if (positions.length === 0 && overlayPositions.length === 0) return;

        // Deep comparison or just blindly set? 
        // To be safe against loops, let's at least compare lengths or stringify keys
        const keys = positions.map(p => p.key).join(',');
        const currentKeys = overlayPositions.map(p => p.key).join(',');

        if (keys !== currentKeys || positions.length !== overlayPositions.length) {
            setOverlayPositions(positions);
        }

    }, [overlays]);

    // Update overlays when content changes or window resizes
    useLayoutEffect(() => {
        updateOverlayPositions();
        window.addEventListener('resize', updateOverlayPositions);
        return () => window.removeEventListener('resize', updateOverlayPositions);
    }, [updateOverlayPositions, cursorPos, initialContent]); // Re-calc on cursor move too? Maybe overkill but safe. Content change will trigger via effect dependencies?
    // Actually the initial useEffect creates the view. content change updates the doc.
    // We should probably hook into the updateListener to trigger this, but let's try with what we have.
    // The viewRef is stable.

    // Add a specific effect to update overlays when content prop changes (new step)
    useEffect(() => {
        // give it a tick for layout
        setTimeout(updateOverlayPositions, 50);
    }, [initialContent, overlays, updateOverlayPositions]);


    // Reset keystrokes when content changes
    useEffect(() => {
        // Do not reset keystrokes between steps automatically if we want to track total time via backend
        // But for per-step keystroke counts in UI, maybe reset?
        // User asked: "remove the keystroke timing validation entirely, and just base total time taken on server timings"
        // So we can keep tracking keystrokes here just for "keys:" display
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
            >
                {overlayPositions.map((pos) => (
                    <div
                        key={pos.key}
                        className="vim-overlay-container"
                        style={{ top: pos.top, left: pos.left }}
                    >
                        {pos.type === 'horizontal' ? (
                            <div className="vim-overlay-pointer-horizontal"></div>
                        ) : (
                            <div className="vim-overlay-pointer"></div>
                        )}
                        {pos.text && (
                            <div className={pos.type === 'horizontal' ? "vim-overlay-text-horizontal" : "vim-overlay-text"}>
                                {pos.text}
                            </div>
                        )}
                    </div>
                ))}
            </div>

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
                <div className="vim-help">
                    <span>:help | ESC = Normal | i = Insert | v = Visual | Macros disabled</span>
                </div>
            </div>
        </div>
    );
}

export default VimEditor;
