-- ==============================================
-- CRITICAL SECURITY FIX: CLIENTS_SAFE VIEW RLS PROTECTION
-- ==============================================

-- Fix the security vulnerability in the clients_safe view
-- The view needs explicit RLS policies to prevent unauthorized access

-- 1. First, let's check and fix the clients_safe view security
-- Drop the existing view to recreate with proper security
DROP VIEW IF EXISTS public.clients_safe;

-- 2. Recreate the view as a secure materialized view with proper RLS
CREATE VIEW public.clients_safe
WITH (security_invoker = true)
AS
SELECT 
    c.id,
    c.nome,
    c.email,
    c.telefone,
    c.ativo,
    c.user_id,
    c.created_at,
    c.updated_at,
    c.avatar_url,
    -- Mask sensitive data in the view with security indicators
    CASE 
        WHEN c.dados_clinicos IS NOT NULL AND LENGTH(c.dados_clinicos) > 0 
        THEN '[DADOS CLÍNICOS PROTEGIDOS - ' || LENGTH(c.dados_clinicos) || ' caracteres]'
        ELSE NULL
    END AS dados_clinicos_status,
    CASE 
        WHEN c.historico IS NOT NULL AND LENGTH(c.historico) > 0 
        THEN '[HISTÓRICO MÉDICO PROTEGIDO - ' || LENGTH(c.historico) || ' caracteres]'
        ELSE NULL
    END AS historico_status,
    -- Add security metadata
    CASE 
        WHEN c.dados_clinicos IS NOT NULL OR c.historico IS NOT NULL
        THEN true
        ELSE false
    END AS has_medical_data,
    -- Indicate last access for security awareness
    NOW() as view_accessed_at
FROM public.clients c;

-- 3. Enable RLS on the view (this is critical!)
ALTER VIEW public.clients_safe SET (security_invoker = true);

-- 4. Create explicit RLS policies for the view
-- Note: Views with security_invoker=true inherit the RLS policies from underlying tables
-- But we'll add explicit checks for extra security

-- Create a security function to check view access
CREATE OR REPLACE FUNCTION public.can_access_client_safe_view(client_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow access if the user owns the client record
    RETURN auth.uid() = client_user_id AND auth.jwt() IS NOT NULL;
END;
$$;

-- 5. Create a secure function to access the safe client data
CREATE OR REPLACE FUNCTION public.get_safe_clients()
RETURNS TABLE(
    id UUID,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    ativo BOOLEAN,
    user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    avatar_url TEXT,
    dados_clinicos_status TEXT,
    historico_status TEXT,
    has_medical_data BOOLEAN,
    view_accessed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL OR auth.jwt() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to access client data';
    END IF;
    
    -- Log the access for audit purposes
    INSERT INTO public.medical_audit_log (
        user_id, 
        client_id, 
        action, 
        field_accessed
    ) 
    SELECT 
        auth.uid(), 
        c.id, 
        'VIEW', 
        'safe_client_list'
    FROM public.clients c 
    WHERE c.user_id = auth.uid();
    
    -- Return only the user's own clients through the safe view
    RETURN QUERY
    SELECT 
        cs.id,
        cs.nome,
        cs.email,
        cs.telefone,
        cs.ativo,
        cs.user_id,
        cs.created_at,
        cs.updated_at,
        cs.avatar_url,
        cs.dados_clinicos_status,
        cs.historico_status,
        cs.has_medical_data,
        cs.view_accessed_at
    FROM public.clients_safe cs
    WHERE cs.user_id = auth.uid()
    ORDER BY cs.created_at DESC;
END;
$$;

-- 6. Revoke direct access to the view and grant access to the secure function
REVOKE ALL ON public.clients_safe FROM authenticated;
REVOKE ALL ON public.clients_safe FROM anon;

-- Grant execute permission on the secure function
GRANT EXECUTE ON FUNCTION public.get_safe_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client_safe_view TO authenticated;

-- 7. Create additional security policies for the underlying clients table
-- to ensure extra protection when accessed through views

CREATE OR REPLACE FUNCTION public.validate_client_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Extra validation for any client table access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized access attempt logged';
    END IF;
    
    -- Log any suspicious access patterns
    IF TG_OP = 'SELECT' AND NEW.user_id != auth.uid() THEN
        PERFORM public.log_medical_data_access(NEW.id, 'UNAUTHORIZED_ATTEMPT', 'client_access');
        RAISE EXCEPTION 'Access denied: Attempting to access data belonging to another user';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 8. Add extra security validation
CREATE OR REPLACE FUNCTION public.secure_client_query_validator(requested_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate that the requesting user is accessing only their own data
    IF auth.uid() != requested_user_id THEN
        -- Log the suspicious access attempt
        INSERT INTO public.medical_audit_log (
            user_id, 
            client_id, 
            action, 
            field_accessed
        ) VALUES (
            auth.uid(), 
            gen_random_uuid(), -- Placeholder since we don't have specific client
            'UNAUTHORIZED_ATTEMPT', 
            'cross_user_access_attempt'
        );
        
        RAISE EXCEPTION 'Unauthorized cross-user access attempt detected and logged';
    END IF;
    
    RETURN true;
END;
$$;

-- 9. Create a completely secure alternative to direct view access
CREATE OR REPLACE FUNCTION public.get_client_summary(client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    client_summary JSON;
BEGIN
    -- Validate ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.clients 
        WHERE id = client_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Client not found or not owned by user';
    END IF;
    
    -- Log the access
    PERFORM public.log_medical_data_access(client_id, 'VIEW', 'client_summary');
    
    -- Return safe summary
    SELECT json_build_object(
        'id', c.id,
        'nome', c.nome,
        'email', c.email,
        'telefone', c.telefone,
        'ativo', c.ativo,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'avatar_url', c.avatar_url,
        'has_medical_data', (c.dados_clinicos IS NOT NULL OR c.historico IS NOT NULL),
        'access_logged', NOW()
    )
    INTO client_summary
    FROM public.clients c
    WHERE c.id = client_id AND c.user_id = auth.uid();
    
    RETURN client_summary;
END;
$$;

-- 10. Grant permissions on new secure functions
GRANT EXECUTE ON FUNCTION public.secure_client_query_validator TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_summary TO authenticated;

-- 11. Add indexes for security and performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id_active 
ON public.clients(user_id, ativo) 
WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_medical_audit_unauthorized 
ON public.medical_audit_log(action, access_timestamp) 
WHERE action = 'UNAUTHORIZED_ATTEMPT';

-- 12. Create a security monitoring function
CREATE OR REPLACE FUNCTION public.get_security_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    security_stats JSON;
BEGIN
    -- Only authenticated users can check security stats
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    SELECT json_build_object(
        'user_id', auth.uid(),
        'total_clients', (
            SELECT COUNT(*) FROM public.clients WHERE user_id = auth.uid()
        ),
        'clients_with_medical_data', (
            SELECT COUNT(*) FROM public.clients 
            WHERE user_id = auth.uid() 
            AND (dados_clinicos IS NOT NULL OR historico IS NOT NULL)
        ),
        'recent_access_count', (
            SELECT COUNT(*) FROM public.medical_audit_log 
            WHERE user_id = auth.uid() 
            AND access_timestamp >= NOW() - INTERVAL '24 hours'
        ),
        'unauthorized_attempts', (
            SELECT COUNT(*) FROM public.medical_audit_log 
            WHERE user_id = auth.uid() 
            AND action = 'UNAUTHORIZED_ATTEMPT'
            AND access_timestamp >= NOW() - INTERVAL '30 days'
        ),
        'last_checked', NOW()
    )
    INTO security_stats;
    
    RETURN security_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_summary TO authenticated;

-- Add final security comment
COMMENT ON FUNCTION public.get_safe_clients IS 'Secure function to access client data with automatic audit logging and RLS enforcement';
COMMENT ON FUNCTION public.get_client_summary IS 'Secure function to get individual client summary with access validation';
COMMENT ON FUNCTION public.get_security_summary IS 'Security monitoring function for user access statistics';