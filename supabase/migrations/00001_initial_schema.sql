-- AWS SBG LPU Certificate Platform
-- Initial schema migration
-- See Prompt.md §6 for the authoritative data model specification.

-- Profiles: linked 1:1 to auth.users
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reg_no     text not null,
  full_name  text not null,
  created_at timestamptz not null default now(),
  constraint profiles_reg_no_unique unique (reg_no),
  constraint profiles_reg_no_canonical check (reg_no = upper(btrim(reg_no)) and length(reg_no) between 4 and 20)
);

-- Admins: membership by user_id, never email
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Events
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name              text not null,
  certificate_title text not null,
  event_date        date not null,
  issuer_name       text not null,
  template_path     text,
  template_web_path text,
  template_width    int,
  template_height   int,
  layout            jsonb,
  render_rev        int not null default 1,
  status            text not null default 'draft' check (status in ('draft','published')),
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Certificates
create table public.certificates (
  id             text primary key check (id ~ '^[2-9A-HJKMNP-Z]{12}$'),
  event_id       uuid not null references public.events(id) on delete restrict,
  reg_no         text not null,
  name           text not null,
  status         text not null default 'valid' check (status in ('valid','revoked')),
  revoked_at     timestamptz,
  revoked_reason text,
  render_version int not null default 1,
  issued_at      timestamptz not null default now(),
  issued_by      uuid references auth.users(id),
  constraint certificates_event_reg_unique unique (event_id, reg_no)
);
create index certificates_reg_no_idx on public.certificates (reg_no);
create index certificates_event_id_idx on public.certificates (event_id);

-- Import batches
create table public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  filename     text not null,
  status       text not null default 'staged' check (status in ('staged','committed','discarded')),
  headers      jsonb not null,
  raw_rows     jsonb not null,
  mapping      jsonb,
  summary      jsonb,
  created_at   timestamptz not null default now(),
  committed_at timestamptz
);

-- Audit log
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id),
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

---------------------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------------------

-- Enable RLS on every table
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.events enable row level security;
alter table public.certificates enable row level security;
alter table public.import_batches enable row level security;
alter table public.audit_log enable row level security;

-- profiles: authenticated users can read only their own row.
-- No client insert/update/delete (service role writes).
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

-- events: authenticated users can read published events only
create policy "Authenticated users can read published events"
  on public.events for select
  to authenticated
  using (status = 'published');

-- certificates: authenticated users can read their own certificates
-- (matched via reg_no from profiles) when event is published
create policy "Students can read own certificates"
  on public.certificates for select
  to authenticated
  using (
    reg_no = (select reg_no from public.profiles where user_id = auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'published'
    )
  );

-- admins: no client-facing policies (service role only)
-- import_batches: no client-facing policies (service role only)
-- audit_log: no client-facing policies (service role only)
-- anon has no access to any table

---------------------------------------------------------------------
-- STORAGE BUCKETS (run manually or via Supabase dashboard)
---------------------------------------------------------------------
-- templates: public read, service-role write
-- certificate-pdfs: private, service-role only access
