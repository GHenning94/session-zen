-- Update subscription plan for user with active Stripe subscription
-- This is a one-time fix for users who already have active subscriptions but weren't synced
UPDATE profiles 
SET subscription_plan = 'premium', 
    updated_at = NOW()
WHERE user_id = 'd519f0ad-314b-4baa-a2ee-e2772f395be2';