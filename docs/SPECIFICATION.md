# AWS SBG LPU Certificate Platform: Agent Build Prompt

You are building a production system. Read this whole file before doing anything.

---

## 0. Operating rules

1. **Role.** Act as a principal engineer at a large, disciplined engineering org. Correctness, security, and maintainability come before speed. The owner is a student who will iterate with you and will not review every line, so quality is your responsibility.
2. **Phase 0 comes first.** Before writing any code, ask the questions in §14 in a single message and wait for answers. Do not assume answers to those.
3. **Decide the rest yourself.** For implementation details not covered here, pick the best-practice option and record it in `docs/DECISIONS.md` (context, decision, alternatives, consequence). Do not ask about those.
4. **Do not invent.** No made-up brand assets, logos, URLs, credentials, approval claims, sample data, or lorem ipsum in the product. No `TODO` or placeholder code in committed work.
5. **Check current docs.** Library APIs (Next.js, Supabase SSR, Upstash, etc.) change. Read the current documentation for the version you install instead of writing from memory.
6. **Scope discipline.** Build only what §2 lists as in scope. Anything else goes in `docs/FUTURE.md`, not in code.
7. **Disagree once.** If a requirement looks wrong, say so once with reasoning, then follow the owner's decision.
8. **Every phase ends green.** Typecheck, lint, tests, and build all pass, and you post a short report: what was done, how to verify it, open questions.
9. **Review gates.** Stop for owner review at the end of Phase 2 and Phase 4. Otherwise continue.

---

## 1. Product

A self-hosted certificate issuing and verification site for **AWS Student Builder Group, Lovely Professional University** at `https://certificate.awslpu.in`.

After an event, an admin uploads a certificate template and an attendee list. The system issues one certificate per attendee, keyed by their college **registration number**. Students create an account, land on a dashboard, and download their PDF. Anyone can verify a certificate through its unique URL, which always shows the real record from the server, so an edited PDF is detectable.

Scale: 1000+ attendees per event, spikes of hundreds of simultaneous visitors on the day certificates are released.

---

## 2. Scope

### In scope
- Student self-registration and login (email + password), password reset
- Student dashboard listing their certificates, PDF download, LinkedIn buttons
- Public verification page and QR code on the PDF
- Admin: events, template upload and name-placement editor, CSV/XLSX import with column mapping and validation, issue, revoke, edit name and regenerate, audit log
- Production hardening, tests, CI, docs, runbook

### Explicitly out of scope (log in `docs/FUTURE.md`, do not build)
- Email OTP or magic-link verification of student accounts
- Protection against someone claiming another student's registration number
- Admin UI for user management or resetting a registration binding (handled manually via the runbook SQL)
- Bulk ZIP download, bulk emailing certificates, Open Badges, blockchain, multi-chapter tenancy, i18n

### Known and accepted tradeoffs (owner decision, do not "fix")
- **First come, first served.** Whoever registers a registration number first gets access to its certificates.
- **No email verification yet.** Accounts are created as confirmed. Document this clearly in `docs/FUTURE.md` and the README.
- Registration errors reveal whether a registration number or email is already taken. Rate limiting is the mitigation.

---

## 3. Roles and core flows

**Roles:** anonymous visitor, student, admin.

**Student flow**
1. Opens `/register`, enters full name, registration number, email, password.
2. Is signed in immediately and lands on `/dashboard`.
3. Sees certificates linked to their registration number (or a clear empty state), downloads the PDF, shares to LinkedIn.

**Verifier flow:** opens `/verify/{id}` from the PDF's QR code or link and sees the real certificate and its status.

**Admin flow**
1. Creates an event and uploads a template.
2. Positions the name, QR code, and certificate ID, then checks a live preview.
3. Uploads the attendee file, maps columns, reviews validation results, and issues.
4. Publishes the event so students can see their generated certificates and can download via their dashboard.
5. Later: corrects a name, or revokes a certificate.

**Important:** the name printed on a certificate comes from the **admin's attendee list**, never from what the student typed at signup. The student's typed name is only for display in the app.

---

## 4. Stack (decided)

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable), App Router, TypeScript `strict`, Node runtime |
| Hosting | Vercel, function region Mumbai (`bom1`) |
| Database, Auth, Storage | Supabase (Postgres), project region `ap-south-1` (Mumbai) |
| Email | Resend, wired as Supabase custom SMTP (password reset only) |
| Rate limiting | Upstash Redis with `@upstash/ratelimit` |
| PDF | `pdf-lib` + `@pdf-lib/fontkit`, embedded TTF fonts |
| Image processing | `sharp` (template normalization) |
| QR | `qrcode` |
| Validation | `zod` everywhere inputs cross a boundary |
| Spreadsheet parsing | `papaparse` (CSV), `exceljs` (XLSX). Do **not** use the npm `xlsx` package (outdated, known vulnerabilities) |
| IDs | `nanoid` `customAlphabet` |
| Styling | Tailwind CSS with design tokens (§9), Radix primitives for accessible behavior |
| Icons | `lucide-react`, functional use only |
| Errors | Sentry |
| Tooling | pnpm, ESLint, Prettier, Husky + lint-staged, Vitest, Playwright, GitHub Actions |

Do not add libraries beyond this list without a one-line justification in `docs/DECISIONS.md`.

The owner has said he already has domain and hosting. Confirm the deployment target in Phase 0 (§14) before committing to Vercel.

---

## 5. Repository layout and engineering standards

```
.
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/            # /, /privacy
│  │  ├─ (auth)/                 # /login /register /forgot-password /reset-password
│  │  ├─ (app)/dashboard/
│  │  ├─ verify/[id]/            # page + opengraph-image
│  │  ├─ admin/                  # events, event detail, import, audit
│  │  └─ api/                    # download, health
│  ├─ components/                # ui/ (primitives), feature components
│  ├─ config/site.ts             # site name, issuer, REG_NO_PATTERN, support email
│  ├─ lib/
│  │  ├─ env.ts                  # zod-validated env, fails fast at boot
│  │  ├─ supabase/               # server.ts, browser.ts, admin.ts ("server-only")
│  │  ├─ certificate/            # layout.ts (shared math), render-pdf.ts, ids.ts
│  │  ├─ import/                 # parse.ts, validate.ts, normalize.ts
│  │  ├─ linkedin.ts, rate-limit.ts, audit.ts, errors.ts, logger.ts
│  └─ server/                    # actions/, queries/, services/ (business logic, no UI)
├─ assets/fonts/                 # bundled OFL-licensed TTFs
├─ supabase/migrations/          # all schema changes, never edit the dashboard by hand
├─ tests/ (unit, e2e, rls)
└─ docs/ (README, ARCHITECTURE, DECISIONS, RUNBOOK, FUTURE, SECURITY)
```

**Standards**
- TypeScript `strict`, `noUncheckedIndexedAccess`. No `any` without a comment explaining why.
- Business logic lives in `server/services`, not in components or route handlers. Handlers and actions do: authenticate, authorize, validate, call service, return a typed result.
- Server actions and route handlers return a discriminated union (`{ ok: true, data } | { ok: false, error: { code, message } }`). Never leak stack traces or DB error text to the client.
- All env access goes through `lib/env.ts`. The service-role client lives in a module that imports `server-only`.
- Small, single-purpose modules. No file over about 300 lines without reason. No dead code, no commented-out code.
- Conventional Commits. CI runs typecheck, lint, unit tests, build on every PR. Main branch is protected.
- Separate Supabase projects for development and production. No production secrets on a developer machine.

---

## 6. Data model (authoritative)

Write this as migrations in `supabase/migrations/`. Adjust only for correctness bugs, and note any change in `docs/DECISIONS.md`.

```sql
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reg_no     text not null,
  full_name  text not null,
  created_at timestamptz not null default now(),
  constraint profiles_reg_no_unique unique (reg_no),
  constraint profiles_reg_no_canonical check (reg_no = upper(btrim(reg_no)) and length(reg_no) between 4 and 20)
);

create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name              text not null,
  certificate_title text not null,        -- shown on certificate page and as LinkedIn "name"
  event_date        date not null,
  issuer_name       text not null,
  template_path     text,                 -- print master in public `templates` bucket
  template_web_path text,                 -- web-optimized JPEG in same bucket
  template_width    int,
  template_height   int,
  layout            jsonb,                -- validated by zod (see §7.6)
  render_rev        int not null default 1, -- bump when template/layout changes
  status            text not null default 'draft' check (status in ('draft','published')),
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.certificates (
  id             text primary key check (id ~ '^[2-9A-HJKMNP-Z]{12}$'),
  event_id       uuid not null references public.events(id) on delete restrict,
  reg_no         text not null,
  name           text not null,
  status         text not null default 'valid' check (status in ('valid','revoked')),
  revoked_at     timestamptz,
  revoked_reason text,
  render_version int not null default 1,   -- bump on name edit
  issued_at      timestamptz not null default now(),
  issued_by      uuid references auth.users(id),
  constraint certificates_event_reg_unique unique (event_id, reg_no)
);
create index certificates_reg_no_idx  on public.certificates (reg_no);
create index certificates_event_id_idx on public.certificates (event_id);

create table public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  filename     text not null,
  status       text not null default 'staged' check (status in ('staged','committed','discarded')),
  headers      jsonb not null,
  raw_rows     jsonb not null,             -- parsed as strings, untouched
  mapping      jsonb,
  summary      jsonb,
  created_at   timestamptz not null default now(),
  committed_at timestamptz
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id),
  action      text not null,               -- e.g. 'event.create', 'import.commit', 'certificate.revoke'
  entity_type text not null,
  entity_id   text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
```

**Certificate ID:** 12 characters from alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no `0 1 I L O`), generated with `nanoid`'s `customAlphabet`. Never sequential. Retry on unique-violation. Display grouped as `XXXX-XXXX-XXXX`, store and route on the raw 12 characters.

**RLS (enable on every table; test it, §11):**
- `profiles`: authenticated users can `select` only their own row. No client insert/update/delete (the server writes with the service role).
- `events`: authenticated users can `select` rows where `status = 'published'`.
- `certificates`: authenticated users can `select` rows where `reg_no = (select reg_no from public.profiles where user_id = auth.uid())` and the event is published. No client writes.
- `admins`, `import_batches`, `audit_log`: RLS enabled, **no policies** (service role only).
- `anon` has no access to any table. The public verify page reads through server code using the service-role client, selecting only public columns.

**Storage:**
- `templates` bucket: **public read**, writes only via service role. Contains blank templates only, which are not sensitive.
- `certificate-pdfs` bucket: **private**, accessed only through server-issued short-lived signed URLs.

**Admin authorization** is by `admins.user_id`, **never by email match**. Accounts are created without email verification, so an email allowlist would let anyone register the admin's email address and become admin. Admins are seeded by SQL after the owner creates his own account (put this in the runbook).

---

## 7. Feature specs

### 7.1 Authentication

- **Supabase Auth, email + password.** Minimum 8 characters, no composition rules, show/hide toggle, no confirm-password field.
- **Register** (`/register`): fields are Full name, Registration number, Email, Password.
  - Normalize the registration number: `trim`, remove all internal whitespace, `toUpperCase`. Validate against `REG_NO_PATTERN` in `config/site.ts` (value from Phase 0).
  - Server action sequence: validate with zod, rate limit, `admin.createUser({ email, password, email_confirm: true })`, insert the profile row, then `signInWithPassword` to set the session cookies.
  - If the profile insert hits the unique constraint, **delete the just-created auth user** (compensating action), then return the "registration number already registered" error. No orphaned auth users on any failure path.
  - Because `admin.createUser` bypasses Supabase's own signup limits, our rate limits are mandatory.
- **Error copy**
  - Reg number taken: "This registration number is already registered. If it is yours and someone else used it, contact {support email}."
  - Email taken: "An account with this email already exists. Sign in instead."
  - Login failure is always the generic "Incorrect email or password."
- **Login, logout:** standard. The `next` parameter must be validated as a same-origin relative path (prevent open redirects).
- **Forgot/reset password:** required for launch. Supabase's built-in email is heavily rate limited, so configure Resend SMTP with SPF, DKIM, and DMARC on the sending domain before launch.
- **Session handling:** use `@supabase/ssr` with the middleware refresh pattern. Middleware protects `/dashboard` and `/admin`. **Authorization is enforced again server-side** in every admin layout, action, and route handler via `requireAdmin()`. Never rely on middleware or hidden UI alone.
- **Rate limits (Upstash):** register 5/hour/IP, login 10 per 15 min per IP+email, forgot-password 3/hour/email and 10/hour/IP, download 30/min/user, import actions 20/hour/admin. Return 429 with a human message and `Retry-After`.

### 7.2 Student dashboard (`/dashboard`)

- Server component. Fetches via the **RLS-bound** client, not the service role.
- One card per certificate: certificate title, event name, event date, issue date, status badge, and actions: **Download PDF**, **Add to LinkedIn**, **Share on LinkedIn**, **Copy verification link**, **View verification page**.
- Revoked certificates show a "Revoked" badge and no download/share actions.
- Empty state: "No certificates are linked to registration number {reg_no} yet. Certificates appear here after the organizers issue and publish them for an event you attended."
- Show the student's registration number and email, plus a sign-out control. No other settings.

### 7.3 Certificate rendering and download

**Templates:** PNG or JPG only (admins export from Canva or Figma). Max upload 10 MB. On upload, use `sharp` to flatten onto white and produce:
1. a **print master**: JPEG q88, max 3508 px wide, target under 1.5 MB,
2. a **web version**: JPEG, max 1600 px wide.

Store both in `templates` and record the dimensions.

**Shared layout math** in `lib/certificate/layout.ts`, used by both the PDF renderer and the verify page so they cannot drift:
- `computeNameLayout(name, layout, font)` measures the name with fontkit and returns the final font size (as a fraction of template height). It starts at `fontSize` and shrinks to `minFontSize` to fit `maxWidth`. If it still does not fit at minimum size, the import validation flags it (see §7.7).
- Positions are fractions of template width/height, so the layout is resolution independent.

**PDF generation (`render-pdf.ts`):**
- Page width is 842 pt, height follows the template aspect ratio. Draw the print master full-bleed, then the name (embedded TTF with fontkit, selected font, centered on the anchor), the QR code, and the certificate ID text.
- QR encodes `https://certificate.awslpu.in/verify/{id}` (read the origin from env). The verification URL is also printed in small text.
- Set PDF metadata: Title, Author (issuer), Subject (verify URL).
- Before rendering, check every name codepoint against the font (`font.hasGlyphForCodePoint`). pdf-lib throws on unencodable characters, so surface this at import time instead of at download time.

**Download route** `GET /api/certificates/[id]/download`:
1. Require a session. Apply the rate limit.
2. Load the certificate with the service-role client.
3. Authorize: the caller is an admin, or their `profiles.reg_no` equals the certificate's `reg_no`. Non-admins additionally need `status = 'valid'` and a published event. On failure return 404 (not 403) so IDs are not probed.
4. Cache key: `{event_id}/{cert_id}-r{events.render_rev}-v{certificates.render_version}.pdf` in `certificate-pdfs`. If missing, render and upload with upsert (concurrent first downloads are harmless).
5. **Do not stream the PDF through the function** (Vercel caps function response bodies at about 4.5 MB). Respond with a `302` to a Supabase **signed URL** valid for 60 seconds, with a download filename of `AWS-SBG-LPU_{event-slug}_{certId}.pdf`. Send `Cache-Control: private, no-store`.
6. Generation is lazy (first download), never a 1000-certificate batch job at issue time.

### 7.4 Public verification (`/verify/[id]`)

- Anonymous, server-rendered, **cached** (ISR with a long `revalidate`), with **on-demand revalidation** on every mutation of that certificate (revoke, unrevoke, rename, event publish/unpublish). Make sure the OG image route is purged too.
- Validate the `id` format with the regex before touching the database.
- Loads through the service-role client, selecting only public columns. **Never display or expose the registration number** on this page or in any public response.
- **Valid:** green status banner "Valid certificate", then the **certificate rendered as HTML** (web-version template as `<img>`, name overlaid with the shared layout math using container query units so it scales at any width, the same bundled font), then a details list: Recipient, Certificate, Event, Event date, Issued by, Issue date, Certificate ID.
- **Revoked:** red status banner "This certificate has been revoked", with the revocation date. Show recipient, event, and ID. Do **not** render the certificate image. Do not show the revocation reason publicly.
- **Not found, malformed ID, or event not published:** one neutral "Certificate not found" page with the same layout (HTTP 404). Offer a field to retype the ID.
- Metadata: `robots: noindex, nofollow` (names are personal data), but full Open Graph and Twitter tags so LinkedIn and WhatsApp previews work.
- `opengraph-image`: generated with `next/og`, 1200×630, brand card with recipient name, certificate title, "Verified certificate", and issuer. A neutral card for revoked or missing.
- Footer line: how to verify an offline copy, i.e. compare the details on this page against the PDF.

### 7.5 LinkedIn

Build in `lib/linkedin.ts`, with unit tests for URL building and encoding:
- **Add to profile:** `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name={certificate_title}&organizationName={issuer}&issueYear={y}&issueMonth={m}&certUrl={verifyUrl}&certId={id}`. Include `organizationId` only when the owner supplies a LinkedIn page ID (§14).
- **Share post:** `https://www.linkedin.com/sharing/share-offsite/?url={verifyUrl}`.
- Both open in a new tab with `rel="noopener noreferrer"`. Use the event date's month/year as the issue date.

### 7.6 Admin: events and template layout

Routes: `/admin` (events table), `/admin/events/new`, `/admin/events/[id]` with tabs **Overview**, **Template & layout**, **Certificates**, **Import**, plus `/admin/audit`.

- **Event form:** name, slug (auto-suggested, editable until first issue), certificate title, event date, issuer name. Status toggle draft/published with a confirmation dialog stating how many certificates become visible.
- **Template & layout editor**
  - Upload template, show it at responsive width with draggable and resizable boxes for **Name**, **QR code**, and **Certificate ID**.
  - Controls: font family (from bundled fonts), max font size, min font size, color, alignment, and name box max width.
  - Stored as `layout` jsonb, validated by zod, all positions and sizes as fractions: `{ version: 1, name: { x, y, maxWidth, align, fontFamily, fontSize, minFontSize, color }, qr: { x, y, size }, certId: { x, y, fontSize, color, align } }`
  - **Live preview must use the real renderer.** Provide a "Preview" action that calls the server PDF renderer with a sample name and displays the result, with quick-pick samples: a short name, a very long four-word name, and a name with diacritics. The drag overlay is for positioning only. The preview is the source of truth.
  - Changing layout or template after certificates exist shows a warning and bumps `events.render_rev`, which invalidates cached PDFs.
- **Fonts:** bundle 4 to 6 OFL-licensed TTFs in `assets/fonts` (a serif, a sans, a script, and so on) with Latin-extended coverage. Verify licenses and record them in `docs/SECURITY.md` or a `THIRD_PARTY.md`.

### 7.7 Admin: attendee import and issue

This is the highest-risk workflow. Data must never be silently altered.

1. **Upload** `.csv` or `.xlsx`. Limits: 5 MB, 5,000 rows, first sheet only. Parse **server-side**. Treat **every cell as a string**. For XLSX numeric cells, convert without scientific notation, and flag any numeric registration cell above 15 significant digits as "possible precision loss". Strip a UTF-8 BOM. Reject macro-enabled or unrecognized formats.
2. **Stage** the raw rows in `import_batches` (status `staged`). No certificates exist yet.
3. **Column mapping.** Show detected headers and a 20-row preview. Pre-select likely columns by header heuristics (`name`, `student name`, `reg`, `registration`, `roll`, `uid`), but the admin must explicitly confirm both mappings. All other columns are ignored and never stored beyond the staged batch.
4. **Validation report** (server-side, authoritative):
   - **Normalization (non-destructive only):** trim, collapse internal whitespace, Unicode NFC. Reg number: also uppercase and remove spaces. **Do not change name casing or spelling.**
   - **Errors** (row excluded until fixed or dropped): blank name, blank or invalid reg number (fails `REG_NO_PATTERN`), duplicate reg number within the file (show both rows), name containing glyphs the chosen font cannot render.
   - **Warnings** (admin decides): name is all caps or all lowercase, contains digits or unusual symbols, has 5 or more tokens, is under 2 or over 60 characters, or will not fit at minimum font size.
   - **Already issued:** rows whose `(event, reg_no)` already has a certificate. Default is **skip**. Offer an explicit "update names for existing" option, which bumps `render_version`.
   - Summary counts: total, valid, warnings, errors, already issued, new to issue.
5. **Review table:** filterable by status, inline edit of a name (the edit is recorded and applies only at commit), per-row "exclude". An optional bulk "Convert selected names to Title Case" action exists but is off by default and needs confirmation.
6. **Commit** requires a confirmation dialog showing exact counts. It runs in a single transaction. Insert with `on conflict (event_id, reg_no) do nothing` unless "update" was chosen. Certificate IDs are generated server-side with collision retry. It is **idempotent**: re-running the same commit creates zero duplicates. Mark the batch `committed`, write an audit entry with counts, and show a result screen with a CSV download of `reg_no, name, certificate_id, verify_url` for the organizers' records.
7. Tell the admin plainly that issuing does not show certificates to students until the event is set to **published**.

### 7.8 Admin: certificates, corrections, revocation, audit

- **Certificates tab:** paginated server-side table with search (name, reg number, ID), filter by status. Columns: ID, Name, Reg no, Status, Issued.
- **Edit name:** validates like import, updates `name`, bumps `render_version`, **keeps the same certificate ID**, revalidates the verify page, writes an audit entry (old and new value).
- **Revoke / unrevoke:** requires a reason (revoke), confirmation dialog, audit entry, immediate verify-page revalidation.
- **No hard delete** of certificates in the UI.
- **Audit log page:** read-only, newest first, filterable by action. Every admin mutation writes a row via one `audit()` helper.

---

## 8. Security requirements

- Validate every input with zod at every boundary (actions, handlers, file contents). Output encoding is React's default. Never use `dangerouslySetInnerHTML`.
- **Secrets:** service-role key and all secrets only in server env, never in client bundles, never logged. `import 'server-only'` on the admin client module. CI check for accidental `NEXT_PUBLIC_` exposure of secrets.
- **Headers** (via `next.config` or middleware): HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera, mic, geolocation), a strict **CSP** compatible with Next.js and Supabase, `frame-ancestors 'none'`.
- **File uploads:** verify magic bytes, not just extension or MIME. Re-encode images through `sharp`. Enforce size limits before parsing.
- **Enumeration:** certificate IDs are unguessable (about 60 bits). 404 for unauthorized and missing alike on the download route.
- **PII:** the registration number is never shown on public pages. Do not log passwords, tokens, full emails, or reg numbers (log IDs). Public verification shows name and event only, and the privacy page says so.
- **Open redirects, CSRF:** same-origin `next` validation. Rely on Next.js server-action origin checks and do not weaken them.
- **Dependencies:** lockfile committed, Dependabot enabled, `pnpm audit` in CI (fail on high or critical).
- **Admin bootstrap:** by SQL on `admins.user_id` only, documented in the runbook.
- Write `docs/SECURITY.md` with the threat model summary: squatting (accepted, §2), forgery (mitigated by the verify page), upload abuse, brute force, data exposure.

---

## 9. UI/UX and design system

**Goal:** it should look like a real AWS-ecosystem product, restrained and functional. Reference **AWS Builder Center (builder.aws.com)** for overall feel and the **Cloudscape Design System (cloudscape.design)** for component patterns and tokens: tables, forms, alerts ("flashbar"), status indicators, empty states. Use Cloudscape's published token values where they differ from the starting values below.

**Starting tokens** (verify against Cloudscape, then define as CSS variables / Tailwind theme):
- Navy header and dark surfaces: `#232F3E` (squid ink), deeper ink for text `#0F1B2A`
- Primary action: AWS orange `#FF9900`, hover `#EC7211`, **dark text on orange** (not white)
- Links and focus accents: `#0972D3`
- Page background `#F9F9FB`, surface `#FFFFFF`, border `#E9EBED`, secondary text `#5F6B7A` (check contrast)
- Success `#037F0C`, error `#D91515`, warning `#8D6605`, each used with an icon **and** text, never color alone
- Type: Inter via `next/font` (Amazon Ember is proprietary, do not use or imitate it). Scale 12/14/16/20/24/32. Body 16 on mobile forms, 14 in admin tables.
- 8 px spacing grid. Radii 4 px (controls) and 8 px (cards). 1 px borders, almost no shadow. **Flat.**

**Layout**
- Public and student pages: dark navy top bar (brand mark left, nav right), white content, simple footer (Privacy, support email, "Not an official AWS website" style disclosure line, worded after owner confirms, §14).
- Admin: same top bar, a left side-navigation for events, a content area with breadcrumbs, page header with actions, dense tables with sticky headers.
- Home `/`: a single clear headline stating what the site is, a **"Verify a certificate" ID input** as the primary element, and secondary Sign in / Register. No hero illustration, no marketing sections.

**Brand:** do **not** draw, trace, or download AWS logos. Build a `<BrandMark />` component that renders the logo files the owner supplies in `public/brand/`. Until they arrive, render the text name only. AWS trademark use must follow program guidelines (§14).

**Anti-slop rules (hard requirements)**
- No gradients, glassmorphism, blobs, glow, floating shapes, or animated backgrounds.
- No emoji anywhere in the UI. Icons only where they carry meaning (status, actions).
- No generic filler copy ("Welcome to the future of…", "Seamless", "Empower"). Write plain, specific, factual microcopy: what happened, what to do next.
- No fake testimonials, stats, or sample certificates.
- Every list or table has a real empty state, loading state (skeleton), and error state with a retry path.
- Buttons say what they do ("Download PDF", "Issue 842 certificates"), not "Submit".
- Destructive and bulk actions use a confirmation dialog stating exact counts and consequences.
- Forms: visible labels (no placeholder-only labels), inline field errors tied via `aria-describedby`, correct `autocomplete`/`inputmode`, server errors summarized at the top.
- Mobile first. The **register, login, dashboard, and verify pages must be excellent at 360 px width**, since most students will use phones. Admin is desktop-first but must not break at 768 px.
- Accessibility: WCAG 2.2 AA, full keyboard operation, visible focus rings, correct landmarks and heading order, `prefers-reduced-motion` respected. Run axe in Playwright on every key page.
- Dates formatted `12 October 2026` (en-IN), event dates have no timezone shift (store as `date`).

---

## 10. Non-functional requirements

- **Performance:** verify page served from the CDN cache (target p95 under 300 ms warm, LCP under 2.5 s on 4G). Dashboard TTFB under 500 ms. No client-side data waterfalls. Lazy-load the layout editor and import review bundles (admin only).
- **Load test (k6) before launch:** 500 concurrent virtual users on `/verify/{id}`, 100 concurrent on login and dashboard, 100 concurrent first-time PDF downloads. Report results in `docs/ARCHITECTURE.md`. Fix anything above the targets.
- **Reliability:** `/api/health` checks DB connectivity and returns minimal info. Hook it to an external uptime monitor (BetterStack or UptimeRobot, free tier). Sentry for server and client errors with PII scrubbing.
- **Data durability:** Supabase daily backups enabled (Pro plan). Because verification must work for years, the runbook also defines a monthly `certificates` + `events` CSV export stored in an organization-owned location.
- **Ownership continuity:** every account (Vercel, Supabase, Resend, Upstash, Sentry, GitHub, domain DNS) must be owned by a club/organization identity with at least two people able to administer it. Document the list in the runbook. The owner is graduating and the system must outlive him.
- **Logging:** structured JSON via `lib/logger.ts`, request IDs, no PII.
- **SEO:** only `/` and `/privacy` indexable. A `robots.txt` blocks `/admin`, `/dashboard`, `/api`, and verify pages carry `noindex`.

---

## 11. Testing (required, in CI)

- **Unit (Vitest):** registration number normalization and validation, name validation/warnings, ID generation and format, LinkedIn URL builder, layout math (`computeNameLayout` with short, long, and unfittable names), import validation and the idempotency logic, XLSX numeric-cell handling (leading zeros, scientific notation, BOM).
- **RLS and authorization tests (run against a local Supabase via the CLI):**
  - Student A cannot read student B's profile or certificates.
  - An unauthenticated client cannot read any table or storage object it should not.
  - A non-admin gets 403/redirect on every admin route and action (call the actions directly, not just through the UI).
  - A non-owner gets 404 on another student's certificate download.
  - Registering an already-claimed reg number leaves **no orphaned auth user**.
  - `anon` role cannot select from `certificates` directly.
- **E2E (Playwright):** register, dashboard (empty state), admin creates event, uploads template, positions name, imports a fixture file (including malformed rows), publishes, student refreshes and downloads a PDF (assert it is a valid PDF containing the verify URL), verify page valid state, revoke then verify shows revoked, rename keeps the same ID.
- **Fixtures:** a messy attendee file with extra columns, blank rows, duplicate reg numbers, leading-zero and scientific-notation reg numbers, ALL-CAPS names, names with diacritics, and a very long name.
- Coverage target: services and lib above 85%. Do not chase coverage in UI glue.

---

## 12. Build phases

Phases 1 to 8 are launch-blocking. The owner needs to issue certificates for the current event as soon as possible, so keep the order and avoid detours.

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0** | Ask the §14 questions. Create repo scaffolding plan. | Answers received, `docs/DECISIONS.md` seeded |
| **1. Foundation** | Repo, tooling, CI, env validation, migrations with RLS, design tokens, base UI primitives, app shell, health route | CI green, migrations apply from scratch, RLS tests scaffolded |
| **2. Auth** | Register (atomic with rollback), login, logout, reset password via Resend, middleware, rate limits, `requireAdmin` | Auth and RLS tests pass. **Stop for owner review** |
| **3. Events and template** | Admin guard, event CRUD, template upload and normalization, layout editor, real-renderer preview | Preview matches final PDF for all sample names |
| **4. Import and issue** | Parse, stage, mapping, validation report, review table, atomic idempotent commit, export | Fixture tests pass, idempotency proven. **Stop for owner review** |
| **5. Dashboard and PDF** | Student dashboard, lazy PDF generation, signed-URL download, caching | Download works for 1,000 certs with no function timeouts |
| **6. Verify** | Verify page, ISR + on-demand revalidation, OG image, QR on PDF, LinkedIn buttons | Verify page cache hit confirmed, LinkedIn preview checked |
| **7. Corrections** | Edit name, revoke/unrevoke, audit log | Same-ID reissue verified, verify page updates immediately |
| **8. Hardening and launch** | Security headers/CSP, axe passes, load test, Sentry, uptime monitor, runbook, privacy page, docs | All §13 checklist items done |

---

## 13. Deliverables and launch checklist

**Docs (in `docs/`, kept accurate):** `README.md` (setup in under 10 minutes, scripts, env vars table), `ARCHITECTURE.md` (diagram, data flow, caching, load test results), `DECISIONS.md`, `RUNBOOK.md`, `SECURITY.md`, `FUTURE.md`.

**RUNBOOK.md must contain copy-paste procedures for:**
- Bootstrapping an admin (SQL).
- Releasing a squatted registration number: look up by reg number, delete the profile and auth user so the real student can register. Includes a verification step before doing it.
- Looking up a student by reg number or email.
- Revoking and reissuing a certificate.
- Rotating Supabase keys, Resend key, and Upstash token.
- Restoring from backup, and the monthly export.
- The list of accounts and who owns each.

**Launch checklist**
- [ ] Domain `certificate.awslpu.in` live with HTTPS, HSTS on
- [ ] Resend domain verified (SPF, DKIM, DMARC pass), password reset email received in Gmail, Outlook, and a college mailbox without landing in spam
- [ ] Production Supabase and Vercel in the same region, backups on
- [ ] RLS tests passing against the production schema
- [ ] Admin account seeded, all admin routes confirmed inaccessible to a normal account
- [ ] **50-person dry run** with real accounts on real phones: register, download, verify, LinkedIn
- [ ] LinkedIn "Add to profile" tested with a real account and a shared link preview checked
- [ ] Load test targets met
- [ ] Template and AWS branding approved per program guidelines (§14)
- [ ] Sentry and uptime monitor alerting a human
- [ ] Privacy page reviewed by the owner
- [ ] Ownership list in the runbook complete

---

## 14. Phase 0: ask the owner these before writing code

Ask all of these in one message and wait. Offer your recommended default for each so the owner can reply quickly.

1. **Registration number format.** Give 3 real examples (length, digits only or alphanumeric) so `REG_NO_PATTERN` is exact. Are leading zeros possible? 

Answer - it will be like name - Ashish Prsad Gupta and reg no - 12409260 now think yourself best approach 

2. **Branding and trademark.** Which logo files and official name should the site use? Has the SBG program contact approved using AWS marks on the site and certificates? What exact disclaimer line should the footer carry? 

answer - yeah evrything is approved and official so you can use AWS and AWS student builder group at lpu logo wherever needed or we can change some thing later also 

3. **Certificate wording.** Issuer name as it should appear ("AWS Student Builder Group, Lovely Professional University"?), and the certificate title pattern per event (for example "Participant, {event name}"). Does any event need multiple roles (participant, speaker, winner)? If yes, a `role` column is added to the attendee import. 

answer -  its according to already uploaded template just have replace participant name uniquely and generate for each participant uniquely linked to their registration number nothing else 

4. **Template.** Orientation and size, plus a sample template file. Any font preference? 

answer - admin will upload template in pdf, png and svg format  or should i upload in any other format ?? that will be easy to handle and generate pdf so immplement that and tell me 


5. **LinkedIn.** Does the group have a LinkedIn organization page? If so, its numeric ID, so the organization logo appears on profiles. 

answer - yes


6. **Hosting and accounts.** Confirm Vercel + Supabase + Resend + Upstash. Which accounts exist already, who owns them, and who is the second administrator for continuity? Confirm DNS access for `awslpu.in`.

answer - first make evything work locaally without thinking about that will do this think later 

7. **Sender address** for password-reset emails (for example `no-reply@awslpu.in`) and the **support email** shown on error messages. 

answer - leave this feature or keep but website should work even without this functionality no issue 
8. **Admin bootstrap.** Which person(s) will be admins at launch? (Seeded after they create their accounts.)  

answer - group leader - ashish gupta , ashishguptaop195@gmail.com , 12402960 , admin@123

9. **Privacy contact and data retention** statement for the privacy page. 

answer - think of it yourself best 
10. **Name display.** Is it acceptable that a student's full name is shown publicly on their verify page (needed for verification)?

answer - yes its perfectly fine no issue 


After the answers, produce a one-page implementation plan confirming scope, decisions, and any deviations, then begin Phase 1.
