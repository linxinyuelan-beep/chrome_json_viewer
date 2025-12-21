import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { JSONEditor, Mode, Content, JSONContent } from 'vanilla-jsoneditor';

// Note: vanilla-jsoneditor usually supplies its own CSS via import, 
// but sometimes valid css import is needed depending on bundler
// It does not have a separate css file in dist like the old one, likely getting injected or imported from package root.
// We will try importing 'vanilla-jsoneditor' implies styles or we might need to check if there is a style file.
// Usually: import 'vanilla-jsoneditor/themes/jse-theme-default.css'; is NOT needed for basic usage, 
// but checking documentation, it says "The library comes with a default styling". 
// However, sometimes we need to clear old styles.

export interface JsonEditorRef {
    expandAll: () => void;
    collapseAll: () => void;
}

interface JsonEditorWrapperProps {
    data: any;
    mode?: 'tree' | 'view' | 'form' | 'code' | 'text' | 'preview';
    onChange?: (data: any) => void;
    expanded?: boolean;
}

const JsonEditorWrapper = forwardRef<JsonEditorRef, JsonEditorWrapperProps>(({
    data,
    mode = 'tree',
    onChange,
    expanded = true
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const jsonEditorRef = useRef<JSONEditor | null>(null);

    // Map legacy modes to simple vanilla-jsoneditor modes if needed
    // 'tree' -> Mode.tree (which is actually 'tree' string in newer versions, checking types is safer if we had them)
    // Actually vanilla-jsoneditor uses 'tree', 'text', 'table'.
    // We will stick to 'tree' for tree/view/form.

    // Function to get current mode compatible with vanilla-jsoneditor
    const getEditorMode = (m: string) => {
        if (m === 'code' || m === 'text') return Mode.text;
        return Mode.tree;
    };

    useImperativeHandle(ref, () => ({
        expandAll: () => {
            if (jsonEditorRef.current) {
                jsonEditorRef.current.expand((path: any) => true);
            }
        },
        collapseAll: () => {
            if (jsonEditorRef.current) {
                // collapse all by returning false for all paths, or use specific method if available
                // .expand(callback) where callback returns boolean. false = collapse?
                // Wait, typically .expand() controls expansion. 
                // There isn;t a direct "collapseAll" method in the new API usually, 
                // but passing a callback that returns false to expand might work, OR simply using a method if it exists.
                // The search result SAID expandAll/collapseAll exist. I will try to use them if they exist on the instance.
                // If not, I'll fallback to expand(path => false).
                const editor = jsonEditorRef.current as any;
                if (typeof editor.collapseAll === 'function') {
                    editor.collapseAll();
                } else if (typeof editor.expand === 'function') {
                    editor.expand(() => false);
                }
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        const currentMode = getEditorMode(mode);
        const content: Content = { json: data };

        jsonEditorRef.current = new JSONEditor({
            target: containerRef.current,
            props: {
                content,
                mode: currentMode as any,
                readOnly: mode === 'view',
                // Disable string truncation ("show more" button) - default is 1000 bytes
                truncateTextSize: 5000,
                onChange: (updatedContent: any, previousContent: any, { contentErrors, patchResult }: any) => {
                    // updatedContent is { json: ... } or { text: ... }
                    if (onChange) {
                        if ('json' in updatedContent) {
                            onChange((updatedContent as JSONContent).json);
                        } else if ('text' in updatedContent) {
                            try {
                                const parsed = JSON.parse((updatedContent as any).text);
                                onChange(parsed);
                            } catch (e) {
                                // ignore invalid json during typing
                            }
                        }
                    }
                }
            }
        });

        return () => {
            if (jsonEditorRef.current) {
                jsonEditorRef.current.destroy();
            }
        };
    }, []);

    // Handle prop updates
    useEffect(() => {
        if (jsonEditorRef.current) {
            const currentContent = { json: data };
            jsonEditorRef.current.update(currentContent);

            // Handle expansion on update
            // Note: update() usually preserves state. 
            // If we strictly want to enforce 'expanded' state on every data update:
            if (expanded) {
                (jsonEditorRef.current as any).expand(() => true);
            } else {
                (jsonEditorRef.current as any).expand(() => false);
            }
        }
    }, [data, expanded]);

    // Handle Mode change
    useEffect(() => {
        if (jsonEditorRef.current) {
            jsonEditorRef.current.updateProps({
                mode: getEditorMode(mode) as any,
                readOnly: mode === 'view'
            });
        }
    }, [mode]);

    return (
        <div
            ref={containerRef}
            className="vanilla-jsoneditor-react-container"
            style={{ height: '100%', width: '100%' }} // Ensure it takes full space
        />
    );
});

export default JsonEditorWrapper;
