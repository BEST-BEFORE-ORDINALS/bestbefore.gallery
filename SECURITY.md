# Security

## Reporting
Report potential vulnerabilities privately to maintainers before public disclosure.

## Scope
- Frontend app code under `src/`
- Static/public assets used by production
- Cloudflare Pages deployment configuration

## Baseline requirements
- No hardcoded secrets in source.
- External API usage should degrade gracefully when unavailable.
- Dependency updates should be reviewed for security impact.
