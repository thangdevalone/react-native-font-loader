import { useState, useEffect, useRef } from 'react';
import type { FontLoadOptions, UseFontState } from '../types';
import { loadFont, isFontLoaded } from '../FontLoaderModule';

/**
 * React hook for loading a single font.
 *
 * @example
 * ```tsx
 * const { loaded, error, fontFamily } = useFont({
 *   name: 'Roboto',
 *   source: 'https://example.com/Roboto-Regular.ttf',
 * });
 *
 * if (!loaded) return <ActivityIndicator />;
 *
 * return <Text style={{ fontFamily }}>Hello World</Text>;
 * ```
 */
export function useFont(options: FontLoadOptions): UseFontState {
  const [state, setState] = useState<UseFontState>(() => ({
    loaded: isFontLoaded(options.name),
    error: null,
    fontFamily: options.name,
  }));

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    const { name } = optionsRef.current;

    // Already loaded
    if (isFontLoaded(name) && !optionsRef.current.forceReload) {
      setState({ loaded: true, error: null, fontFamily: name });
      return;
    }

    loadFont(optionsRef.current)
      .then((result) => {
        if (!cancelled) {
          setState({
            loaded: true,
            error: null,
            fontFamily: result.name,
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({
            loaded: false,
            error,
            fontFamily: '',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [options.name, options.source, options.forceReload]);

  return state;
}
