import type { FontSourceType, FontType } from '../types';

const URL_REGEX = /^https?:\/\//i;
const FILE_PATH_REGEX = /^(\/|file:\/\/|content:\/\/|[A-Za-z]:\\)/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+=*$/;

/**
 * Auto-detect the source type from the source string.
 *
 * Detection order:
 * 1. URL — starts with http:// or https://
 * 2. File path — starts with / (unix), file://, content://, or drive letter (windows)
 * 3. Base64 — everything else (validated as base64 string)
 */
export function detectSourceType(source: string): FontSourceType {
  if (URL_REGEX.test(source)) {
    return 'url';
  }

  if (FILE_PATH_REGEX.test(source)) {
    return 'file';
  }

  // Default to base64
  return 'base64';
}

/**
 * Extract font type (ttf/otf) from a source string.
 * Returns undefined if type cannot be determined.
 */
export function detectFontType(source: string): FontType | undefined {
  const lower = source.toLowerCase();

  if (lower.endsWith('.otf') || lower.includes('.otf?')) {
    return 'otf';
  }

  if (lower.endsWith('.ttf') || lower.includes('.ttf?')) {
    return 'ttf';
  }

  return undefined;
}

/**
 * Validate that a string is valid base64.
 */
export function isValidBase64(str: string): boolean {
  if (str.length === 0) return false;
  // Quick length check — base64 length must be divisible by 4
  const trimmed = str.replace(/\s/g, '');
  if (trimmed.length % 4 !== 0) return false;
  return BASE64_REGEX.test(trimmed);
}

/**
 * Normalize a file path — removes file:// prefix if present.
 */
export function normalizeFilePath(path: string): string {
  if (path.startsWith('file://')) {
    return path.substring(7);
  }
  return path;
}
