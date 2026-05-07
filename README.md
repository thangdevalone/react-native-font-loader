# react-native-font-loader

A modern React Native library for **dynamic font loading at runtime**. Load fonts from base64, file path, or URL — with caching, progress tracking, and React hooks.

> ⚡ Supports both **Old Architecture** (Bridge) and **New Architecture** (TurboModules-ready)

## Features

| Feature | react-native-dynamic-fonts | **react-native-font-loader** |
|---|---|---|
| Load from base64 | ✅ | ✅ |
| Load from file path | ❌ | ✅ |
| Load from URL | ❌ | ✅ |
| Auto-detect source type | ❌ | ✅ |
| Font caching | ❌ | ✅ |
| Batch loading + progress | Basic | ✅ with callback |
| Font metadata extraction | ❌ | ✅ |
| Unload font | ❌ | ✅ (iOS) |
| Cache management | ❌ | ✅ |
| React Hooks | ❌ | ✅ `useFont` / `useFonts` |
| TypeScript | ❌ | ✅ Full types |
| New Architecture | ❌ | ✅ Compatible |

## Installation

```bash
# npm
npm install react-native-font-loader

# yarn
yarn add react-native-font-loader
```

### iOS

```bash
cd ios && pod install
```

### Android

No additional setup required — the library auto-links.

## Quick Start

### Load a font from URL

```tsx
import { loadFont } from 'react-native-font-loader';

// Source type is auto-detected (base64, file, or URL)
const result = await loadFont({
  name: 'Roboto',
  source: 'https://fonts.example.com/Roboto-Regular.ttf',
});

// Use the font
<Text style={{ fontFamily: 'Roboto' }}>Hello World</Text>
```

### Load from base64

```tsx
import { loadFontFromBase64 } from 'react-native-font-loader';

const result = await loadFontFromBase64('MyFont', base64String, 'ttf');
```

### Load from file

```tsx
import { loadFontFromFile } from 'react-native-font-loader';

const result = await loadFontFromFile('MyFont', '/path/to/font.ttf');
```

### React Hooks

#### `useFont` — Single font

```tsx
import { useFont } from 'react-native-font-loader';

function MyComponent() {
  const { loaded, error, fontFamily } = useFont({
    name: 'CustomFont',
    source: 'https://example.com/CustomFont.ttf',
  });

  if (!loaded) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return <Text style={{ fontFamily }}>Loaded dynamically!</Text>;
}
```

#### `useFonts` — Multiple fonts with progress

```tsx
import { useFonts } from 'react-native-font-loader';

function App() {
  const { loaded, progress, fontFamilies } = useFonts([
    { name: 'Roboto-Regular', source: 'https://example.com/Roboto-Regular.ttf' },
    { name: 'Roboto-Bold', source: 'https://example.com/Roboto-Bold.ttf' },
  ]);

  if (!loaded) {
    return <Text>Loading fonts... {Math.round(progress * 100)}%</Text>;
  }

  return (
    <View>
      <Text style={{ fontFamily: 'Roboto-Regular' }}>Regular text</Text>
      <Text style={{ fontFamily: 'Roboto-Bold' }}>Bold text</Text>
    </View>
  );
}
```

## API Reference

### Core Functions

#### `loadFont(options: FontLoadOptions): Promise<FontLoadResult>`

Load a font from any source. The source type is auto-detected.

```typescript
interface FontLoadOptions {
  name: string;        // Font family name to register
  source: string;      // base64 | file path | URL (auto-detected)
  type?: 'ttf' | 'otf'; // Auto-detected from extension if omitted
  cache?: boolean;     // Default: true
  forceReload?: boolean; // Skip cache, default: false
}
```

#### `loadFonts(fonts, onProgress?): Promise<FontLoadResult[]>`

Load multiple fonts with optional progress callback.

#### `loadFontFromUrl(name, url, options?): Promise<FontLoadResult>`

Load a font from a URL with optional headers and timeout.

#### `loadFontFromFile(name, filePath): Promise<FontLoadResult>`

Load a font from a local file path.

#### `loadFontFromBase64(name, base64, type?): Promise<FontLoadResult>`

Load a font from a base64-encoded string.

### Font Management

#### `isFontLoaded(fontName): boolean`

Check if a font is loaded (synchronous).

#### `getLoadedFonts(): string[]`

Get all currently loaded font names.

#### `unloadFont(fontName): Promise<boolean>`

Unload a font. On iOS, this actually unregisters the font from the system. On Android, it removes the font from the cache.

#### `clearFontCache(): Promise<void>`

Clear all cached fonts and unload them.

#### `getFontInfo(filePath): Promise<FontInfo>`

Extract metadata from a font file.

```typescript
interface FontInfo {
  familyName: string;     // e.g., "Roboto"
  fullName: string;       // e.g., "Roboto Bold"
  postScriptName: string; // e.g., "Roboto-Bold"
  style: string;          // e.g., "Regular", "Bold", "Italic"
  weight: number;         // CSS weight: 100-900
}
```

## Platform Notes

### iOS
- The `name` returned after loading is the font's actual **PostScript name** from the font file. Use this value for `fontFamily` in your styles.
- `unloadFont()` actually unregisters the font from CoreText.

### Android
- The font is registered with React Native's `ReactFontManager`, so `fontFamily` works with the name you provide.
- Fonts are stored in the app's cache directory (`cacheDir/rn_font_loader/`).

## Requirements

- React Native >= 0.71.0
- iOS >= 13.0
- Android minSdk >= 21

## License

MIT
