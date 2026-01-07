-- Fix incorrect subscription_plan for referred user who never paid
UPDATE profiles 
SET subscription_plan = 'basico'
WHERE user_id = 'fac1f19c-46b2-4fef-8edc-e1039f06baeb'
  AND subscription_plan = 'premium';