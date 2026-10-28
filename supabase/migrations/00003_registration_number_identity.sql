-- Migration 00003: Revert to Registration Number (reg_no) as the primary attendee identifier
-- Resolves duplicate emails in attendee lists: certificates are keyed uniquely by (event_id, reg_no).

---------------------------------------------------------------------
-- 1. Drop existing RLS policy referencing email
---------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can read own certificates" ON public.certificates;

---------------------------------------------------------------------
-- 2. Update profiles table to include reg_no
---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'reg_no'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN reg_no text;
  END IF;
END $$;

-- Populate existing profile(s) with unique reg_no
UPDATE public.profiles
SET reg_no = '12409260'
WHERE reg_no IS NULL AND (email = 'ashishguptaop195@gmail.com' OR full_name ILIKE '%Ashish%');

-- Fallback for any other profiles without reg_no using row_number
WITH numbered_profiles AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.profiles
  WHERE reg_no IS NULL
)
UPDATE public.profiles p
SET reg_no = '1240' || LPAD((9300 + np.rn)::text, 4, '0')
FROM numbered_profiles np
WHERE p.user_id = np.user_id;

-- Make reg_no NOT NULL and enforce constraints
ALTER TABLE public.profiles ALTER COLUMN reg_no SET NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_reg_no_unique;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reg_no_unique UNIQUE (reg_no);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_reg_no_canonical;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reg_no_canonical 
  CHECK (reg_no = upper(btrim(reg_no)) AND length(reg_no) BETWEEN 4 AND 20);

---------------------------------------------------------------------
-- 3. Update certificates table to include reg_no
---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'certificates' AND column_name = 'reg_no'
  ) THEN
    ALTER TABLE public.certificates ADD COLUMN reg_no text;
  END IF;
END $$;

-- Specifically assign unique registration numbers to existing certificates
UPDATE public.certificates SET reg_no = '12409260' WHERE id = 'CNGDWV935R5U';
UPDATE public.certificates SET reg_no = '12409261' WHERE id = 'ZHTCCUDHYZQC';
UPDATE public.certificates SET reg_no = '12409262' WHERE id = 'K4NSAPMTEEH8';
UPDATE public.certificates SET reg_no = '12409263' WHERE id = 'UUJ39PRQ9DZX';

-- Fallback for any other certificates without reg_no using row_number to guarantee uniqueness
WITH numbered_certs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY issued_at, id) AS rn
  FROM public.certificates
  WHERE reg_no IS NULL
)
UPDATE public.certificates c
SET reg_no = '1240' || LPAD((9400 + nc.rn)::text, 4, '0')
FROM numbered_certs nc
WHERE c.id = nc.id;

-- Make reg_no NOT NULL and email nullable
ALTER TABLE public.certificates ALTER COLUMN reg_no SET NOT NULL;
ALTER TABLE public.certificates ALTER COLUMN email DROP NOT NULL;

-- Drop email-based unique constraint and index
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_event_email_unique;
DROP INDEX IF EXISTS certificates_email_idx;

-- Add reg_no-based unique constraint and index
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_event_reg_unique;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_event_reg_unique UNIQUE (event_id, reg_no);

CREATE INDEX IF NOT EXISTS certificates_reg_no_idx ON public.certificates (reg_no);

---------------------------------------------------------------------
-- 4. Recreate RLS policy for students reading certificates via reg_no
---------------------------------------------------------------------
CREATE POLICY "Students can read own certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (
    reg_no = (SELECT reg_no FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );
