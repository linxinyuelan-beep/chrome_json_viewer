import { useCallback, useState } from 'react';
import { useJsonClipboard } from './useJsonClipboard';

function formatJsonPathPart(key: string | number): string {
  if (typeof key === 'number') {
    return `[${key}]`;
  }

  if (/^\d+$/.test(key)) {
    return `[${key}]`;
  }

  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }

  return `["${key}"]`;
}

export function jsonPathFromSelectInfo(selectInfo: any): string {
  let pathParts: (string | number)[] = [];

  if (selectInfo.namespace && selectInfo.namespace.length > 0) {
    pathParts = [...selectInfo.namespace];
  }

  if (selectInfo.name !== null && selectInfo.name !== undefined) {
    pathParts.push(selectInfo.name);
  }

  if (pathParts.length === 0) {
    return '$';
  }

  let path = pathParts.map(formatJsonPathPart).join('');
  if (path.startsWith('.')) {
    path = path.substring(1);
  }

  return path ? `$${path.startsWith('[') ? '' : '.'}${path}` : '$';
}

interface UseJsonPathOptions {
  errorText: string;
  copyErrorText: string;
}

export function useJsonPath({ errorText, copyErrorText }: UseJsonPathOptions) {
  const [currentJsonPath, setCurrentJsonPath] = useState('');
  const { copySuccess: pathCopySuccess, copyText } = useJsonClipboard();

  const handleJsonPathSelect = useCallback((selectInfo: any) => {
    try {
      const path = jsonPathFromSelectInfo(selectInfo);
      setCurrentJsonPath(path);
    } catch (err: unknown) {
      console.error('Failed to process JSON path:', err);
      setCurrentJsonPath(errorText);
    }
  }, [errorText]);

  const copyCurrentPath = useCallback(async () => {
    if (!currentJsonPath) {
      return;
    }

    await copyText(currentJsonPath, copyErrorText);
  }, [copyErrorText, copyText, currentJsonPath]);

  return {
    currentJsonPath,
    pathCopySuccess,
    handleJsonPathSelect,
    copyCurrentPath,
  };
}

