-- Create table for Asaas subaccounts (for automatic split)
CREATE TABLE public.asaas_subaccounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    asaas_account_id TEXT NOT NULL UNIQUE,
    wallet_id TEXT NOT NULL UNIQUE,
    account_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asaas_subaccounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own Asaas account
CREATE POLICY "Users can view own Asaas account" 
ON public.asaas_subaccounts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own Asaas account (through edge function with service role)
CREATE POLICY "Service role can manage Asaas accounts"
ON public.asaas_subaccounts
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_asaas_subaccounts_updated_at
BEFORE UPDATE ON public.asaas_subaccounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_asaas_subaccounts_wallet_id ON public.asaas_subaccounts(wallet_id);
CREATE INDEX idx_asaas_subaccounts_status ON public.asaas_subaccounts(account_status);