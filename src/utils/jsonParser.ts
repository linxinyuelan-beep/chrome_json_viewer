import { parseJsonPreserveLargeNumbers } from './jsonParse';

/**
 * Backward-compatible parser entrypoint.
 * Prefer parseJsonPreserveLargeNumbers for new code.
 */
export function parseJsonSafely(jsonString: string): any {
  return parseJsonPreserveLargeNumbers(jsonString);
}
