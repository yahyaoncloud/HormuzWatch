# Contributing to GeospatialOps / HormuzShield

Thank you for contributing. This project follows a lightweight contribution workflow focused on small, reviewable changes.

Guidelines

- Fork the repository and create feature branches named `feat/<short-name>` or `fix/<short-desc>`.
- Commit messages: `<type>(scope): short summary` where type is `feat`, `fix`, `chore`, `docs`, or `test`.
- Open a PR against `main` with a clear description and testing steps.

Code style

- TypeScript + React (Vite). Keep functions small and focused.
- Run `npm run lint` (if configured) and `npm test` before submitting.

Testing

- Add unit tests for new logic and integration tests for endpoints.

Review

- PRs should include screenshots or recordings for UI changes and a short description of testing performed.

Security & Secrets

- Do not commit secrets or credentials. Use environment variables and the `scripts/bootstrap-state.ps1` helper for local setup.
