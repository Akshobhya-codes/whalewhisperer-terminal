-- Fix security issues

-- Drop the old view and function
drop view if exists public.leaderboard;
drop function if exists public.get_user_portfolio_stats;

-- Add policies to allow reading data for leaderboard (all users can see all portfolio stats)
create policy "Anyone can view all holdings for leaderboard"
  on public.holdings for select
  using (true);

create policy "Anyone can view all trades for leaderboard"
  on public.trades for select
  using (true);

-- Recreate function without security definer (not needed with new policies)
create or replace function public.get_user_portfolio_stats(user_uuid uuid)
returns table (
  total_value numeric,
  total_pl numeric,
  pl_percentage numeric
)
language sql
stable
set search_path = public
as $$
  with trade_summary as (
    select 
      coalesce(sum(case when action = 'buy' then total_value else 0 end), 0) as total_spent,
      coalesce(sum(case when action = 'sell' then total_value else 0 end), 0) as total_gained
    from public.trades
    where user_id = user_uuid
  ),
  holdings_summary as (
    select coalesce(sum(quantity * buy_price), 0) as total_value
    from public.holdings
    where user_id = user_uuid
  )
  select 
    h.total_value,
    (10000 - t.total_spent + t.total_gained + h.total_value) - 10000 as total_pl,
    case 
      when 10000 > 0 then (((10000 - t.total_spent + t.total_gained + h.total_value) - 10000) / 10000) * 100
      else 0
    end as pl_percentage
  from trade_summary t, holdings_summary h
$$;

-- Recreate view (now safe without security definer)
create view public.leaderboard as
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