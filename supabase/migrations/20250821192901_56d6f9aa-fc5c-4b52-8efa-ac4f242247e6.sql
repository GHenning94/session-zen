-- Remove the remaining public read policy from configuracoes table
DROP POLICY IF EXISTS "Permitir leitura publica do perfil" ON public.configuracoes;

-- Ensure no public access remains to configuracoes table
-- Only authenticated users should be able to read their own config
CREATE POLICY "Users can read their own config" 
ON public.configuracoes 
FOR SELECT 
USING (auth.uid() = user_id);