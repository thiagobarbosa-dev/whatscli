# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.7.x   | ✅ |
| < 0.7   | ❌ |

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.**

Vulnerabilities reported publicly may be exploited before a fix is available.

Instead, report them privately via **GitHub Security Advisories**:

👉 [Report a vulnerability](https://github.com/thiagobarbosa-dev/whatscli/security/advisories/new)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response time

We aim to respond within **72 hours** and will keep you informed throughout the remediation process. We credit researchers in the release notes unless you prefer to remain anonymous.

---

## Security Considerations for Users

WhatsCLI stores your WhatsApp session credentials locally at `~/.whatscli/auth/`. This directory is created with restricted permissions (`chmod 700`). **Never share or expose this directory.**

Use `whatscli auth logout` to invalidate your session before uninstalling.
