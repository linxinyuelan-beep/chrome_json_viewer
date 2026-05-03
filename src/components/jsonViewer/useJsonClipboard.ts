import { useCallback, useState } from 'react';

const COPY_SUCCESS_RESET_DELAY_MS = 2000;

async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);

  try {
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('Failed to copy using execCommand');
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

interface UseJsonClipboardResult {
  copySuccess: boolean;
  copyText: (text: string, errorMessage: string) => Promise<void>;
  copyJson: (jsonData: unknown, errorMessage: string) => Promise<void>;
}

export function useJsonClipboard(): UseJsonClipboardResult {
  const [copySuccess, setCopySuccess] = useState(false);

  const markSuccess = useCallback(() => {
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), COPY_SUCCESS_RESET_DELAY_MS);
  }, []);

  const copyText = useCallback(async (text: string, errorMessage: string) => {
    try {
      await writeTextToClipboard(text);
      markSuccess();
    } catch (err: unknown) {
      console.error('Failed to copy:', err);
      let detail = 'Unknown error';
      if (err instanceof Error) {
        detail = err.message;
      }
      alert(`${errorMessage}: ${detail}`);
    }
  }, [markSuccess]);

  const copyJson = useCallback(async (jsonData: unknown, errorMessage: string) => {
    const formattedJson = JSON.stringify(jsonData, null, 2);
    await copyText(formattedJson, errorMessage);
  }, [copyText]);

  return {
    copySuccess,
    copyText,
    copyJson,
  };
}

export async function copyJsonViewValue(value: unknown): Promise<void> {
  const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  await writeTextToClipboard(textToCopy);
}

