import { useState, useEffect, useRef } from 'react';
import type { FontLoadOptions, UseFontsState } from '../types';
import { loadFonts } from '../FontLoaderModule';

/**
 * React hook for loading multiple fonts with progress tracking.
 *
 * @example
 * ```tsx
 * const { loaded, error, progress, fontFamilies } = useFonts([
 *   { name: 'Roboto-Regular', source: 'https://example.com/Roboto-Regular.ttf' },
 *   { name: 'Roboto-Bold', source: 'https://example.com/Roboto-Bold.ttf' },
 * ]);
 *
 * if (!loaded) return <Text>Loading fonts... {Math.round(progress * 100)}%</Text>;
 *
 * return <Text style={{ fontFamily: fontFamilies['Roboto-Regular'] }}>Hello</Text>;
 * ```
 */
export function useFonts(fonts: FontLoadOptions[]): UseFontsState {
  const [state, setState] = useState<UseFontsState>({
    loaded: false,
    error: null,
    progress: 0,
    fontFamilies: {},
  });

  // Use a serialized key to detect when fonts array changes
  const fontsKey = fonts.map((f) => `${f.name}:${f.source}`).join('|');
  const fontsRef = useRef(fonts);
  fontsRef.current = fonts;

  useEffect(() => {
    let cancelled = false;

    setState({
      loaded: false,
      error: null,
      progress: 0,
      fontFamilies: {},
    });

    loadFonts(fontsRef.current, (progress) => {
      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          progress: progress.percentage,
        }));
      }
    })
      .then((results) => {
        if (!cancelled) {
          const fontFamilies: Record<string, string> = {};
          for (const result of results) {
            fontFamilies[result.name] = result.familyName;
          }
          setState({
            loaded: true,
            error: null,
            progress: 1,
            fontFamilies,
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loaded: false,
            error,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fontsKey]);

  return state;
}
