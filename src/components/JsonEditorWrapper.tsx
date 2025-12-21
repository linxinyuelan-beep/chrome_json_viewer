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
}

const JsonEditorWrapper = forwardRef<JsonEditorRef, JsonEditorWrapperProps>(({
    data,
    mode = 'tree',
    onChange
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

            // Safely call expandAll if available
            if (typeof jsoneditor.current.expandAll === 'function') {
                jsoneditor.current.expandAll();
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
            jsoneditor.current.update(data);
            // If the data structure changed significantly (like sorting), we might want to expand all again?
            // But usually user wants to keep state. However, for "Sort Keys", it might be better to re-expand.
            // Let's keep it simple for now, update() tries to preserve state.
        }
    }, [data]);

    return (
        <div
            ref={containerRef}
            className="jsoneditor-react-container"
            style={{ height: '100%', width: '100%' }} // Ensure it takes full space
        />
    );
});

export default JsonEditorWrapper;
