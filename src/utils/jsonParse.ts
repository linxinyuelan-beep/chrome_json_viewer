export const LARGE_INTEGER_DIGITS = 17;
export const AUTO_DETECT_MIN_LENGTH = 10;

export interface DisplayableJsonOptions {
  allowPrimitives?: boolean;
}

/**
 * Parse JSON while preserving integer tokens that would exceed normal JSON
 * viewer precision. Large integers are returned as strings.
 */
export function parseJsonPreserveLargeNumbers(text: string): unknown {
  if (!text) {
    return null;
  }

  return JSON.parse(quoteLargeIntegerTokens(text));
}

export function isJsonSyntaxValid(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  try {
    parseJsonPreserveLargeNumbers(text);
    return true;
  } catch (e) {
    return false;
  }
}

export function isDisplayableJson(value: unknown, options: DisplayableJsonOptions = {}): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'object') {
    return true;
  }

  return options.allowPrimitives === true;
}

export function isAutoDetectCandidate(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  if (trimmed.length <= AUTO_DETECT_MIN_LENGTH) {
    return false;
  }

  if (!(
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )) {
    return false;
  }

  try {
    const value = parseJsonPreserveLargeNumbers(trimmed);
    if (!isDisplayableJson(value)) {
      return false;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return false;
      }
      return value.some(item => typeof item === 'object' && item !== null);
    }

    return Object.keys(value as Record<string, unknown>).length > 0;
  } catch (e) {
    return false;
  }
}

export function extractJsonCandidates(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const candidates = collectBalancedJsonLikeSubstrings(text);
  const patternCandidates = collectKnownPatternCandidates(text);
  const allCandidates = [...candidates, ...patternCandidates];
  const validCandidates: string[] = [];

  for (const candidate of allCandidates) {
    if (!isAutoDetectCandidate(candidate)) {
      continue;
    }

    const isSubset = allCandidates.some(other => {
      return other !== candidate &&
        other.length > candidate.length &&
        other.includes(candidate) &&
        isAutoDetectCandidate(other);
    });

    if (!isSubset && !validCandidates.includes(candidate)) {
      validCandidates.push(candidate);
    }
  }

  const trimmed = text.trim();
  if (trimmed !== text && isAutoDetectCandidate(trimmed) && !validCandidates.includes(trimmed)) {
    validCandidates.unshift(trimmed);
  }

  return validCandidates;
}

function quoteLargeIntegerTokens(jsonString: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let escapeNext = false;

  while (i < jsonString.length) {
    const char = jsonString[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      i += 1;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      i += 1;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = !inString;
      i += 1;
      continue;
    }

    if (!inString && (char === '-' || isDigit(char))) {
      const tokenStart = i;
      let digitStart = i;
      if (char === '-') {
        digitStart = i + 1;
      }

      if (digitStart >= jsonString.length || !isDigit(jsonString[digitStart])) {
        result += char;
        i += 1;
        continue;
      }

      let tokenEnd = digitStart;
      while (tokenEnd < jsonString.length && isDigit(jsonString[tokenEnd])) {
        tokenEnd += 1;
      }

      const nextChar = jsonString[tokenEnd];
      const integerToken = jsonString.slice(tokenStart, tokenEnd);
      const digitCount = tokenEnd - digitStart;
      if (
        digitCount >= LARGE_INTEGER_DIGITS &&
        !isNumberContinuation(nextChar)
      ) {
        result += `"${integerToken}"`;
      } else {
        result += integerToken;
      }
      i = tokenEnd;
      continue;
    }

    result += char;
    i += 1;
  }

  return result;
}

function collectBalancedJsonLikeSubstrings(text: string): string[] {
  const results: string[] = [];
  const stack: Array<{ char: string; index: number }> = [];
  let inString = false;
  let escapeNext = false;
  let topLevelStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      if (stack.length === 0) {
        topLevelStart = i;
      }
      stack.push({ char: matchingClose(char), index: i });
      continue;
    }

    if ((char === '}' || char === ']') && stack.length > 0) {
      const expected = stack[stack.length - 1];
      if (expected.char !== char) {
        stack.length = 0;
        topLevelStart = -1;
        continue;
      }

      stack.pop();
      if (stack.length === 0 && topLevelStart >= 0) {
        results.push(text.substring(topLevelStart, i + 1));
        topLevelStart = -1;
      }
    }
  }

  return results;
}

function collectKnownPatternCandidates(text: string): string[] {
  const results: string[] = [];
  const reqPatterns = [
    /req:\s*(\{[\s\S]*?[^\\]\})/g,
    /res:\s*(\{[\s\S]*?[^\\]\})/g,
    /param=\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /"params":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /"data":\s*(\{[\s\S]*?[^\\]\}|\[[\s\S]*?[^\\]\])/g,
    /\[\{"success".*?\}\]/g,
    /\[\{"orderItemId".*?\}\]/g,
  ];

  for (const pattern of reqPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      results.push(match[1] || match[0]);
    }
  }

  return results;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9';
}

function isNumberContinuation(char: string | undefined): boolean {
  return char === '.' || char === 'e' || char === 'E';
}

function matchingClose(char: string): string {
  return char === '{' ? '}' : ']';
}
