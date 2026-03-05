# Contributing

## Local quality gates
Before opening a PR:
- Use Node 22 (see `.nvmrc`)
- `npm run verify`

## Standards
- Keep PRs scoped and reviewable.
- Avoid unrelated formatting-only changes.
- Preserve core lifecycle behavior (SEALED/OPEN/EXPIRED/IMMORTAL) unless the change explicitly targets it.
- Document user-visible behavior updates in README or changelog.
- Update `docs/` when routing, data flow, deployment, or source material assumptions change.

## Commit hygiene
- Use precise commit messages describing user impact.
- Include verification output in PR notes.
