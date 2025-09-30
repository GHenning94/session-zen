-- Enable RLS on edge_rate_limits table
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy to prevent direct access (only functions can write)
CREATE POLICY "Rate limits are managed by functions only"
ON public.edge_rate_limits
FOR ALL
USING (false)
WITH CHECK (false);