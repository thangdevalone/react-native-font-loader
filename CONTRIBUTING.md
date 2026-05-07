# Contributing to `react-native-font-loader`

First off, thanks for taking the time to contribute! 🎉

We welcome community contributions and pull requests. Please follow these guidelines when contributing to the project.

## Development Setup

1. **Fork and Clone**: Fork the repo and clone your fork locally.
2. **Install Dependencies**:
   ```bash
   yarn install
   ```
3. **Build the Library**:
   ```bash
   yarn prepare
   ```

## Native Code Development

This library uses the **TurboModule** architecture. The native code is located in:
- **Android**: `android/src/main/java/com/fontloader/FontLoaderModule.kt` (Kotlin)
- **iOS**: `ios/FontLoader.mm` (Objective-C++)

### Testing Native Changes

To test native changes, you should link the library locally to an example React Native app:

1. Create a dummy React Native app.
2. Link the library: `yarn add "file:../path/to/react-native-font-loader"`
3. Run the app: `yarn ios` or `yarn android`.

## Code Guidelines

- **TypeScript**: We enforce strict typing. Ensure all code passes `yarn typescript`.
- **Linting**: Keep code clean. (Run `yarn lint` if configured).
- **Native Memory**:
  - On iOS, ensure `CGFontRelease`, `CFRelease`, and `CGDataProviderRelease` are called correctly to prevent memory leaks.
  - On Android, ensure streams (`RandomAccessFile`, `FileOutputStream`) are closed using the `.use {}` block.

## Submitting a Pull Request

1. Create a new branch: `git checkout -b feature/my-new-feature`
2. Make your changes and commit them with descriptive messages.
3. Push to your fork: `git push origin feature/my-new-feature`
4. Open a Pull Request against the `main` branch.

We will review your PR as soon as possible. Thank you!
