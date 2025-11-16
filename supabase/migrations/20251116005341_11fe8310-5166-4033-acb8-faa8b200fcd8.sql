-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Holdings table (persistent wallet)
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  token_symbol text not null,
  token_display_name text not null,
  quantity numeric not null,
  buy_price numeric not null,
  created_at timestamptz default now()
);

-- Trades table (history)
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  token_symbol text not null,
  token_display_name text not null,
  action text not null,
  quantity numeric not null,
  price numeric not null,
  total_value numeric not null,
  created_at timestamptz default now()
);

-- Groups table
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Group members table
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(user_id, group_id)
);

-- Group messages table
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

-- Challenges table
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.holdings enable row level security;
alter table public.trades enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.challenges enable row level security;

-- Profiles policies
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Holdings policies
create policy "Users can view own holdings"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "Users can insert own holdings"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on public.holdings for update
  using (auth.uid() = user_id);

create policy "Users can delete own holdings"
  on public.holdings for delete
  using (auth.uid() = user_id);

-- Trades policies
create policy "Users can view own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- Groups policies
create policy "Anyone can view groups"
  on public.groups for select
  using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null);

-- Group members policies
create policy "Anyone can view group members"
  on public.group_members for select
  using (true);

create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- Group messages policies
create policy "Group members can view messages"
  on public.group_messages for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = public.group_messages.group_id
      and user_id = auth.uid()
    )
  );

create policy "Group members can send messages"
  on public.group_messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.group_members
      where group_id = public.group_messages.group_id
      and user_id = auth.uid()
    )
  );

-- Challenges policies
create policy "Group members can view challenges"
  on public.challenges for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = public.challenges.group_id
      and user_id = auth.uid()
    )
  );

create policy "Group members can create challenges"
  on public.challenges for insert
  with check (
    auth.uid() = creator_id and
    exists (
      select 1 from public.group_members
      where group_id = public.challenges.group_id
      and user_id = auth.uid()
    )
  );

-- Trigger for profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to calculate portfolio stats
create or replace function public.get_user_portfolio_stats(user_uuid uuid)
returns table (
  total_value numeric,
  total_pl numeric,
  pl_percentage numeric
)
language plpgsql
security definer
as $$
declare
  initial_balance numeric := 10000;
  total_spent numeric;
  total_gained numeric;
begin
  select coalesce(sum(total_value), 0)
  into total_spent
  from public.trades
  where user_id = user_uuid and action = 'buy';
  
  select coalesce(sum(total_value), 0)
  into total_gained
  from public.trades
  where user_id = user_uuid and action = 'sell';
  
  select coalesce(sum(quantity * buy_price), 0)
  into total_value
  from public.holdings
  where user_id = user_uuid;
  
  total_pl := (initial_balance - total_spent + total_gained + total_value) - initial_balance;
  
  if initial_balance > 0 then
    pl_percentage := (total_pl / initial_balance) * 100;
  else
    pl_percentage := 0;
  end if;
  
  return query select total_value, total_pl, pl_percentage;
end;
$$;

-- View for leaderboard
create or replace view public.leaderboard as
select 
  p.id,
  p.username,
  p.avatar_url,
  coalesce(stats.total_value, 0) as portfolio_value,
  coalesce(stats.total_pl, 0) as total_pl,
  coalesce(stats.pl_percentage, 0) as pl_percentage,
  (select max(created_at) from public.trades where user_id = p.id) as last_trade_time
from public.profiles p
left join lateral public.get_user_portfolio_stats(p.id) stats on true
order by pl_percentage desc;