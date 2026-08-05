-- ═══════════════════════════════════════════════════════
-- ADD Academy — Database Schema
-- Designed to share Supabase project with main website
-- All academy tables use 'academy_' prefix
-- ═══════════════════════════════════════════════════════

-- Schools (for free high school program) — must be created before students (FK dependency)
CREATE TABLE IF NOT EXISTS academy_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  max_students INTEGER DEFAULT 200,
  ai_tutor_daily_limit INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS academy_students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ro', 'el')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team', 'enterprise', 'school')),
  school_id UUID REFERENCES academy_schools(id),
  stripe_customer_id TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lecture progress tracking
CREATE TABLE IF NOT EXISTS academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  lecture_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  scrolled_to_bottom BOOLEAN DEFAULT FALSE,
  time_spent_seconds INTEGER DEFAULT 0,
  quiz_score NUMERIC(5,2),
  quiz_attempted BOOLEAN DEFAULT FALSE,
  code_blocks_run TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lecture_id)
);

-- Quiz submissions (detailed)
CREATE TABLE IF NOT EXISTS academy_quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  lecture_id TEXT NOT NULL,
  answers JSONB NOT NULL, -- { questionIndex: selectedOptions[] }
  score NUMERIC(5,2) NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI tutor conversations
CREATE TABLE IF NOT EXISTS academy_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  lecture_id TEXT,
  mode TEXT DEFAULT 'explain' CHECK (mode IN ('explain', 'debug', 'build')),
  messages JSONB NOT NULL DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates
CREATE TABLE IF NOT EXISTS academy_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL,
  completion_date TIMESTAMPTZ DEFAULT NOW(),
  quiz_average NUMERIC(5,2),
  lectures_completed INTEGER NOT NULL,
  verification_hash TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS academy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'team', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════

ALTER TABLE academy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_schools ENABLE ROW LEVEL SECURITY;

-- Students can read/update their own profile
CREATE POLICY "Students can view own profile"
  ON academy_students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update own profile"
  ON academy_students FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create student profile on signup
CREATE OR REPLACE FUNCTION public.handle_academy_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.academy_students (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_academy
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_academy_signup();

-- Progress: own data only
CREATE POLICY "Students can manage own progress"
  ON academy_progress FOR ALL
  USING (auth.uid() = student_id);

-- Quiz submissions: own data only
CREATE POLICY "Students can manage own quiz submissions"
  ON academy_quiz_submissions FOR ALL
  USING (auth.uid() = student_id);

-- AI conversations: own data only
CREATE POLICY "Students can manage own conversations"
  ON academy_ai_conversations FOR ALL
  USING (auth.uid() = student_id);

-- Certificates: own data + public verification
CREATE POLICY "Students can view own certificates"
  ON academy_certificates FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Public certificate verification"
  ON academy_certificates FOR SELECT
  USING (true); -- Anyone can verify a certificate by hash

-- Subscriptions: own data only
CREATE POLICY "Students can view own subscriptions"
  ON academy_subscriptions FOR SELECT
  USING (auth.uid() = student_id);

-- Schools: public read for verified schools
CREATE POLICY "Public can view verified schools"
  ON academy_schools FOR SELECT
  USING (verified = true);

-- ═══════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_academy_progress_student ON academy_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_lecture ON academy_progress(lecture_id);
CREATE INDEX IF NOT EXISTS idx_academy_quiz_student ON academy_quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_academy_ai_student ON academy_ai_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_academy_cert_hash ON academy_certificates(verification_hash);
CREATE INDEX IF NOT EXISTS idx_academy_sub_stripe ON academy_subscriptions(stripe_subscription_id);
