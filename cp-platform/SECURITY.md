# Security Policy

**Version:** 1.0  
**Last Updated:** June 2026  

---

## Data Classification

| Data Type | Classification | Storage | Sensitivity |
|-----------|---------------|---------|-------------|
| Project data (client, pipeline, design) | Internal | Browser localStorage | Medium |
| Engineering constants | Public | Source code | Low |
| Application state | Internal | Browser memory | Low |
| AI agent memories | Internal | `.claude-flow/data/` | Low |

**This application is client-only. No data is transmitted to any server.**

---

## Data Security

### At Rest
| Storage | Protection | Risk |
|---------|------------|------|
| `localStorage` | Plaintext (browser sandbox) | XSS → data exposure |
| `.claude-flow/data/` | Plaintext (file system) | File system access |
| `.gitnexus/` | Plaintext (file system) | File system access |

### In Transit
| Channel | Protection | Risk |
|---------|------------|------|
| Dev Server (localhost) | None | Local only |
| Production (HTTPS) | TLS 1.3 | None |

### Recommendations
| Priority | Action | Rationale |
|----------|--------|-----------|
| High | Enable Content Security Policy (CSP) | Prevent XSS data exfiltration |
| Medium | Add `X-Content-Type-Options: nosniff` header | Prevent MIME sniffing |
| Low | Add localStorage encryption for sensitive fields | Protect project data |
| Low | Sanitize HTML in PDF/Excel output | Prevent injection in exports |

---

## Dependency Security

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for known CVEs
npm audit --audit-level high
```

### Current Status
- **1 high severity vulnerability** detected (per `npm install` output)
- **Fix:** Run `npm audit fix` and review
- **Policy:** Zero known high/critical vulnerabilities in production

---

## Secure Development Guidelines

| Rule | Description |
|------|-------------|
| Validate all input | All user inputs must be validated at system boundaries |
| No eval() | Never use `eval()`, `new Function()`, or similar |
| No secrets in code | API keys, tokens, passwords must use environment variables |
| Sanitize exports | Sanitize data before writing to PDF/Excel |
| Limit dependencies | Review all new dependencies for trustworthiness |
| Regular audits | `npm audit` on every commit |
| Dependency pinning | Use lockfiles (`package-lock.json`) — ✅ Already committed |

---

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer or open a private advisory on GitHub
3. Include:
   - Type of vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

**Response time:** Within 72 hours for confirmed vulnerabilities.

---

## Compliance

| Standard | Applicability | Status |
|----------|---------------|--------|
| OWASP Top 10 | Web application security | ⚠️ Partial (no CSP, no input sanitization audit) |
| GDPR | EU user data | ✅ Not applicable (no user data collected) |
| CCPA | California user data | ✅ Not applicable (no user data collected) |
| ISO 27001 | Information security | ❌ Not certified (no backend) |

---

## CI/CD Security

```yaml
# GitHub Actions security steps
- run: npm audit --audit-level high
- run: npx eslint . --rulesdir eslint-rules/security
- run: npx playwright install
- run: npx playwright test --grep security
```

---

## Responsible Disclosure

This project uses an open, collaborative security model:
- **No bug bounty program** currently
- **CVEs** filed via GitHub Security Advisories
- **Disclosure:** 90-day coordinated disclosure policy
