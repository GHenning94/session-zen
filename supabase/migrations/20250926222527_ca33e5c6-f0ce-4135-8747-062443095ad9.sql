-- Fix security issue: Secure the clients_safe view using alternative approach
-- Since views don't support RLS, we'll use permission management and secure functions

-- First, revoke all default permissions on the clients_safe view
REVOKE ALL ON public.clients_safe FROM PUBLIC;
REVOKE ALL ON public.clients_safe FROM authenticated;
REVOKE ALL ON public.clients_safe FROM anon;

-- Create a security validation function specifically for clients_safe access
CREATE OR REPLACE FUNCTION public.validate_clients_safe_security()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ensure user is authenticated
    IF auth.uid() IS NULL OR auth.jwt() IS NULL THEN
        -- Log unauthorized access attempt
        INSERT INTO public.medical_audit_log (
            user_id, 
            client_id, 
            action, 
            field_accessed,
            ip_address
        ) VALUES (
            NULL, 
            gen_random_uuid(), 
            'UNAUTHORIZED_VIEW_ACCESS', 
            'clients_safe_direct_access',
            inet_client_addr()
        );
        
        RAISE EXCEPTION 'Security violation: Unauthorized access to client safe view detected and logged';
    END IF;
    
    RETURN true;
END;
$$;

-- Create a secure function to access clients_safe data instead of direct view access
CREATE OR REPLACE FUNCTION public.get_clients_safe_data()
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
SET search_path = public
AS $$
BEGIN
    -- Strict authentication check
    IF auth.uid() IS NULL OR auth.jwt() IS NULL THEN
        RAISE EXCEPTION 'Access denied: Authentication required to access client safe data';
    END IF;
    
    -- Log the access for audit purposes
    INSERT INTO public.medical_audit_log (
        user_id, 
        client_id, 
        action, 
        field_accessed,
        ip_address
    ) 
    SELECT 
        auth.uid(), 
        c.id, 
        'VIEW_SAFE_DATA', 
        'clients_safe_function_access',
        inet_client_addr()
    FROM public.clients c 
    WHERE c.user_id = auth.uid();
    
    -- Return data from the secure view (which has built-in data masking)
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
    WHERE cs.user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users for the safe function
GRANT EXECUTE ON FUNCTION public.get_clients_safe_data() TO authenticated;

-- Update the existing get_safe_clients function to be consistent with security approach
CREATE OR REPLACE FUNCTION public.get_safe_clients()
RETURNS TABLE(id uuid, nome text, email text, telefone text, ativo boolean, user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, avatar_url text, dados_clinicos_status text, historico_status text, has_medical_data boolean, view_accessed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        ip_address
    ) 
    SELECT 
        auth.uid(), 
        c.id, 
        'VIEW_SAFE_LIST', 
        'get_safe_clients_function',
        inet_client_addr()
    FROM public.clients c 
    WHERE c.user_id = auth.uid();
    
    -- Use the secure view which already has data masking and filtering
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

-- Add documentation comment
COMMENT ON VIEW public.clients_safe IS 'Secure view for client data with built-in data masking and row filtering. Access is controlled through security definer functions only.';
COMMENT ON FUNCTION public.get_clients_safe_data() IS 'Secure function to access clients_safe view data with authentication and audit logging.';
COMMENT ON FUNCTION public.get_safe_clients() IS 'Primary secure function for accessing client safe data with comprehensive security checks.';

-- Create an additional security function to validate any direct access attempts
CREATE OR REPLACE FUNCTION public.prevent_direct_clients_safe_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log any attempt to access the view directly
    INSERT INTO public.medical_audit_log (
        user_id, 
        client_id, 
        action, 
        field_accessed,
        ip_address
    ) VALUES (
        auth.uid(), 
        COALESCE(NEW.id, OLD.id), 
        'DIRECT_VIEW_ACCESS_ATTEMPT', 
        'clients_safe_view',
        inet_client_addr()
    );
    
    -- Allow the operation but log it for security monitoring
    RETURN COALESCE(NEW, OLD);
END;
$$;