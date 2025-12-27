-- =====================================================
-- FIX: Performance Advisor Warnings and Info Issues
-- =====================================================

-- ==============================================
-- 1. FIX MULTIPLE PERMISSIVE POLICIES
-- ==============================================

-- Fix configuracoes: Remove duplicate UPDATE policy (keep only one)
DROP POLICY IF EXISTS "Permitir atualização pelo dono" ON public.configuracoes;
-- Keep "Users can update their own config" as the UPDATE policy

-- ==============================================
-- 2. FIX DUPLICATE INDEXES
-- ==============================================

-- Find and drop duplicate indexes on configuracoes
-- First, let's see what indexes exist and drop duplicates
DROP INDEX IF EXISTS public.configuracoes_user_id_idx;
DROP INDEX IF EXISTS public.idx_configuracoes_user_id;
DROP INDEX IF EXISTS public.configuracoes_slug_idx;
DROP INDEX IF EXISTS public.idx_configuracoes_slug;

-- Create single optimized indexes for configuracoes
CREATE INDEX IF NOT EXISTS idx_configuracoes_user_id ON public.configuracoes(user_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_slug ON public.configuracoes(slug) WHERE slug IS NOT NULL;

-- Fix duplicate indexes on registration_tokens
DROP INDEX IF EXISTS public.registration_tokens_token_idx;
DROP INDEX IF EXISTS public.idx_registration_tokens_token;
DROP INDEX IF EXISTS public.registration_tokens_user_id_idx;
DROP INDEX IF EXISTS public.idx_registration_tokens_user_id;

-- Create single optimized indexes for registration_tokens
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON public.registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_user_id ON public.registration_tokens(user_id);

-- ==============================================
-- 3. ADD INDEXES FOR UNINDEXED FOREIGN KEYS
-- ==============================================

-- events - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);

-- filled_records - foreign keys (client_id, session_id, template_id)
CREATE INDEX IF NOT EXISTS idx_filled_records_client_id ON public.filled_records(client_id);
CREATE INDEX IF NOT EXISTS idx_filled_records_session_id ON public.filled_records(session_id);
CREATE INDEX IF NOT EXISTS idx_filled_records_template_id ON public.filled_records(template_id);
CREATE INDEX IF NOT EXISTS idx_filled_records_user_id ON public.filled_records(user_id);

-- payments - foreign keys (client_id, session_id, package_id)
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON public.payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON public.payments(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- record_templates - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_record_templates_user_id ON public.record_templates(user_id);

-- recurring_sessions - foreign keys (client_id, parent_session_id)
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_client_id ON public.recurring_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_parent_session_id ON public.recurring_sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_user_id ON public.recurring_sessions(user_id);

-- session_notes - foreign keys (client_id, session_id)
CREATE INDEX IF NOT EXISTS idx_session_notes_client_id ON public.session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON public.session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON public.session_notes(user_id);

-- ==============================================
-- 4. ADD OTHER COMMONLY USED INDEXES FOR PERFORMANCE
-- ==============================================

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_ativo ON public.clients(ativo) WHERE ativo = true;

-- sessions - commonly queried columns
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_data ON public.sessions(data);
CREATE INDEX IF NOT EXISTS idx_sessions_package_id ON public.sessions(package_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_session_id ON public.sessions(recurring_session_id);

-- packages
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON public.packages(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_client_id ON public.packages(client_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- anamneses
CREATE INDEX IF NOT EXISTS idx_anamneses_user_id ON public.anamneses(user_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_client_id ON public.anamneses(client_id);

-- evolucoes
CREATE INDEX IF NOT EXISTS idx_evolucoes_user_id ON public.evolucoes(user_id);
CREATE INDEX IF NOT EXISTS idx_evolucoes_client_id ON public.evolucoes(client_id);
CREATE INDEX IF NOT EXISTS idx_evolucoes_session_id ON public.evolucoes(session_id);

-- metas
CREATE INDEX IF NOT EXISTS idx_metas_user_id ON public.metas(user_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON public.notifications(lida) WHERE lida = false;

-- notification_settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- user_2fa_settings
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id ON public.user_2fa_settings(user_id);

-- user_2fa_backup_codes
CREATE INDEX IF NOT EXISTS idx_user_2fa_backup_codes_user_id ON public.user_2fa_backup_codes(user_id);

-- user_2fa_email_codes
CREATE INDEX IF NOT EXISTS idx_user_2fa_email_codes_user_id ON public.user_2fa_email_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_email_codes_expires_at ON public.user_2fa_email_codes(expires_at);

-- user_2fa_reset_requests
CREATE INDEX IF NOT EXISTS idx_user_2fa_reset_requests_user_id ON public.user_2fa_reset_requests(user_id);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- medical_audit_log
CREATE INDEX IF NOT EXISTS idx_medical_audit_log_user_id ON public.medical_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_audit_log_client_id ON public.medical_audit_log(client_id);

-- admin_sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token ON public.admin_sessions(session_token);

-- admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);