-- ============================================================
-- COURSE SITE - Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Table 1: Access Codes (one unique code per student)
CREATE TABLE public.access_codes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT        UNIQUE NOT NULL,
  label       TEXT        DEFAULT '',           -- e.g. student name
  device_id   TEXT        UNIQUE,               -- null = unclaimed, set = locked to device
  device_info TEXT        DEFAULT '',           -- browser/OS info for display
  registered_at TIMESTAMPTZ,
  last_seen   TIMESTAMPTZ,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Lessons
CREATE TABLE public.lessons (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT    NOT NULL,
  bunny_url    TEXT    NOT NULL,
  code_content TEXT    DEFAULT '[]',  -- JSON array of {label, content}
  lesson_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security: All access via Service Role key only
-- (API routes use the service role key server-side)
-- ============================================================
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons      ENABLE ROW LEVEL SECURITY;

-- Block all direct client access (API routes bypass RLS with service role)
CREATE POLICY "block_all_access_codes" ON public.access_codes FOR ALL USING (false);
CREATE POLICY "block_all_lessons"      ON public.lessons      FOR ALL USING (false);

-- ============================================================
-- Sample data (optional - remove before production)
-- ============================================================
INSERT INTO public.access_codes (code, label) VALUES
  ('STUDENT001', 'طالب 1'),
  ('STUDENT002', 'طالب 2');

INSERT INTO public.lessons (title, bunny_url, code_content, lesson_order) VALUES
  (
    'الدرس 1 - المقدمة',
    'https://iframe.mediadelivery.net/embed/YOUR_LIBRARY_ID/YOUR_VIDEO_ID_1',
    '[{"label":"server.js","content":"const express = require(''express'');\nconst app = express();\n\napp.listen(3000);"}]',
    1
  ),
  (
    'الدرس 2 - الإعداد',
    'https://iframe.mediadelivery.net/embed/YOUR_LIBRARY_ID/YOUR_VIDEO_ID_2',
    '[{"label":"package.json","content":"{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"}]',
    2
  );
