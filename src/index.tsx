/**
 * react-native-font-loader
 *
 * A modern React Native library for dynamic font loading at runtime.
 * Supports loading fonts from base64, file path, or URL with caching,
 * progress tracking, and React hooks.
 *
 * @packageDocumentation
 */

// Core functions
export {
  loadFont,
  loadFonts,
  loadFontFromFile,
  loadFontFromUrl,
  loadFontFromBase64,
  isFontLoaded,
  getLoadedFonts,
  unloadFont,
  clearFontCache,
  getFontInfo,
} from './FontLoaderModule';

// React hooks
export { useFont } from './hooks/useFont';
export { useFonts } from './hooks/useFonts';

// Types
export type {
  FontType,
  FontSourceType,
  FontLoadOptions,
  FontLoadResult,
  FontInfo,
  UrlFontOptions,
  ProgressCallback,
  UseFontState,
  UseFontsState,
} from './types';
