-- =====================================================
-- FIX: Auth RLS Initialization Plan Performance Issues
-- Wrapping auth.uid() and auth.jwt() with (select ...) 
-- forces single evaluation per query
-- =====================================================

-- Drop and recreate policies for clients table
DROP POLICY IF EXISTS "Enhanced client delete policy" ON public.clients;
DROP POLICY IF EXISTS "Enhanced client insert policy" ON public.clients;
DROP POLICY IF EXISTS "Enhanced client update policy" ON public.clients;
DROP POLICY IF EXISTS "Enhanced client view policy" ON public.clients;

CREATE POLICY "Enhanced client delete policy" ON public.clients
FOR DELETE USING (((select auth.uid()) = user_id) AND ((select auth.jwt()) IS NOT NULL));

CREATE POLICY "Enhanced client insert policy" ON public.clients
FOR INSERT WITH CHECK (
  ((select auth.uid()) = user_id) 
  AND ((select auth.jwt()) IS NOT NULL) 
  AND ((dados_clinicos IS NULL) OR (length(dados_clinicos) <= 10000)) 
  AND ((historico IS NULL) OR (length(historico) <= 10000))
);

CREATE POLICY "Enhanced client update policy" ON public.clients
FOR UPDATE USING (((select auth.uid()) = user_id) AND ((select auth.jwt()) IS NOT NULL))
WITH CHECK (((select auth.uid()) = user_id) AND ((select auth.jwt()) IS NOT NULL));

CREATE POLICY "Enhanced client view policy" ON public.clients
FOR SELECT USING (((select auth.uid()) = user_id) AND ((select auth.jwt()) IS NOT NULL));

-- Drop and recreate policies for configuracoes table
DROP POLICY IF EXISTS "Permitir atualização pelo dono" ON public.configuracoes;
DROP POLICY IF EXISTS "Users can insert their own config" ON public.configuracoes;
DROP POLICY IF EXISTS "Users can read their own config" ON public.configuracoes;
DROP POLICY IF EXISTS "Users can update their own config" ON public.configuracoes;

CREATE POLICY "Permitir atualização pelo dono" ON public.configuracoes
FOR UPDATE USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own config" ON public.configuracoes
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own config" ON public.configuracoes
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own config" ON public.configuracoes
FOR UPDATE USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for user_roles table
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Service role can manage roles" ON public.user_roles
FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for anamneses table
DROP POLICY IF EXISTS "Users can create their own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can delete their own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can update their own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Users can view their own anamneses" ON public.anamneses;

CREATE POLICY "Users can create their own anamneses" ON public.anamneses
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own anamneses" ON public.anamneses
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own anamneses" ON public.anamneses
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own anamneses" ON public.anamneses
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for events table
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can view public events or their own events" ON public.events;

CREATE POLICY "Users can create their own events" ON public.events
FOR INSERT WITH CHECK ((user_id IS NULL) OR ((select auth.uid()) = user_id));

CREATE POLICY "Users can delete their own events" ON public.events
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own events" ON public.events
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view public events or their own events" ON public.events
FOR SELECT USING ((is_public = true) OR ((select auth.uid()) = user_id));

-- Drop and recreate policies for evolucoes table
DROP POLICY IF EXISTS "Users can create their own evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Users can delete their own evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Users can update their own evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Users can view their own evolucoes" ON public.evolucoes;

CREATE POLICY "Users can create their own evolucoes" ON public.evolucoes
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own evolucoes" ON public.evolucoes
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own evolucoes" ON public.evolucoes
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own evolucoes" ON public.evolucoes
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for filled_records table
DROP POLICY IF EXISTS "Users can create their own filled records" ON public.filled_records;
DROP POLICY IF EXISTS "Users can delete their own filled records" ON public.filled_records;
DROP POLICY IF EXISTS "Users can update their own filled records" ON public.filled_records;
DROP POLICY IF EXISTS "Users can view their own filled records" ON public.filled_records;

CREATE POLICY "Users can create their own filled records" ON public.filled_records
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own filled records" ON public.filled_records
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own filled records" ON public.filled_records
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own filled records" ON public.filled_records
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for notifications table
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can create their own notifications" ON public.notifications
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for sessions table
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;

CREATE POLICY "Users can delete their own sessions" ON public.sessions
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.sessions
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own sessions" ON public.sessions
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own sessions" ON public.sessions
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for packages table
DROP POLICY IF EXISTS "Users can manage their own packages" ON public.packages;

CREATE POLICY "Users can manage their own packages" ON public.packages
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate policies for payments table
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;

CREATE POLICY "Users can manage their own payments" ON public.payments
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate policies for profiles table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own profile" ON public.profiles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for metas table
DROP POLICY IF EXISTS "Users can create their own metas" ON public.metas;
DROP POLICY IF EXISTS "Users can delete their own metas" ON public.metas;
DROP POLICY IF EXISTS "Users can update their own metas" ON public.metas;
DROP POLICY IF EXISTS "Users can view their own metas" ON public.metas;

CREATE POLICY "Users can create their own metas" ON public.metas
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own metas" ON public.metas
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own metas" ON public.metas
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own metas" ON public.metas
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for recurring_sessions table
DROP POLICY IF EXISTS "Users can manage their own recurring sessions" ON public.recurring_sessions;

CREATE POLICY "Users can manage their own recurring sessions" ON public.recurring_sessions
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate policies for session_notes table
DROP POLICY IF EXISTS "Users can create their own session notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can delete their own session notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can update their own session notes" ON public.session_notes;
DROP POLICY IF EXISTS "Users can view their own session notes" ON public.session_notes;

CREATE POLICY "Users can create their own session notes" ON public.session_notes
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own session notes" ON public.session_notes
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own session notes" ON public.session_notes
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own session notes" ON public.session_notes
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for notification_settings table
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.notification_settings;

CREATE POLICY "Users can delete their own notification settings" ON public.notification_settings
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.notification_settings
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.notification_settings
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own notification settings" ON public.notification_settings
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for push_subscriptions table
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate policies for registration_tokens table
DROP POLICY IF EXISTS "Users can create their own registration tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Users can update their own registration tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Users can view their own registration tokens" ON public.registration_tokens;

CREATE POLICY "Users can create their own registration tokens" ON public.registration_tokens
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own registration tokens" ON public.registration_tokens
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own registration tokens" ON public.registration_tokens
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for record_templates table
DROP POLICY IF EXISTS "Users can create their own templates" ON public.record_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.record_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.record_templates;
DROP POLICY IF EXISTS "Users can view public templates or their own templates" ON public.record_templates;

CREATE POLICY "Users can create their own templates" ON public.record_templates
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own templates" ON public.record_templates
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own templates" ON public.record_templates
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view public templates or their own templates" ON public.record_templates
FOR SELECT USING ((is_public = true) OR ((select auth.uid()) = user_id));

-- Drop and recreate policies for audit_log table
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;

CREATE POLICY "Users can view their own audit logs" ON public.audit_log
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for medical_audit_log table
DROP POLICY IF EXISTS "Users can view their own medical audit logs" ON public.medical_audit_log;

CREATE POLICY "Users can view their own medical audit logs" ON public.medical_audit_log
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for admin_notifications table
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;

CREATE POLICY "Admins can update notifications" ON public.admin_notifications
FOR UPDATE USING (current_user_has_role('admin'::app_role))
WITH CHECK (current_user_has_role('admin'::app_role));

CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
FOR SELECT USING (current_user_has_role('admin'::app_role));

-- Drop and recreate policies for admin_sessions table
DROP POLICY IF EXISTS "Admins can view own sessions" ON public.admin_sessions;

CREATE POLICY "Admins can view own sessions" ON public.admin_sessions
FOR SELECT USING ((user_id = (select auth.uid())) AND current_user_has_role('admin'::app_role));

-- Drop and recreate policies for user_2fa_backup_codes table
DROP POLICY IF EXISTS "Users can delete their own backup codes" ON public.user_2fa_backup_codes;
DROP POLICY IF EXISTS "Users can insert their own backup codes" ON public.user_2fa_backup_codes;
DROP POLICY IF EXISTS "Users can view their own backup codes" ON public.user_2fa_backup_codes;

CREATE POLICY "Users can delete their own backup codes" ON public.user_2fa_backup_codes
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own backup codes" ON public.user_2fa_backup_codes
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own backup codes" ON public.user_2fa_backup_codes
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for user_2fa_email_codes table
DROP POLICY IF EXISTS "Service role can manage email codes" ON public.user_2fa_email_codes;

CREATE POLICY "Service role can manage email codes" ON public.user_2fa_email_codes
FOR ALL USING (((select auth.jwt()) ->> 'role'::text) = 'service_role'::text);

-- Drop and recreate policies for user_2fa_reset_requests table
DROP POLICY IF EXISTS "Users can insert their own reset requests" ON public.user_2fa_reset_requests;
DROP POLICY IF EXISTS "Users can view their own reset requests" ON public.user_2fa_reset_requests;

CREATE POLICY "Users can insert their own reset requests" ON public.user_2fa_reset_requests
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own reset requests" ON public.user_2fa_reset_requests
FOR SELECT USING ((select auth.uid()) = user_id);

-- Drop and recreate policies for user_2fa_settings table
DROP POLICY IF EXISTS "Users can insert their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can update their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can view their own 2FA settings" ON public.user_2fa_settings;

CREATE POLICY "Users can insert their own 2FA settings" ON public.user_2fa_settings
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own 2FA settings" ON public.user_2fa_settings
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own 2FA settings" ON public.user_2fa_settings
FOR SELECT USING ((select auth.uid()) = user_id);