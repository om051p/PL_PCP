# Security

## Dependency Audit

```bash
# Check for vulnerabilities
npm audit --audit-level=high

# Automated weekly check
# .github/workflows/dependency-audit.yml
```

## Production Build Hardening

The Vite build configuration applies:

- **Console removal**: `drop_console: true` in Terser
- **Debug removal**: `drop_debugger: true`
- **Source maps**: Hidden in CI (`sourcemap: 'hidden'`)
- **Code splitting**: Manual chunks for vendor, engine, reporting
- **Chunk size warning**: 500KB limit

## Security Headers (Nginx)

The nginx.conf includes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy` framework

## Verification

```bash
npm run security:check  # Audit + Lint
npm audit               # Vulnerability scan
npm outdated            # Dependency age check
```
