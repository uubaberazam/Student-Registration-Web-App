-- =====================================================================
-- ONLINE TUITION STUDENT REGISTRATION SYSTEM
-- Supabase Database Schema & Storage Configuration
-- File: supabase/schema.sql
-- =====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TABLE: student_registrations
-- Stores all student admission submissions securely.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    class_name TEXT NOT NULL,
    photo_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Data integrity constraints
    CONSTRAINT check_full_name_length CHECK (char_length(trim(full_name)) >= 2),
    CONSTRAINT check_father_name_length CHECK (char_length(trim(father_name)) >= 2),
    CONSTRAINT check_phone_number_format CHECK (phone_number ~ '^03[0-9]{9}$'),
    CONSTRAINT check_class_name_not_empty CHECK (char_length(trim(class_name)) >= 1),
    CONSTRAINT check_photo_path_not_empty CHECK (char_length(trim(photo_path)) >= 3)
);

-- Comments for documentation
COMMENT ON TABLE public.student_registrations IS 'Stores student registrations for the Online Tuition Academy';
COMMENT ON COLUMN public.student_registrations.reference_id IS 'Human-readable unique registration tracking number (e.g., REG-2026-XXXX)';
COMMENT ON COLUMN public.student_registrations.photo_path IS 'Storage object path in the student-photos bucket';

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- For performant searches by admin and chronological ordering.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_student_registrations_created_at 
    ON public.student_registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_registrations_phone 
    ON public.student_registrations (phone_number);

CREATE INDEX IF NOT EXISTS idx_student_registrations_class 
    ON public.student_registrations (class_name);

CREATE INDEX IF NOT EXISTS idx_student_registrations_ref_id 
    ON public.student_registrations (reference_id);

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR student_registrations
-- CRITICAL SECURITY REQUIREMENT:
-- Anonymous visitors and students MUST NOT be able to view or query any
-- records from this table. Only authenticated academy administrators can read.
-- ---------------------------------------------------------------------

ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;

-- Remove any old policies to guarantee a clean slate
DROP POLICY IF EXISTS "Deny public select on student_registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Allow authenticated admins to select registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Allow authenticated admins to update registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Allow authenticated admins to delete registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Allow insert for public submissions" ON public.student_registrations;

-- Policy 1: Authenticated administrators have full read access
CREATE POLICY "Allow authenticated admins to select registrations"
    ON public.student_registrations
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Authenticated administrators can manage registrations
CREATE POLICY "Allow authenticated admins to update registrations"
    ON public.student_registrations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated admins to delete registrations"
    ON public.student_registrations
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy 3: Allow anonymous INSERT ONLY (no SELECT, UPDATE, or DELETE permitted)
-- Note: When the Edge Function is used with service_role, this is bypassed server-side.
-- Having this policy also allows direct submission mode with strict zero-read security.
CREATE POLICY "Allow insert for public submissions"
    ON public.student_registrations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        char_length(trim(full_name)) >= 2 AND
        char_length(trim(father_name)) >= 2 AND
        phone_number ~ '^03[0-9]{9}$' AND
        char_length(trim(class_name)) >= 1 AND
        char_length(trim(photo_path)) >= 3
    );

-- ---------------------------------------------------------------------
-- 4. SUPABASE STORAGE BUCKET: student-photos
-- Enforces 500 KB (512,000 bytes) file size limit and image-only MIME types.
-- Bucket is set to PRIVATE (public = false) so photos are never publicly exposed.
-- ---------------------------------------------------------------------

-- Insert bucket configuration into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'student-photos',
    'student-photos',
    false, -- MUST BE FALSE: Private bucket
    512000, -- Maximum 500 KB (512,000 bytes)
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 512000,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage Policy: Allow authenticated users (Admins) to view and download student photos
DROP POLICY IF EXISTS "Admins can view student photos" ON storage.objects;
CREATE POLICY "Admins can view student photos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'student-photos');

-- Storage Policy: Allow authenticated users to manage photos (e.g. delete on student removal)
DROP POLICY IF EXISTS "Admins can manage student photos" ON storage.objects;
CREATE POLICY "Admins can manage student photos"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'student-photos');

-- Storage Policy: Allow upload into student-photos bucket
-- Edge function uses service_role key; this policy enables direct uploads if configured.
DROP POLICY IF EXISTS "Allow photo upload to student-photos" ON storage.objects;
CREATE POLICY "Allow photo upload to student-photos"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        bucket_id = 'student-photos' AND
        octet_length(storage.objects.name) > 0
    );

-- ---------------------------------------------------------------------
-- 5. HELPER FUNCTION: generate_registration_reference
-- Generates a human-friendly unique reference code like REG-2026-X8K9M2
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_registration_reference()
RETURNS TRIGGER AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
    chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    i INTEGER;
    random_str TEXT;
BEGIN
    IF NEW.reference_id IS NULL OR trim(NEW.reference_id) = '' THEN
        LOOP
            random_str := '';
            FOR i IN 1..6 LOOP
                random_str := random_str || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
            END LOOP;
            new_ref := 'REG-' || to_char(now(), 'YYYY') || '-' || random_str;
            
            SELECT EXISTS(SELECT 1 FROM public.student_registrations WHERE reference_id = new_ref) INTO ref_exists;
            IF NOT ref_exists THEN
                NEW.reference_id := new_ref;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_registration_reference ON public.student_registrations;
CREATE TRIGGER trigger_set_registration_reference
    BEFORE INSERT ON public.student_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_registration_reference();
