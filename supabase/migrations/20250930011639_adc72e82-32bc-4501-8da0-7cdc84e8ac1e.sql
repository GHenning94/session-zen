-- Add used_by_client_id column to registration_tokens
ALTER TABLE public.registration_tokens 
ADD COLUMN used_by_client_id uuid NULL;

-- Create unique index on token
CREATE UNIQUE INDEX idx_registration_tokens_token_unique 
ON public.registration_tokens (token);

-- Create index on used_by_client_id for performance
CREATE INDEX idx_registration_tokens_used_by_client_id 
ON public.registration_tokens (used_by_client_id);

-- Create rate limiting table for edge functions
CREATE TABLE public.edge_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip inet NOT NULL,
    endpoint text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for rate limiting queries
CREATE INDEX idx_edge_rate_limits_ip_endpoint_ts 
ON public.edge_rate_limits (ip, endpoint, created_at DESC);

-- Create transactional function for client registration from token
CREATE OR REPLACE FUNCTION public.register_client_from_token(
    p_token text,
    p_client_data jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_token_record registration_tokens%ROWTYPE;
    v_client_id uuid;
    v_professional_name text;
    v_result json;
BEGIN
    -- Lock and validate token
    SELECT * INTO v_token_record
    FROM public.registration_tokens
    WHERE token = p_token
      AND used = false
      AND expires_at > now()
    FOR UPDATE;

    -- Check if token was found and is valid
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token inválido, expirado ou já utilizado';
    END IF;

    -- Get professional name
    SELECT nome INTO v_professional_name
    FROM public.profiles
    WHERE user_id = v_token_record.user_id;

    -- Insert client with sanitized data
    INSERT INTO public.clients (
        user_id,
        nome,
        email,
        telefone,
        endereco,
        cpf,
        data_nascimento,
        genero,
        profissao,
        plano_saude,
        medicamentos,
        contato_emergencia_1_nome,
        contato_emergencia_1_telefone,
        contato_emergencia_2_nome,
        contato_emergencia_2_telefone,
        nome_pai,
        telefone_pai,
        nome_mae,
        telefone_mae,
        eh_crianca_adolescente,
        emergencia_igual_pais,
        pais,
        tratamento,
        ativo
    ) VALUES (
        v_token_record.user_id,
        public.sanitize_text(p_client_data->>'nome'),
        public.sanitize_text(p_client_data->>'email'),
        public.sanitize_text(p_client_data->>'telefone'),
        public.sanitize_text(p_client_data->>'endereco'),
        public.sanitize_text(p_client_data->>'cpf'),
        CASE WHEN p_client_data->>'data_nascimento' != '' 
             THEN (p_client_data->>'data_nascimento')::date 
             ELSE NULL END,
        public.sanitize_text(p_client_data->>'genero'),
        public.sanitize_text(p_client_data->>'profissao'),
        public.sanitize_text(p_client_data->>'plano_saude'),
        CASE WHEN p_client_data->>'medicamentos' != '' 
             THEN string_to_array(public.sanitize_text(p_client_data->>'medicamentos'), ',')
             ELSE NULL END,
        public.sanitize_text(p_client_data->>'contato_emergencia_1_nome'),
        public.sanitize_text(p_client_data->>'contato_emergencia_1_telefone'),
        public.sanitize_text(p_client_data->>'contato_emergencia_2_nome'),
        public.sanitize_text(p_client_data->>'contato_emergencia_2_telefone'),
        public.sanitize_text(p_client_data->>'nome_pai'),
        public.sanitize_text(p_client_data->>'telefone_pai'),
        public.sanitize_text(p_client_data->>'nome_mae'),
        public.sanitize_text(p_client_data->>'telefone_mae'),
        COALESCE((p_client_data->>'eh_crianca_adolescente')::boolean, false),
        COALESCE((p_client_data->>'emergencia_igual_pais')::boolean, false),
        public.sanitize_text(p_client_data->>'pais'),
        public.sanitize_text(p_client_data->>'tratamento'),
        true
    ) RETURNING id INTO v_client_id;

    -- Mark token as used
    UPDATE public.registration_tokens
    SET used = true,
        used_at = now(),
        used_by_client_id = v_client_id
    WHERE id = v_token_record.id;

    -- Create notification for professional
    INSERT INTO public.notifications (
        user_id,
        titulo,
        conteudo
    ) VALUES (
        v_token_record.user_id,
        'Novo cliente cadastrado',
        'O cliente ' || (p_client_data->>'nome') || ' foi cadastrado via link público em ' || 
        TO_CHAR(now(), 'DD/MM/YYYY às HH24:MI')
    );

    -- Return success result
    SELECT json_build_object(
        'success', true,
        'client_id', v_client_id,
        'professional_name', COALESCE(v_professional_name, 'Profissional'),
        'message', 'Cliente cadastrado com sucesso!'
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Create function to check and log rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_ip inet,
    p_endpoint text,
    p_max_requests integer DEFAULT 20,
    p_window_minutes integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_request_count integer;
BEGIN
    -- Count recent requests from this IP for this endpoint
    SELECT COUNT(*) INTO v_request_count
    FROM public.edge_rate_limits
    WHERE ip = p_ip
      AND endpoint = p_endpoint
      AND created_at > now() - (p_window_minutes || ' minutes')::interval;

    -- Log this request
    INSERT INTO public.edge_rate_limits (ip, endpoint)
    VALUES (p_ip, p_endpoint);

    -- Clean up old entries (older than 1 hour)
    DELETE FROM public.edge_rate_limits
    WHERE created_at < now() - interval '1 hour';

    -- Return true if under limit
    RETURN v_request_count < p_max_requests;
END;
$$;