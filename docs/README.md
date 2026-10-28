# AWS SBG LPU Certificate Platform

Certificate issuing and verification platform for AWS Student Builder Group at Lovely Professional University.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start local Supabase (optional, if using local Supabase)
supabase start

# Apply database migrations
supabase db push

# Start the dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL (default: http://localhost:3000) |
| `LINKEDIN_ORG_ID` | No | LinkedIn organization page numeric ID |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Security](docs/SECURITY.md)
- [Runbook](docs/RUNBOOK.md)
- [Future](docs/FUTURE.md)

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript
- **Database & Auth:** Supabase (Postgres)
- **Styling:** Tailwind CSS
- **PDF Generation:** pdf-lib
- **Rate Limiting:** Built-in in-memory rate limiter

## Important Notes

- **No email verification:** Accounts are created as confirmed. See [FUTURE.md](docs/FUTURE.md).
- **First come, first served:** Registration numbers are claimed by whoever registers first.
- **Admin bootstrap:** Admin accounts must be seeded via SQL. See [RUNBOOK.md](docs/RUNBOOK.md).
