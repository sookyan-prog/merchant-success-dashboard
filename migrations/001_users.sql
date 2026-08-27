-- Run this once in Neon's SQL editor (console.neon.tech -> your project -> Query)
-- before the login system will work. Creates the accounts table every
-- account manager and manager signs into.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null default 'am' check (role in ('am', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep emails case-insensitive at the lookup level.
create unique index if not exists users_email_lower_idx on users (lower(email));
