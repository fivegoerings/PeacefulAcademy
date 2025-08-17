-- Basic user store with local + OAuth identities
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password_hash text,                -- null for OAuth-only users
  provider text not null default 'local',  -- 'local', 'google', etc.
  provider_id text,                  -- sub/subject from provider
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_provider_idx on users(provider);

