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
    const jsonEditorRef = useRef<any>(null);

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
                // vanilla-jsoneditor v3 API: expand(path, callback)
                // To expand all: expand([], () => true)
                jsonEditorRef.current.expand([], () => true);
            }
        },
        collapseAll: () => {
            if (jsonEditorRef.current) {
                // vanilla-jsoneditor v3 API: collapse(path)
                // To collapse all: collapse([])
                jsonEditorRef.current.collapse([]);
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

            // Handle expansion on update using the correct v3 API
            if (expanded) {
                jsonEditorRef.current.expand([], () => true);
            } else {
                jsonEditorRef.current.collapse([]);
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
