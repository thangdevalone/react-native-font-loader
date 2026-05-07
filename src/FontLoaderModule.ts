/**
 * Core font loading module.
 * Wraps the native module and adds URL downloading, auto-detection, and caching.
 */

import { NativeModules } from 'react-native';
import type {
  FontLoadOptions,
  FontLoadResult,
  FontInfo,
  FontType,
  UrlFontOptions,
  ProgressCallback,
} from './types';
import {
  detectSourceType,
  detectFontType,
  normalizeFilePath,
} from './utils/sourceDetector';
import {
  registerFont,
  unregisterFont,
  isRegistered,
  getRegistered,
  clearRegistry,
} from './utils/fontCache';

// ---------------------------------------------------------------------------
// Native module bridge
// ---------------------------------------------------------------------------

interface NativeFontLoaderModule {
  loadFontFromBase64(
    name: string,
    base64Data: string,
    type: string,
  ): Promise<FontLoadResult>;
  loadFontFromFile(name: string, filePath: string): Promise<FontLoadResult>;
  loadFontFromUrl(name: string, url: string): Promise<FontLoadResult>;
  unloadFont(name: string): Promise<boolean>;
  clearCache(): Promise<void>;
  getFontInfo(filePath: string): Promise<FontInfo>;
  isFontLoaded(name: string): boolean;
  getLoadedFonts(): string[];
}

const FontLoaderNative: NativeFontLoaderModule = NativeModules.FontLoader;

if (!FontLoaderNative) {
  throw new Error(
    'react-native-font-loader: NativeModule "FontLoader" is null. ' +
      'Make sure you have linked the native module correctly.\n' +
      '- iOS: run `cd ios && pod install`\n' +
      '- Android: rebuild the app'
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a single font from any source (base64, file path, or URL).
 * The source type is auto-detected.
 */
export async function loadFont(options: FontLoadOptions): Promise<FontLoadResult> {
  const { name, source, cache = true, forceReload = false } = options;

  // Check JS cache first
  if (!forceReload && isRegistered(name)) {
    const cached = getRegistered(name);
    if (cached) return cached;
  }

  const sourceType = detectSourceType(source);
  const fontType: FontType = options.type ?? detectFontType(source) ?? 'ttf';

  let result: FontLoadResult;

  switch (sourceType) {
    case 'base64':
      result = await FontLoaderNative.loadFontFromBase64(name, source, fontType);
      break;

    case 'file': {
      const filePath = normalizeFilePath(source);
      result = await FontLoaderNative.loadFontFromFile(name, filePath);
      break;
    }

    case 'url': {
      // Use native download which is much faster and memory-efficient
      result = await FontLoaderNative.loadFontFromUrl(name, source);
      break;
    }
  }

  // Register in JS cache
  if (cache) {
    registerFont(result);
  }

  return result;
}

/**
 * Load multiple fonts with optional progress tracking.
 */
export async function loadFonts(
  fonts: FontLoadOptions[],
  onProgress?: ProgressCallback
): Promise<FontLoadResult[]> {
  const results: FontLoadResult[] = [];
  const total = fonts.length;

  for (let i = 0; i < fonts.length; i++) {
    const font = fonts[i]!;
    const result = await loadFont(font);
    results.push(result);

    onProgress?.({
      loaded: i + 1,
      total,
      percentage: (i + 1) / total,
      currentFont: font.name,
    });
  }

  return results;
}

/**
 * Load a font directly from a file path.
 */
export async function loadFontFromFile(
  name: string,
  filePath: string
): Promise<FontLoadResult> {
  return loadFont({ name, source: filePath });
}

/**
 * Load a font from a URL.
 */
export async function loadFontFromUrl(
  name: string,
  url: string,
  _options?: UrlFontOptions // Kept for API compatibility, though native handles timeout internally for now
): Promise<FontLoadResult> {
  const result = await FontLoaderNative.loadFontFromUrl(name, url);
  registerFont(result);
  return result;
}

/**
 * Load a font from a base64-encoded string.
 */
export async function loadFontFromBase64(
  name: string,
  base64: string,
  type: FontType = 'ttf'
): Promise<FontLoadResult> {
  const result = await FontLoaderNative.loadFontFromBase64(name, base64, type);
  registerFont(result);
  return result;
}

/**
 * Check if a font is loaded (synchronous, JS-side check first, then native).
 */
export function isFontLoaded(fontName: string): boolean {
  if (isRegistered(fontName)) return true;
  return FontLoaderNative.isFontLoaded(fontName);
}

/**
 * Get all loaded font names.
 */
export function getLoadedFonts(): string[] {
  return FontLoaderNative.getLoadedFonts();
}

/**
 * Unload a font (iOS: actually unregisters; Android: removes from cache).
 */
export async function unloadFont(fontName: string): Promise<boolean> {
  unregisterFont(fontName);
  return FontLoaderNative.unloadFont(fontName);
}

/**
 * Clear all cached fonts and unload them.
 */
export async function clearFontCache(): Promise<void> {
  clearRegistry();
  return FontLoaderNative.clearCache();
}

/**
 * Get metadata from a font file.
 */
export async function getFontInfo(filePath: string): Promise<FontInfo> {
  const normalized = normalizeFilePath(filePath);
  return FontLoaderNative.getFontInfo(normalized);
}
