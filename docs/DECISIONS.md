# Architecture Decisions

Decisions made during implementation. Format: context, decision, alternatives considered, consequence.

---

## 1. Registration Number Pattern

**Context:** LPU registration numbers like `12409260` — 8 digits exactly.
**Decision:** `REG_NO_PATTERN = /^\d{8}$/` after trim + uppercase normalization.
**Alternatives:** Alphanumeric pattern, variable length.
**Consequence:** Simple validation. If format changes, update `config/site.ts`.

## 2. Local-first Development

**Context:** Owner wants everything working locally before cloud setup.
**Decision:** Supabase is the primary backend. Rate limiting uses a built-in lightweight in-memory sliding window limiter with automatic TTL cleanup, requiring no Redis or external caching service in production or development.
**Alternatives:** Require Redis or Upstash.
**Consequence:** Rate limiting runs out-of-the-box everywhere with zero extra configuration or external accounts.

## 3. Password Reset

**Context:** Owner said "leave this feature or keep but website should work without."
**Decision:** Password reset flow is implemented but gracefully degrades if Resend SMTP is not configured. The form shows a message explaining email delivery requires configuration.
**Alternatives:** Remove entirely.
**Consequence:** Full auth flow is ready when Resend is configured.

## 4. Template Format

**Context:** Owner asked about PDF/PNG/SVG upload. Spec §7.3 says PNG/JPG only.
**Decision:** Accept PNG and JPG templates only, max 10MB. Use `sharp` to normalize.
**Alternatives:** Accept SVG/PDF and convert.
**Consequence:** Simpler, safer processing. Admins export from Canva/Figma as PNG.

## 5. Certificate ID Format

**Context:** Need unguessable, human-readable IDs.
**Decision:** 12 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (~60 bits entropy), generated with `nanoid`. Displayed as `XXXX-XXXX-XXXX`.
**Alternatives:** UUIDs (too long for display), sequential (guessable).
**Consequence:** URL-friendly, hard to brute-force, easy to read aloud.

## 6. Admin Authorization

**Context:** No email verification, so email-based admin check would be insecure.
**Decision:** Admin status by `admins.user_id` table, never by email match. Seeded via SQL.
**Alternatives:** Email allowlist.
**Consequence:** Secure even without email verification. Admin bootstrap requires DB access.

## 7. LinkedIn Organization ID

**Context:** Owner confirmed LinkedIn page exists but didn't provide numeric ID.
**Decision:** Optional `LINKEDIN_ORG_ID` env var. `Add to profile` URL includes it when set.
**Alternatives:** Hard-code or require at build time.
**Consequence:** Works with or without the ID.
