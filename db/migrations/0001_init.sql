-- 第一版数据结构:账号、租户、成员、会话、分类、Prompt、版本、API Key、调用记录

create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- users 是成员关系:一个账号在一个租户下的身份和角色
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  tenant_id  uuid not null references tenants (id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (account_id, tenant_id)
);

create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  account_id uuid not null references accounts (id) on delete cascade,
  tenant_id  uuid not null references tenants (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  name        text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists prompts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants (id) on delete cascade,
  category_id     uuid not null references categories (id),
  name            text not null,
  key             text not null,
  description     text not null default '',
  current_version integer,
  created_by      uuid references users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, key)
);

create index if not exists prompts_tenant_idx on prompts (tenant_id);

create table if not exists prompt_versions (
  id         uuid primary key default gen_random_uuid(),
  prompt_id  uuid not null references prompts (id) on delete cascade,
  version    integer not null,
  content    text not null,
  variables  jsonb not null default '[]'::jsonb,
  status     text not null check (status in ('draft', 'published', 'archived')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (prompt_id, version)
);

-- 同一个 Prompt 同时只允许一个 published 版本
create unique index if not exists prompt_versions_one_published
  on prompt_versions (prompt_id)
  where status = 'published';

create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
  status       text not null default 'active' check (status in ('active', 'disabled')),
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists api_keys_tenant_idx on api_keys (tenant_id);

create table if not exists prompt_usage (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  prompt_id      uuid not null references prompts (id) on delete cascade,
  prompt_version integer not null,
  api_key_id     uuid references api_keys (id) on delete set null,
  status         text not null,
  latency        integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists prompt_usage_tenant_created_idx on prompt_usage (tenant_id, created_at desc);
create index if not exists prompt_usage_prompt_idx on prompt_usage (prompt_id);
