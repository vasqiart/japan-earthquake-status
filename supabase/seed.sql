-- Development seed data for access_tokens table
-- Run this in Supabase SQL Editor to create a test token

-- Insert a test token (valid for 1 day)
INSERT INTO public.access_tokens (email, token, expires_at)
VALUES (
  'test@example.com',
  'test123',
  NOW() + INTERVAL '1 day'
);

-- Verify the token was created
SELECT email, token, expires_at, created_at
FROM public.access_tokens
WHERE token = 'test123';
