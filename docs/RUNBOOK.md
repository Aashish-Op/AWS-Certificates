# Runbook

Operational procedures for the AWS SBG LPU Certificate Platform.

---

## 1. Bootstrap an Admin

After the person creates their account through `/register`:

```sql
-- Find the user ID by email
select id from auth.users where email = 'ashishguptaop195@gmail.com';

-- Insert into admins table
insert into public.admins (user_id) values ('THE-USER-ID-HERE');
```

## 2. Release a Squatted Registration Number

If a real student reports that someone else registered with their number:

```sql
-- 1. Verify: look up who has the reg number
select p.user_id, p.reg_no, p.full_name, u.email
from public.profiles p
join auth.users u on u.id = p.user_id
where p.reg_no = 'THE_REG_NO';

-- 2. Confirm this is NOT the real owner before proceeding.
-- Contact the real student separately to verify their identity.

-- 3. Check if any certificates are linked
select id, event_id, name, status from public.certificates where reg_no = 'THE_REG_NO';

-- 4. If confirmed: delete the profile and auth user
-- (cascade will remove the profile)
delete from auth.users where id = 'THE-USER-ID';

-- The real student can now register with this reg number.
```

## 3. Look Up a Student

```sql
-- By registration number
select p.*, u.email from public.profiles p
join auth.users u on u.id = p.user_id
where p.reg_no = 'THE_REG_NO';

-- By email
select p.*, u.email from public.profiles p
join auth.users u on u.id = p.user_id
where u.email = 'student@example.com';
```

## 4. Revoke and Reissue a Certificate

Use the admin UI: Admin → Events → [Event] → Certificates tab → Find cert → Revoke.

To reissue: edit the name if needed (keeps the same certificate ID, bumps render_version), then unrevoke.

Manual SQL if UI is unavailable:
```sql
-- Revoke
update public.certificates
set status = 'revoked', revoked_at = now(), revoked_reason = 'REASON'
where id = 'CERT_ID';

-- Unrevoke
update public.certificates
set status = 'valid', revoked_at = null, revoked_reason = null
where id = 'CERT_ID';
```

## 5. Rotate Keys

### Supabase Keys
1. Go to Supabase Dashboard → Settings → API
2. Regenerate the anon key and service role key
3. Update environment variables in Vercel (and `.env.local` for dev)
4. Redeploy

### Resend API Key
1. Go to Resend Dashboard → API Keys
2. Create a new key, update Supabase SMTP settings
3. Delete the old key

## 6. Monthly Certificate Export

```sql
-- Export certificates with event info
copy (
  select c.id, c.reg_no, c.name, c.status, c.issued_at,
         e.name as event_name, e.slug as event_slug, e.event_date
  from public.certificates c
  join public.events e on e.id = c.event_id
  order by c.issued_at desc
) to stdout with csv header;
```

Save the output in the organization's shared storage.

## 7. Restore from Backup

Supabase provides daily backups on the Pro plan. To restore:
1. Go to Supabase Dashboard → Database → Backups
2. Select the backup to restore
3. Follow Supabase's restoration process

## 8. Account Ownership

| Service | Owner | Second Admin |
|---------|-------|-------------|
| GitHub repo | Ashish Gupta | (TBD) |
| Vercel | (TBD) | (TBD) |
| Supabase | (TBD) | (TBD) |
| Resend | (TBD) | (TBD) |
| Domain DNS (awslpu.in) | (TBD) | (TBD) |
| Sentry | (TBD) | (TBD) |

**Important:** Fill these in before launch. At least two people must be able to administer each account for ownership continuity.
