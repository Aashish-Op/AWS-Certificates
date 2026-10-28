# Security

## Threat Model Summary

### 1. Registration Number Squatting
**Threat:** Someone registers with another student's registration number before the real student does.
**Status:** Accepted tradeoff (owner decision).
**Mitigation:** Rate limiting (5 registrations/hour/IP). Support email displayed for disputes. Admin can release a squatted reg number via runbook SQL.

### 2. Certificate Forgery
**Threat:** Someone edits a downloaded PDF and presents it as authentic.
**Mitigation:** Every certificate has a unique verification URL and QR code. The verify page always shows the real server record. A comparison against the PDF detects tampering.

### 3. Upload Abuse
**Threat:** Malicious file uploads disguised as templates or CSV/XLSX.
**Mitigation:** File type validated by magic bytes (not just extension/MIME). Images re-encoded through `sharp`. Size limits enforced before parsing. XLSX macros rejected.

### 4. Brute Force / Enumeration
**Threat:** Automated login attempts or certificate ID guessing.
**Mitigation:** Rate limiting on login (10/15min/IP+email), registration (5/hr/IP), and downloads (30/min/user). Certificate IDs have ~60 bits of entropy. Download returns 404 for both unauthorized and missing (no enumeration).

### 5. Data Exposure
**Threat:** PII leakage through public pages, API responses, or logs.
**Mitigation:** Registration number never shown on public verify page. Stack traces never in client responses. Structured logger never logs passwords, tokens, full emails, or reg numbers. `server-only` import on admin client module.

### 6. CSRF / Open Redirects
**Threat:** Cross-site request forgery or redirect to malicious URLs.
**Mitigation:** Next.js server actions have built-in origin checks. The `next` login redirect parameter is validated as a same-origin relative path.

### 7. Client-Side Secret Exposure
**Threat:** Service role key leaked to browser bundle.
**Mitigation:** Admin client module imports `server-only`. No `NEXT_PUBLIC_` prefix on secrets. CI check planned.

## Third-Party Fonts
Bundled fonts in `assets/fonts/` are OFL (Open Font License) licensed. See individual font directories for license files.

## Dependencies
- Lockfile committed and integrity-checked
- `pnpm audit` planned for CI (fail on high or critical)
- Dependabot to be enabled on the GitHub repository
