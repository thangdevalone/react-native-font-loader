/**
 * Type definitions for react-native-font-loader
 */

/** Supported font file types */
export type FontType = 'ttf' | 'otf';

/** Source type for font loading — auto-detected from the source string */
export type FontSourceType = 'base64' | 'file' | 'url';

/** Options for loading a font */
export interface FontLoadOptions {
  /** Font family name to register the font as */
  name: string;
  /**
   * Font source — can be:
   * - A base64-encoded string of the font file
   * - An absolute file path (e.g., '/path/to/font.ttf')
   * - A URL to download the font from (e.g., 'https://example.com/font.ttf')
   *
   * The source type is auto-detected.
   */
  source: string;
  /** Font type — auto-detected from file extension if not provided */
  type?: FontType;
  /** Whether to cache the font for future loads. Default: true */
  cache?: boolean;
  /** Skip cache and force re-download/re-load. Default: false */
  forceReload?: boolean;
}

/** Result returned after successfully loading a font */
export interface FontLoadResult {
  /** The name used to register the font (same as the input name) */
  name: string;
  /** The actual family name extracted from the font file */
  familyName: string;
  /** Whether the font was loaded successfully */
  loaded: boolean;
}

/** Font metadata extracted from a font file */
export interface FontInfo {
  /** Font family name (e.g., "Roboto") */
  familyName: string;
  /** Full font name (e.g., "Roboto Bold") */
  fullName: string;
  /** PostScript name (e.g., "Roboto-Bold") */
  postScriptName: string;
  /** Font style (e.g., "Regular", "Bold", "Italic") */
  style: string;
  /** CSS font weight value (100-900) */
  weight: number;
}

/** Options for URL-based font loading */
export interface UrlFontOptions {
  /** Custom HTTP headers for the download request */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;
}

/** Progress callback for batch font loading */
export type ProgressCallback = (progress: {
  /** Number of fonts loaded so far */
  loaded: number;
  /** Total number of fonts */
  total: number;
  /** Progress percentage (0-1) */
  percentage: number;
  /** Name of the font that was just loaded */
  currentFont: string;
}) => void;

/** State returned by useFont hook */
export interface UseFontState {
  /** Whether the font has been loaded successfully */
  loaded: boolean;
  /** Error if the font failed to load */
  error: Error | null;
  /** The font family name to use in styles */
  fontFamily: string;
}

/** State returned by useFonts hook */
export interface UseFontsState {
  /** Whether all fonts have been loaded */
  loaded: boolean;
  /** Error if any font failed to load */
  error: Error | null;
  /** Loading progress (0-1) */
  progress: number;
  /** Map of font names to their family names */
  fontFamilies: Record<string, string>;
}
