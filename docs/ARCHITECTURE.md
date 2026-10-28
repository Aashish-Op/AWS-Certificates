# Architecture

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Students   │     │   Verifier   │     │    Admin      │
│   Browser    │     │   Browser    │     │   Browser     │
└──────┬───────┘     └──────┬───────┘     └──────┬────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Auth   │  │Dashboard │  │  Verify   │  │  Admin  │ │
│  │ Pages   │  │  Page    │  │  Page     │  │  Pages  │ │
│  └────┬────┘  └────┬─────┘  └────┬──────┘  └────┬────┘ │
│       │            │             │               │      │
│       ▼            ▼             ▼               ▼      │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Server Actions / Route Handlers         │   │
│  │  (validate → authorize → call service → respond)  │   │
│  └─────────────────────┬────────────────────────────┘   │
│                        │                                 │
│  ┌─────────────────────▼────────────────────────────┐   │
│  │              Services (business logic)             │   │
│  │  auth, events, certificates, import, audit         │   │
│  └─────────────────────┬────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────┘
                         │
           ┌─────────────┴──────────────┐
           ▼                            ▼
    ┌────────────┐               ┌──────────┐
    │  Supabase  │               │ Supabase │
    │  Postgres  │               │ Storage  │
    │  + Auth    │               │          │
    └────────────┘               └──────────┘
```

## Data Flow

### Certificate Issuance
1. Admin creates event → uploads template → positions layout
2. Admin uploads attendee CSV/XLSX → system parses and validates
3. Admin confirms import → certificates created in transaction
4. Admin publishes event → certificates visible to students

### PDF Generation (Lazy)
1. Student clicks "Download PDF" on dashboard
2. Server checks cache: `{event_id}/{cert_id}-r{render_rev}-v{render_version}.pdf`
3. If cached → redirect to signed URL
4. If not → render with pdf-lib → upload to storage → redirect to signed URL

### Verification
1. Anyone opens `/verify/{id}` → ISR-cached page served from CDN
2. On mutation (revoke, rename) → on-demand revalidation
3. Page shows certificate status from server (service-role client, public columns only)

## Caching Strategy
- Verify pages: ISR with long revalidate + on-demand revalidation on mutations
- PDFs: cached in Supabase Storage, keyed by render versions
- Dashboard: no cache (server component, RLS-bound)

## Load Test Results
(To be completed in Phase 8)
