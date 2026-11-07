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
