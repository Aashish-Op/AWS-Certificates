# AWS Student Builder Group LPU — Certification Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Storage-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)](LICENSE)

Official certificate issuing, management, and real-time public verification platform built for the **AWS Student Builder Group at Lovely Professional University**.

Designed to handle high-concurrency certificate releases (1,000+ attendees per event) with sub-second verification, verifiable QR code watermarking, PDF rendering, and direct LinkedIn certification integration.

---

## 🌟 Key Features

### 🎓 Student Experience
- **Instant Certificate Access**: Students sign in with their university credentials to access their personalized dashboard.
- **High-Definition PDF Download**: Certificates are rendered with `pdf-lib` and `sharp` at 300 DPI print quality.
- **1-Click "Add to LinkedIn"**: Direct integration with the official **AWS Student Builder Group at LPU** LinkedIn organization (`organizationId: 69826209`), displaying the verified organization badge on recipient profiles.
- **Social Sharing**: Pre-configured social share links for LinkedIn and X with OpenGraph previews.

### 🛡️ Real-Time Verification Engine
- **Verifiable QR Codes**: Each certificate embeds an ISO-compliant QR code directly linking to the canonical verification URL (`/verify/XXXX-XXXX-XXXX`).
- **Unambiguous Certificate IDs**: Base-32 charset (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`) excluding ambiguous characters (`0, 1, I, L, O`) formatted into readable 3-group triplets.
- **Tamper Detection**: Live comparison of recipient name, issue date, and issuing authority against PostgreSQL records.
- **Revocation System**: Immediate revocation capability with reason logging and visual revocation banners.

### ⚡ Admin Management Suite
- **Interactive Visual Layout Editor**: Configure exact placement coordinates for recipient names, QR codes, and certificate IDs on any background template with live preview.
- **Bulk Attendee Ingestion**: Import thousands of recipients via CSV or XLSX with automatic column mapping, duplicate detection, and dry-run validation.
- **Batch Processing**: Background issuance pipeline capable of generating hundreds of signed certificates without blocking the UI.
- **Audit Trails**: Security audit logging for issuance, revocation, and re-issuance events.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) | Server Components, Server Actions, Route Handlers |
| **Language** | TypeScript 5 | Strict static typing and compile-time correctness |
| **UI & Styling** | React 19 + Vanilla CSS Design System | CloudScape-inspired minimalist enterprise UI |
| **Database & Auth** | Supabase (PostgreSQL + Auth SSR) | User management, RLS policies, audit logging |
| **Object Storage** | Supabase Storage (`templates`, `certificate-pdfs`) | High-resolution background templates and generated PDF caches |
| **PDF Generation** | `pdf-lib` + `@pdf-lib/fontkit` + `sharp` | Vector text embedding and high-fidelity rendering |
| **QR Code Engine** | `qrcode` | Vector and data-URL QR rendering with error correction |
| **Rate Limiter** | In-Memory Sliding-Window Limiter | 5-minute TTL eviction sliding window protecting auth and download routes |
| **Testing** | Vitest | Comprehensive unit test coverage for validation, layout math, and IDs |

---

## 📁 Repository Structure

```
cert-platform/
├── docs/                   # Architectural blueprints and decisions
│   ├── ARCHITECTURE.md     # Deep-dive architecture and data flow
│   ├── DECISIONS.md        # Architecture Decision Records (ADRs)
│   ├── FUTURE.md           # Roadmap and backlog items
│   ├── RUNBOOK.md          # Production incident & maintenance runbook
│   ├── SECURITY.md         # Threat model and security policies
│   └── SPECIFICATION.md    # Original engineering requirements specification
├── public/                 # Static assets and brand logos
│   └── brand/              # Official AWS SBG LPU brand assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (app)/          # Authenticated routes (Dashboard, Account)
│   │   ├── (auth)/         # Authentication (Sign in, Register)
│   │   ├── admin/          # Admin portal (Events, Importers, Attendees)
│   │   ├── api/            # Route handlers (PDF download, webhooks)
│   │   └── verify/         # Public certificate verification routes
│   ├── components/         # Reusable React components
│   │   ├── certificates/   # Preview canvas and render components
│   │   ├── dashboard/      # Student credential cards and actions
│   │   ├── layout/         # Navigation, header auth state, footer
│   │   └── ui/             # Buttons, modals, badges, brand marks
│   ├── config/             # Site configuration, LinkedIn constants, ID formats
│   ├── lib/                # Core business logic
│   │   ├── certificate/    # PDF rendering, layout math, ID generator
│   │   ├── linkedin.ts     # LinkedIn "Add to Profile" & share URL builders
│   │   ├── rate-limit.ts   # Sliding-window rate limiter
│   │   └── supabase/       # Server, client, and admin Supabase instances
│   └── types/              # Database and domain TypeScript definitions
├── supabase/
│   └── migrations/         # PostgreSQL schema, indexes, and RLS policies
└── tests/
    └── unit/               # Vitest unit test suites
```

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- **Node.js**: `v20.x` or later
- **Package Manager**: `npm` or `pnpm`
- **Supabase Account**: A Supabase project with PostgreSQL and Storage enabled

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/awsbuilderslpu/AWS-Certificates.git
cd AWS-Certificates
npm install
```

### 3. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://certificates.awslpu.in
LINKEDIN_ORG_ID=69826209
NEXT_PUBLIC_LINKEDIN_ORG_ID=69826209
```

### 4. Database Setup
Apply the database migrations in `supabase/migrations/` to your Supabase SQL editor:
- Creates `events`, `certificates`, `profiles`, `admins`, and `audit_log` tables.
- Applies Row Level Security (RLS) policies.
- Configures storage buckets (`templates` with public access, `certificate-pdfs`).

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Verification

Run the test suite to verify all core algorithms (layout math, ID normalization, CSV validation, LinkedIn URL builders):

```bash
# Run unit tests
npm run test

# Run type check
npm run typecheck

# Run linter
npm run lint
```

---

## 🚢 Production Deployment

### Deploying on Vercel
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Environment Variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-domain.com`)
   - `LINKEDIN_ORG_ID=69826209`
   - `NEXT_PUBLIC_LINKEDIN_ORG_ID=69826209`
4. Click **Deploy**.

---

## 📄 License & Disclaimer

This project is licensed under the MIT License.

**Disclaimer**: This platform is maintained by the **AWS Student Builder Group at Lovely Professional University**. Amazon Web Services and the AWS logo are trademarks of Amazon.com, Inc. or its affiliates.
