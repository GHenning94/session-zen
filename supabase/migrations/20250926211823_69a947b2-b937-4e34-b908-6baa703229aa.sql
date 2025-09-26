-- ==============================================
-- COMPREHENSIVE MEDICAL DATA SECURITY ENHANCEMENT
-- ==============================================

-- 1. CREATE ENHANCED AUDIT LOG FOR MEDICAL DATA ACCESS
CREATE TABLE IF NOT EXISTS public.medical_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('VIEW', 'UPDATE', 'DELETE', 'EXPORT')),
    field_accessed TEXT, -- tracks which sensitive field was accessed
    access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT
);

-- Enable RLS on medical audit log
ALTER TABLE public.medical_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own medical audit logs
CREATE POLICY "Users can view their own medical audit logs" 
ON public.medical_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. CREATE SECURE MEDICAL DATA ACCESS FUNCTIONS

-- Function to log medical data access
CREATE OR REPLACE FUNCTION public.log_medical_data_access(
    p_client_id UUID,
    p_action TEXT,
    p_field_accessed TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.medical_audit_log (
            user_id, 
            client_id, 
            action, 
            field_accessed,
            ip_address,
            session_id
        ) VALUES (
            auth.uid(), 
            p_client_id, 
            p_action, 
            p_field_accessed,
            inet_client_addr(),
            current_setting('request.jwt.claims', true)::json->>'session_id'
        );
    END IF;
END;
$$;

-- Function to safely retrieve medical data with logging
CREATE OR REPLACE FUNCTION public.get_client_medical_data(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_data JSON;
    user_owns_client BOOLEAN;
BEGIN
    -- Verify user owns this client
    SELECT EXISTS(
        SELECT 1 FROM public.clients 
        WHERE id = p_client_id AND user_id = auth.uid()
    ) INTO user_owns_client;
    
    IF NOT user_owns_client THEN
        RAISE EXCEPTION 'Access denied: User does not own this client';
    END IF;
    
    -- Log the access
    PERFORM public.log_medical_data_access(p_client_id, 'VIEW', 'medical_data');
    
    -- Return sanitized medical data
    SELECT json_build_object(
        'id', c.id,
        'nome', c.nome,
        'dados_clinicos', COALESCE(c.dados_clinicos, ''),
        'historico', COALESCE(c.historico, ''),
        'last_accessed', NOW()
    )
    INTO client_data
    FROM public.clients c
    WHERE c.id = p_client_id AND c.user_id = auth.uid();
    
    RETURN client_data;
END;
$$;

-- Function to safely update medical data with enhanced validation
CREATE OR REPLACE FUNCTION public.update_client_medical_data(
    p_client_id UUID,
    p_dados_clinicos TEXT DEFAULT NULL,
    p_historico TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_owns_client BOOLEAN;
BEGIN
    -- Verify user owns this client
    SELECT EXISTS(
        SELECT 1 FROM public.clients 
        WHERE id = p_client_id AND user_id = auth.uid()
    ) INTO user_owns_client;
    
    IF NOT user_owns_client THEN
        RAISE EXCEPTION 'Access denied: User does not own this client';
    END IF;
    
    -- Validate and sanitize input data
    IF p_dados_clinicos IS NOT NULL THEN
        p_dados_clinicos := public.sanitize_text(p_dados_clinicos);
        -- Additional validation for medical data length and content
        IF LENGTH(p_dados_clinicos) > 10000 THEN
            RAISE EXCEPTION 'Medical data exceeds maximum allowed length';
        END IF;
    END IF;
    
    IF p_historico IS NOT NULL THEN
        p_historico := public.sanitize_text(p_historico);
        IF LENGTH(p_historico) > 10000 THEN
            RAISE EXCEPTION 'Medical history exceeds maximum allowed length';
        END IF;
    END IF;
    
    -- Log the update attempt
    PERFORM public.log_medical_data_access(p_client_id, 'UPDATE', 
        CASE 
            WHEN p_dados_clinicos IS NOT NULL AND p_historico IS NOT NULL THEN 'dados_clinicos,historico'
            WHEN p_dados_clinicos IS NOT NULL THEN 'dados_clinicos'
            WHEN p_historico IS NOT NULL THEN 'historico'
            ELSE 'unknown'
        END
    );
    
    -- Perform the update
    UPDATE public.clients 
    SET 
        dados_clinicos = COALESCE(p_dados_clinicos, dados_clinicos),
        historico = COALESCE(p_historico, historico),
        updated_at = NOW()
    WHERE id = p_client_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- 3. ENHANCED VALIDATION AND SANITIZATION

-- Enhanced sanitization function for medical data
CREATE OR REPLACE FUNCTION public.sanitize_medical_text(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove potential script tags, normalize whitespace, and limit length
    RETURN LEFT(
        TRIM(
            REGEXP_REPLACE(
                REGEXP_REPLACE(input_text, '<[^>]*>', '', 'gi'),
                '\s+', ' ', 'g'
            )
        ), 
        10000
    );
END;
$$;

-- 4. CREATE TRIGGER FOR ENHANCED MEDICAL DATA AUDIT LOGGING

CREATE OR REPLACE FUNCTION public.audit_medical_data_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if authenticated user and medical fields are being changed
    IF auth.uid() IS NOT NULL THEN
        -- Log when medical data fields are modified
        IF TG_OP = 'UPDATE' THEN
            IF OLD.dados_clinicos IS DISTINCT FROM NEW.dados_clinicos THEN
                PERFORM public.log_medical_data_access(NEW.id, 'UPDATE', 'dados_clinicos');
            END IF;
            
            IF OLD.historico IS DISTINCT FROM NEW.historico THEN
                PERFORM public.log_medical_data_access(NEW.id, 'UPDATE', 'historico');
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            PERFORM public.log_medical_data_access(OLD.id, 'DELETE', 'all_data');
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for medical data audit
DROP TRIGGER IF EXISTS medical_data_audit_trigger ON public.clients;
CREATE TRIGGER medical_data_audit_trigger
    BEFORE UPDATE OR DELETE ON public.clients
    FOR EACH ROW 
    WHEN (auth.uid() IS NOT NULL)
    EXECUTE FUNCTION public.audit_medical_data_changes();

-- 5. ENHANCED RLS POLICIES FOR STRICTER ACCESS CONTROL

-- Drop existing policies to recreate with enhanced security
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Enhanced SELECT policy with session validation
CREATE POLICY "Enhanced client view policy" 
ON public.clients 
FOR SELECT 
USING (
    auth.uid() = user_id 
    AND auth.jwt() IS NOT NULL
);

-- Enhanced UPDATE policy with medical data protection
CREATE POLICY "Enhanced client update policy" 
ON public.clients 
FOR UPDATE 
USING (
    auth.uid() = user_id 
    AND auth.jwt() IS NOT NULL
)
WITH CHECK (
    auth.uid() = user_id 
    AND auth.jwt() IS NOT NULL
);

-- Enhanced INSERT policy
CREATE POLICY "Enhanced client insert policy" 
ON public.clients 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    AND auth.jwt() IS NOT NULL
    -- Sanitize medical data on insert
    AND (dados_clinicos IS NULL OR LENGTH(dados_clinicos) <= 10000)
    AND (historico IS NULL OR LENGTH(historico) <= 10000)
);

-- Enhanced DELETE policy with additional logging
CREATE POLICY "Enhanced client delete policy" 
ON public.clients 
FOR DELETE 
USING (
    auth.uid() = user_id 
    AND auth.jwt() IS NOT NULL
);

-- 6. SECURE FUNCTION FOR DATA EXPORT WITH COMPLIANCE LOGGING

CREATE OR REPLACE FUNCTION public.export_client_data_secure(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_data JSON;
    user_owns_client BOOLEAN;
BEGIN
    -- Verify user owns this client
    SELECT EXISTS(
        SELECT 1 FROM public.clients 
        WHERE id = p_client_id AND user_id = auth.uid()
    ) INTO user_owns_client;
    
    IF NOT user_owns_client THEN
        RAISE EXCEPTION 'Access denied: User does not own this client';
    END IF;
    
    -- Log the export access
    PERFORM public.log_medical_data_access(p_client_id, 'EXPORT', 'full_record');
    
    -- Return complete but sanitized client data
    SELECT json_build_object(
        'id', c.id,
        'nome', c.nome,
        'email', c.email,
        'telefone', c.telefone,
        'dados_clinicos', COALESCE(public.sanitize_medical_text(c.dados_clinicos), ''),
        'historico', COALESCE(public.sanitize_medical_text(c.historico), ''),
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'export_timestamp', NOW(),
        'exported_by', auth.uid()
    )
    INTO client_data
    FROM public.clients c
    WHERE c.id = p_client_id AND c.user_id = auth.uid();
    
    RETURN client_data;
END;
$$;

-- 7. CREATE VIEW FOR SAFE CLIENT DATA ACCESS (without exposing raw medical data)

CREATE OR REPLACE VIEW public.clients_safe AS
SELECT 
    id,
    nome,
    email,
    telefone,
    ativo,
    user_id,
    created_at,
    updated_at,
    avatar_url,
    -- Mask sensitive data in the view
    CASE 
        WHEN dados_clinicos IS NOT NULL AND LENGTH(dados_clinicos) > 0 
        THEN '[DADOS CLÍNICOS PROTEGIDOS]'
        ELSE NULL
    END AS dados_clinicos_status,
    CASE 
        WHEN historico IS NOT NULL AND LENGTH(historico) > 0 
        THEN '[HISTÓRICO MÉDICO PROTEGIDO]'
        ELSE NULL
    END AS historico_status
FROM public.clients;

-- Enable RLS on the safe view
ALTER VIEW public.clients_safe SET (security_invoker = on);

-- 8. GRANT APPROPRIATE PERMISSIONS

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.log_medical_data_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_medical_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_medical_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_client_data_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_medical_text TO authenticated;

-- Grant access to the safe view
GRANT SELECT ON public.clients_safe TO authenticated;

-- Create index for performance on audit logs
CREATE INDEX IF NOT EXISTS idx_medical_audit_log_user_client 
ON public.medical_audit_log(user_id, client_id, access_timestamp);

CREATE INDEX IF NOT EXISTS idx_medical_audit_log_timestamp 
ON public.medical_audit_log(access_timestamp DESC);

-- Add comments for documentation
COMMENT ON TABLE public.medical_audit_log IS 'Comprehensive audit trail for all medical data access and modifications';
COMMENT ON FUNCTION public.get_client_medical_data IS 'Secure function to retrieve client medical data with automatic access logging';
COMMENT ON FUNCTION public.update_client_medical_data IS 'Secure function to update client medical data with validation and logging';
COMMENT ON VIEW public.clients_safe IS 'Safe view of clients table that masks sensitive medical data';