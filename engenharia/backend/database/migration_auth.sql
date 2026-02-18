-- Add authentication columns to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS social_provider TEXT,
ADD COLUMN IF NOT EXISTS social_id TEXT;

-- Create index for faster lookups on social_id
CREATE INDEX IF NOT EXISTS idx_profiles_social_id ON profiles(social_id);
