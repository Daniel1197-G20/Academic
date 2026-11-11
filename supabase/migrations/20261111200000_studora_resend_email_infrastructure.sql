-- ==============================================================================
-- STUDORA — RESEND EMAIL & CAMPAIGN COMMUNICATIONS INFRASTRUCTURE
-- Migration: 20261111200000_studora_resend_email_infrastructure.sql
-- "Study smarter. Go further."
-- ==============================================================================

-- 1. USER EMAIL PREFERENCES & UNSUBSCRIBE LEDGER
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  promotional_opt_in BOOLEAN NOT NULL DEFAULT true,
  academic_digest_opt_in BOOLEAN NOT NULL DEFAULT true,
  booking_notifications_opt_in BOOLEAN NOT NULL DEFAULT true,
  security_alerts_opt_in BOOLEAN NOT NULL DEFAULT true, -- Always true for operational security
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_unsub_token ON public.user_email_preferences(unsubscribe_token);

-- 2. EMAIL SUPPRESSION LIST (Hard bounces, spam complaints, manual blocks)
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('bounce', 'complaint', 'manual', 'unsubscribed')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON public.email_suppressions(email);

-- 3. EMAIL CAMPAIGNS (Admin bulk marketing & operational communications)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('promotional', 'operational_urgent', 'general_announcement')),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all_users', 'students_only', 'tutors_only', 'admins_only', 'selected_users')),
  template_id TEXT NOT NULL DEFAULT 'standard_announcement',
  content_html TEXT NOT NULL,
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed', 'cancelled')),
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  bounced_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  complaint_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  clicked_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON public.email_campaigns(campaign_type);

-- 4. EMAIL OUTBOX & LOGS (Full audit trail for transactional and campaign emails)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_type TEXT NOT NULL, -- 'welcome_student', 'welcome_tutor', 'welcome_admin', 'booking_confirmed', 'tutor_application_approved', etc.
  subject TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complaint', 'failed')),
  error_message TEXT,
  events_timeline JSONB DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON public.email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_type);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Preferences: Users manage own preferences, Admins can inspect
CREATE POLICY "Users can view own email preferences"
  ON public.user_email_preferences FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own email preferences"
  ON public.user_email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user email preferences"
  ON public.user_email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Suppressions: Admins only
CREATE POLICY "Admins have full access to email suppressions"
  ON public.email_suppressions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Campaigns: Admins only
CREATE POLICY "Admins have full access to email campaigns"
  ON public.email_campaigns FOR ALL
  USING (public.is_admin(auth.uid()));

-- Logs: Admins full access, Users can view their own non-sensitive delivery logs
CREATE POLICY "Admins have full access to email logs"
  ON public.email_logs FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own email log summary"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = recipient_user_id);

-- Auto-provision preferences trigger for newly created users
CREATE OR REPLACE FUNCTION public.handle_new_user_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user_email_preferences ON auth.users;
CREATE TRIGGER trg_new_user_email_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_email_preferences();
