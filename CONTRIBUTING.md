# Contributing to Pokédex

Thanks for your interest in improving the Pokédex! This guide covers the practical steps for submitting a change.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Pokedex.git
   cd Pokedex
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Making Changes

- Run the dev server with `npm run dev` and verify your change locally.
- Run `npm run lint` and `npm run format:check` before opening a PR (or `npm run format` to auto-fix formatting).
- Run the test suite with `npm test` before opening a PR.
- Keep components focused and reusable; avoid unrelated refactors in the same PR.
- Test in both light and dark themes, and check responsive behavior on mobile and desktop.
- Add or update tests for behavior you change.

## Submitting a Pull Request

1. Commit your changes with a clear, descriptive message.
2. Push to your fork: `git push origin feature/your-feature-name`.
3. Open a pull request against `main` with:
   - A summary of what changed and why.
   - Screenshots or a short clip for UI changes.
   - Any relevant issue number (e.g. `Fixes #12`).

## Reporting Bugs / Requesting Features

Please use the issue templates when opening a new issue — they help make sure reports include the information needed to act on them.

## What to Contribute

- **Bug fixes**: see open issues, or the audit notes in [TODO.md](TODO.md).
- **New features**: see the "Roadmap" section in [README.md](README.md), or [TODO.md](TODO.md) for the full list.
- **Accessibility**: keyboard navigation, screen reader support, ARIA labels.
- **Performance**: API call efficiency, bundle size, loading times.
- **Testing**: unit tests and coverage improvements.
- **Documentation**: fixing typos, clarifying instructions, adding examples.
