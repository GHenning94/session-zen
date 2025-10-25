-- Remove duplicate notification creation from RPC function
-- Only the Edge Function should create notifications to avoid duplicates

CREATE OR REPLACE FUNCTION public.register_client_from_token(p_token text, p_client_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_token_record registration_tokens%ROWTYPE;
    v_client_id uuid;
    v_professional_name text;
    v_result json;
    v_medicamentos text[];
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

    -- Tratar medicamentos para evitar '[]' como string
    IF p_client_data->>'medicamentos' IS NOT NULL AND p_client_data->>'medicamentos' != '' AND p_client_data->>'medicamentos' != '[]' THEN
        SELECT array_agg(value::text) INTO v_medicamentos
        FROM jsonb_array_elements_text((p_client_data->'medicamentos')::jsonb);
        
        IF array_length(v_medicamentos, 1) IS NULL OR array_length(v_medicamentos, 1) = 0 THEN
            v_medicamentos := NULL;
        END IF;
    ELSE
        v_medicamentos := NULL;
    END IF;

    -- Insert client with sanitized data (INCLUINDO avatar_url)
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
        avatar_url,
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
        v_medicamentos,
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
        public.sanitize_text(p_client_data->>'avatar_url'),
        true
    ) RETURNING id INTO v_client_id;

    -- Mark token as used
    UPDATE public.registration_tokens
    SET used = true,
        used_at = now(),
        used_by_client_id = v_client_id
    WHERE id = v_token_record.id;

    -- NOTE: Notification creation removed from here
    -- The Edge Function will handle notification creation and Web Push
    -- to avoid duplicate notifications

    -- Return success result
    SELECT json_build_object(
        'success', true,
        'client_id', v_client_id,
        'professional_name', COALESCE(v_professional_name, 'Profissional'),
        'message', 'Cliente cadastrado com sucesso!'
    ) INTO v_result;

    RETURN v_result;
END;
$function$;