-- access_tokens schema v2 (token issuance + activation-on-first-click)

alter table public.access_tokens
  add column if not exists plan text,
  add column if not exists activated_at timestamptz,
  add column if not exists activation_deadline_at timestamptz,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_customer_email text;

-- Ensure token uniqueness
create unique index if not exists access_tokens_token_uq
  on public.access_tokens(token);

-- Ensure idempotency per Stripe Checkout Session
create unique index if not exists access_tokens_stripe_session_uq
  on public.access_tokens(stripe_session_id);

-- Optional helpful indexes
create index if not exists access_tokens_expires_at_idx
  on public.access_tokens(expires_at);

create index if not exists access_tokens_activation_deadline_idx
  on public.access_tokens(activation_deadline_at);
