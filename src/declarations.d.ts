declare module 'vanilla-jsoneditor' {
    export class JSONEditor {
        constructor(options: { target: Element; props: any });
        destroy(): void;
        update(content: any): void;
        updateProps(props: any): void;
        expand(callback: (path: any) => boolean): void;
        collapseAll(): void; // Assume it exists based on search, if not we fall back to runtime check
    }
    export const Mode: {
        tree: 'tree';
        text: 'text';
        view: 'view';
        form: 'form';
        code: 'code';
        preview: 'preview';
    };
    export interface Content {
        json?: any;
        text?: string;
    }
    export interface JSONContent {
        json: any;
    }
}
