-- Create table for bank details change history
CREATE TABLE public.bank_details_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL DEFAULT 'UPDATE',
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_details_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log (no direct user access)
CREATE POLICY "Admins can view bank details audit log"
ON public.bank_details_audit_log
FOR SELECT
USING (public.current_user_has_role('admin'));

-- Create function to log bank details changes
CREATE OR REPLACE FUNCTION public.log_bank_details_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_changed_fields TEXT[] := ARRAY[]::TEXT[];
    v_old_values JSONB := '{}'::JSONB;
    v_new_values JSONB := '{}'::JSONB;
BEGIN
    -- Check each bank-related field for changes
    IF OLD.tipo_pessoa IS DISTINCT FROM NEW.tipo_pessoa THEN
        v_changed_fields := array_append(v_changed_fields, 'tipo_pessoa');
        v_old_values := v_old_values || jsonb_build_object('tipo_pessoa', OLD.tipo_pessoa);
        v_new_values := v_new_values || jsonb_build_object('tipo_pessoa', NEW.tipo_pessoa);
    END IF;
    
    IF OLD.cpf_cnpj IS DISTINCT FROM NEW.cpf_cnpj THEN
        v_changed_fields := array_append(v_changed_fields, 'cpf_cnpj');
        -- Mask sensitive data - show only last 4 digits
        v_old_values := v_old_values || jsonb_build_object('cpf_cnpj', 
            CASE WHEN OLD.cpf_cnpj IS NOT NULL THEN '***' || RIGHT(OLD.cpf_cnpj, 4) ELSE NULL END);
        v_new_values := v_new_values || jsonb_build_object('cpf_cnpj', 
            CASE WHEN NEW.cpf_cnpj IS NOT NULL THEN '***' || RIGHT(NEW.cpf_cnpj, 4) ELSE NULL END);
    END IF;
    
    IF OLD.nome_titular IS DISTINCT FROM NEW.nome_titular THEN
        v_changed_fields := array_append(v_changed_fields, 'nome_titular');
        v_old_values := v_old_values || jsonb_build_object('nome_titular', OLD.nome_titular);
        v_new_values := v_new_values || jsonb_build_object('nome_titular', NEW.nome_titular);
    END IF;
    
    IF OLD.banco IS DISTINCT FROM NEW.banco THEN
        v_changed_fields := array_append(v_changed_fields, 'banco');
        v_old_values := v_old_values || jsonb_build_object('banco', OLD.banco);
        v_new_values := v_new_values || jsonb_build_object('banco', NEW.banco);
    END IF;
    
    IF OLD.agencia IS DISTINCT FROM NEW.agencia THEN
        v_changed_fields := array_append(v_changed_fields, 'agencia');
        v_old_values := v_old_values || jsonb_build_object('agencia', OLD.agencia);
        v_new_values := v_new_values || jsonb_build_object('agencia', NEW.agencia);
    END IF;
    
    IF OLD.conta IS DISTINCT FROM NEW.conta THEN
        v_changed_fields := array_append(v_changed_fields, 'conta');
        -- Mask account - show only last 4 digits
        v_old_values := v_old_values || jsonb_build_object('conta', 
            CASE WHEN OLD.conta IS NOT NULL THEN '***' || RIGHT(OLD.conta, 4) ELSE NULL END);
        v_new_values := v_new_values || jsonb_build_object('conta', 
            CASE WHEN NEW.conta IS NOT NULL THEN '***' || RIGHT(NEW.conta, 4) ELSE NULL END);
    END IF;
    
    IF OLD.tipo_conta IS DISTINCT FROM NEW.tipo_conta THEN
        v_changed_fields := array_append(v_changed_fields, 'tipo_conta');
        v_old_values := v_old_values || jsonb_build_object('tipo_conta', OLD.tipo_conta);
        v_new_values := v_new_values || jsonb_build_object('tipo_conta', NEW.tipo_conta);
    END IF;
    
    IF OLD.chave_pix IS DISTINCT FROM NEW.chave_pix THEN
        v_changed_fields := array_append(v_changed_fields, 'chave_pix');
        -- Mask PIX key
        v_old_values := v_old_values || jsonb_build_object('chave_pix', 
            CASE WHEN OLD.chave_pix IS NOT NULL THEN LEFT(OLD.chave_pix, 3) || '***' ELSE NULL END);
        v_new_values := v_new_values || jsonb_build_object('chave_pix', 
            CASE WHEN NEW.chave_pix IS NOT NULL THEN LEFT(NEW.chave_pix, 3) || '***' ELSE NULL END);
    END IF;
    
    IF OLD.bank_details_validated IS DISTINCT FROM NEW.bank_details_validated THEN
        v_changed_fields := array_append(v_changed_fields, 'bank_details_validated');
        v_old_values := v_old_values || jsonb_build_object('bank_details_validated', OLD.bank_details_validated);
        v_new_values := v_new_values || jsonb_build_object('bank_details_validated', NEW.bank_details_validated);
    END IF;
    
    -- Only log if there were bank-related changes
    IF array_length(v_changed_fields, 1) > 0 THEN
        INSERT INTO public.bank_details_audit_log (
            user_id,
            action,
            old_values,
            new_values,
            changed_fields,
            ip_address
        ) VALUES (
            NEW.user_id,
            'UPDATE',
            v_old_values,
            v_new_values,
            v_changed_fields,
            inet_client_addr()
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER trigger_log_bank_details_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_bank_details_change();

-- Create index for faster queries
CREATE INDEX idx_bank_details_audit_user_id ON public.bank_details_audit_log(user_id);
CREATE INDEX idx_bank_details_audit_created_at ON public.bank_details_audit_log(created_at DESC);