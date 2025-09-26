-- Fix the authentication issue in get_safe_clients function
-- The function is being too restrictive and blocking legitimate frontend access

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
SET search_path = public
AS $$
BEGIN
    -- More lenient authentication check for frontend access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to access client data';
    END IF;
    
    -- Log the access attempt for audit trail (but don't fail if logging fails)
    BEGIN
        INSERT INTO public.medical_audit_log (
            user_id, 
            client_id, 
            action, 
            field_accessed,
            ip_address
        ) VALUES (
            auth.uid(), 
            gen_random_uuid(), 
            'VIEW_SAFE_LIST', 
            'get_safe_clients_function',
            inet_client_addr()
        );
    EXCEPTION 
        WHEN OTHERS THEN
            -- Continue execution even if logging fails
            NULL;
    END;
    
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
            WHEN c.dados_clinicos IS NOT NULL THEN 'HAS_DATA'::text
            ELSE 'NO_DATA'::text
        END as dados_clinicos_status,
        CASE 
            WHEN c.historico IS NOT NULL THEN 'HAS_DATA'::text
            ELSE 'NO_DATA'::text
        END as historico_status,
        (c.dados_clinicos IS NOT NULL OR c.historico IS NOT NULL) as has_medical_data,
        NOW() as view_accessed_at
    FROM public.clients c
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
END;
$$;