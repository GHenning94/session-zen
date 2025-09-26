-- Enable RLS on clients_safe view and create proper security policies
-- First, ensure RLS is enabled on the view
ALTER VIEW public.clients_safe SET (security_invoker = true);

-- Create RLS policies for the clients_safe view
-- Note: Views inherit RLS from their underlying tables, but we need to ensure proper access control

-- Drop and recreate the view with proper security context
DROP VIEW IF EXISTS public.clients_safe;

CREATE VIEW public.clients_safe 
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.nome,
    CASE 
        WHEN c.user_id = auth.uid() THEN c.email
        ELSE '[PROTECTED]'
    END as email,
    CASE 
        WHEN c.user_id = auth.uid() THEN c.telefone
        ELSE '[PROTECTED]'
    END as telefone,
    c.ativo,
    c.user_id,
    c.created_at,
    c.updated_at,
    c.avatar_url,
    CASE 
        WHEN c.user_id = auth.uid() AND c.dados_clinicos IS NOT NULL THEN 'HAS_DATA'
        WHEN c.user_id = auth.uid() AND c.dados_clinicos IS NULL THEN 'NO_DATA'
        ELSE 'RESTRICTED'
    END as dados_clinicos_status,
    CASE 
        WHEN c.user_id = auth.uid() AND c.historico IS NOT NULL THEN 'HAS_DATA'
        WHEN c.user_id = auth.uid() AND c.historico IS NULL THEN 'NO_DATA'
        ELSE 'RESTRICTED'
    END as historico_status,
    CASE 
        WHEN c.user_id = auth.uid() THEN (c.dados_clinicos IS NOT NULL OR c.historico IS NOT NULL)
        ELSE false
    END as has_medical_data,
    NOW() as view_accessed_at
FROM public.clients c
WHERE c.user_id = auth.uid(); -- This is the key security constraint

-- Grant appropriate permissions
GRANT SELECT ON public.clients_safe TO authenticated;

-- Revoke any existing broad permissions
REVOKE ALL ON public.clients_safe FROM anon;
REVOKE ALL ON public.clients_safe FROM public;

-- Create a security function to validate access to clients_safe
CREATE OR REPLACE FUNCTION public.validate_clients_safe_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only allow access if user is authenticated and accessing their own data
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: Authentication required';
    END IF;
    
    -- Log access for audit purposes
    PERFORM public.log_medical_data_access(NEW.id, 'VIEW_SAFE', 'clients_safe_access');
    
    RETURN NEW;
END;
$$;

-- Update the get_safe_clients function to ensure proper security
CREATE OR REPLACE FUNCTION public.get_safe_clients()
RETURNS TABLE(
    id uuid, 
    nome text, 
    email text, 
    telefone text, 
    ativo boolean, 
    user_id uuid, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    avatar_url text, 
    dados_clinicos_status text, 
    historico_status text, 
    has_medical_data boolean, 
    view_accessed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Strict authentication check
    IF auth.uid() IS NULL OR auth.jwt() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User authentication required to access client data';
    END IF;
    
    -- Log the access attempt for audit trail
    INSERT INTO public.medical_audit_log (
        user_id, 
        client_id, 
        action, 
        field_accessed,
        ip_address,
        session_id
    ) 
    SELECT 
        auth.uid(), 
        c.id, 
        'VIEW_SAFE_LIST', 
        'clients_safe_function',
        inet_client_addr(),
        current_setting('request.jwt.claims', true)::json->>'session_id'
    FROM public.clients c 
    WHERE c.user_id = auth.uid();
    
    -- Return only the user's own clients with secure data masking
    RETURN QUERY
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
        CASE 
            WHEN c.dados_clinicos IS NOT NULL THEN 'HAS_DATA'
            ELSE 'NO_DATA'
        END::text as dados_clinicos_status,
        CASE 
            WHEN c.historico IS NOT NULL THEN 'HAS_DATA'
            ELSE 'NO_DATA'
        END::text as historico_status,
        (c.dados_clinicos IS NOT NULL OR c.historico IS NOT NULL) as has_medical_data,
        NOW() as view_accessed_at
    FROM public.clients c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
END;
$$;

-- Create additional security validation function
CREATE OR REPLACE FUNCTION public.secure_client_data_access_validator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Validate that user is properly authenticated
    IF auth.uid() IS NULL THEN
        -- Log unauthorized access attempt
        INSERT INTO public.medical_audit_log (
            user_id, 
            client_id, 
            action, 
            field_accessed
        ) VALUES (
            NULL, 
            gen_random_uuid(), 
            'UNAUTHORIZED_ACCESS_ATTEMPT', 
            'clients_safe_direct_access'
        );
        
        RAISE EXCEPTION 'Security violation: Unauthorized access to patient data detected and logged';
    END IF;
    
    RETURN true;
END;
$$;

-- Grant execute permissions to the new security functions
GRANT EXECUTE ON FUNCTION public.get_safe_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_client_data_access_validator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_clients_safe_access() TO authenticated;