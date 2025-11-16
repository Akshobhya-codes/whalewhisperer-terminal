-- Remove the view entirely to avoid security definer issues
drop view if exists public.leaderboard;

-- Create a function to get leaderboard data instead
create or replace function public.get_leaderboard()
returns table (
  id uuid,
  username text,
  avatar_url text,
  portfolio_value numeric,
  total_pl numeric,
  pl_percentage numeric,
  last_trade_time timestamptz
)
language sql
stable
set search_path = public
as $$
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
  order by pl_percentage desc
$$;