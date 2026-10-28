-- Migration: Switch from registration-number-based identity to email-based identity.
-- Certificates are now linked to users via email address, not reg_no.

---------------------------------------------------------------------
-- 1. Drop old RLS policies that reference reg_no
---------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can read own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

---------------------------------------------------------------------
-- 2. Alter `profiles` table — drop reg_no, keep user_id + full_name + email
---------------------------------------------------------------------
-- Remove old constraints and column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_reg_no_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_reg_no_canonical;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reg_no;

-- Add email column
ALTER TABLE public.profiles ADD COLUMN email text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

---------------------------------------------------------------------
-- 3. Alter `certificates` table — replace reg_no with email
---------------------------------------------------------------------
-- Drop old index and unique constraint
DROP INDEX IF EXISTS certificates_reg_no_idx;
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_event_reg_unique;

-- Rename reg_no to email
ALTER TABLE public.certificates RENAME COLUMN reg_no TO email;

-- Add new unique constraint and index on email
ALTER TABLE public.certificates ADD CONSTRAINT certificates_event_email_unique UNIQUE (event_id, email);
CREATE INDEX certificates_email_idx ON public.certificates (email);

---------------------------------------------------------------------
-- 4. Recreate RLS policies for the new schema
---------------------------------------------------------------------

-- profiles: authenticated users can read only their own row
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- certificates: authenticated users can read their own certificates
-- (matched via email from profiles) when event is published
CREATE POLICY "Students can read own certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );
