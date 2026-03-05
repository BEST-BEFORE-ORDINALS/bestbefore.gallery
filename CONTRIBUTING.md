# Contributing

## Local quality gates
Before opening a PR:
- `node node_modules/vite/bin/vite.js build`
- `node --test tests/*.test.mjs`

## Standards
- Keep PRs scoped and reviewable.
- Avoid unrelated formatting-only changes.
- Preserve core lifecycle behavior (SEALED/OPEN/EXPIRED/IMMORTAL) unless the change explicitly targets it.
- Document user-visible behavior updates in README or changelog.

## Commit hygiene
- Use precise commit messages describing user impact.
- Include verification output in PR notes.
