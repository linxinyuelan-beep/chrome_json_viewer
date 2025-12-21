import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';
import '../assets/styles/jsoneditor-custom.css'; // We might need some custom overrides

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
    expanded = true // Default to expanded
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const jsoneditor = useRef<JSONEditor | null>(null);

    useImperativeHandle(ref, () => ({
        expandAll: () => {
            if (jsoneditor.current && typeof jsoneditor.current.expandAll === 'function') {
                jsoneditor.current.expandAll();
            }
        },
        collapseAll: () => {
            if (jsoneditor.current && typeof jsoneditor.current.collapseAll === 'function') {
                jsoneditor.current.collapseAll();
            }
        }
    }));

    useEffect(() => {
        if (containerRef.current) {
            const options: JSONEditorOptions = {
                mode: mode,
                onChangeJSON: onChange,
                // Disable main menu bar if we want a cleaner look, but it has useful features
                mainMenuBar: true,
                navigationBar: true,
                statusBar: true,
            };

            jsoneditor.current = new JSONEditor(containerRef.current, options);
            jsoneditor.current.set(data);

            // Safely call expandAll if available and requested
            if (expanded && typeof jsoneditor.current.expandAll === 'function') {
                jsoneditor.current.expandAll();
            } else if (!expanded && typeof jsoneditor.current.collapseAll === 'function') {
                jsoneditor.current.collapseAll();
            }
        }

        return () => {
            if (jsoneditor.current) {
                jsoneditor.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        if (jsoneditor.current) {
            // Use set() instead of update() to force re-render, which is needed for key sorting to show up
            jsoneditor.current.set(data);

            // Re-apply expansion state after data update
            if (expanded && typeof jsoneditor.current.expandAll === 'function') {
                jsoneditor.current.expandAll();
            } else if (!expanded && typeof jsoneditor.current.collapseAll === 'function') {
                jsoneditor.current.collapseAll();
            }
        }
    }, [data, expanded]); // Re-run when data or expansion preference changes

    return (
        <div
            ref={containerRef}
            className="jsoneditor-react-container"
            style={{ height: '100%', width: '100%' }} // Ensure it takes full space
        />
    );
});

export default JsonEditorWrapper;
