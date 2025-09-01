-- Security Enhancement: Add missing INSERT policy for notifications table
-- Currently users cannot insert their own notifications, which may cause issues

CREATE POLICY "Users can create their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Security Enhancement: Add audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Security function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for authenticated users
    IF auth.uid() IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, old_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD)
            );
            RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, old_values, new_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(OLD), row_to_json(NEW)
            );
            RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO public.audit_log (
                user_id, action, table_name, record_id, new_values
            ) VALUES (
                auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW)
            );
            RETURN NEW;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;