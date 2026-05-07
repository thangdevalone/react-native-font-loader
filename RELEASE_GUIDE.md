# Release Management

This project uses Google's [Release Please](https://github.com/googleapis/release-please-action) bot for automated releases.

## How it works
1. You push commits to `main` using Conventional Commits (`feat: ...`, `fix: ...`).
2. The `Release Please` GitHub Action automatically opens a Pull Request (named `chore: release v...`).
3. This PR continuously updates itself with your new commits and generates a beautiful `CHANGELOG.md`.
4. When you are ready to publish a new version, you simply **Merge that Release PR**.
5. Once merged, the bot automatically creates a GitHub Release and attaches a Tag.
6. Our `publish.yml` Action listens to that GitHub Release and automatically publishes the new version to **NPM**.

## Commit Message Rules
To trigger the bot, your commits must follow the Conventional Commits format:
- `feat: added new font parsing feature` -> Triggers a Minor version bump (e.g. 1.0.0 -> 1.1.0)
- `fix: fixed memory leak` -> Triggers a Patch version bump (e.g. 1.0.0 -> 1.0.1)
- `feat!: changed API signature` -> The `!` triggers a Major version bump (e.g. 1.0.0 -> 2.0.0)
