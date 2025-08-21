-- Add SELECT policy for users to read their own profiles
CREATE POLICY "Users can read their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);