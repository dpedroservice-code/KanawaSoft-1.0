-- Twilio Verify login: E.164 phone lookup for existing Kanawa Soft profiles.
create or replace function public.ks_normalize_phone_e164(p_phone text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_digits text;
begin
  v_digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if v_digits = '' then return null; end if;
  if v_digits ~ '^00244[0-9]{9}$' then return '+' || substring(v_digits from 3); end if;
  if v_digits ~ '^244[0-9]{9}$' then return '+' || v_digits; end if;
  if v_digits ~ '^[0-9]{9}$' then return '+244' || v_digits; end if;
  if left(coalesce(p_phone, ''), 1) = '+' and length(v_digits) between 8 and 15 then return '+' || v_digits; end if;
  return null;
end;
$$;

alter table public.ks_profiles add column if not exists phone_e164 text;

update public.ks_profiles
set phone_e164 = public.ks_normalize_phone_e164(phone)
where phone is not null and (phone_e164 is null or phone_e164 <> public.ks_normalize_phone_e164(phone));

create index if not exists ks_profiles_phone_e164_idx
  on public.ks_profiles (phone_e164)
  where phone_e164 is not null;

create or replace function public.ks_sync_profile_phone_e164()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.phone_e164 := public.ks_normalize_phone_e164(new.phone);
  return new;
end;
$$;

drop trigger if exists ks_profiles_phone_e164_sync on public.ks_profiles;
create trigger ks_profiles_phone_e164_sync
before insert or update of phone on public.ks_profiles
for each row execute function public.ks_sync_profile_phone_e164();


-- Persist OTP throttling across Netlify function instances; keys are SHA-256 hashes, not PII.
create table if not exists public.ks_auth_otp_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ks_auth_otp_rate_limits enable row level security;
revoke all on public.ks_auth_otp_rate_limits from public, anon, authenticated;
grant all on public.ks_auth_otp_rate_limits to service_role;

create or replace function public.ks_consume_auth_otp_rate_limit(
  p_rate_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if p_rate_key is null or length(p_rate_key) <> 64
     or p_max_requests < 1 or p_window_seconds < 1 then
    raise exception 'Invalid OTP rate limit parameters';
  end if;

  insert into public.ks_auth_otp_rate_limits as limits
    (rate_key, window_started_at, request_count, updated_at)
  values (p_rate_key, now(), 1, now())
  on conflict (rate_key) do update
    set window_started_at = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now() else limits.window_started_at end,
        request_count = case
          when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1 else limits.request_count + 1 end,
        updated_at = now()
  returning request_count into v_count;

  delete from public.ks_auth_otp_rate_limits
  where updated_at < now() - interval '1 day';

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.ks_consume_auth_otp_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.ks_consume_auth_otp_rate_limit(text, integer, integer) to service_role;
