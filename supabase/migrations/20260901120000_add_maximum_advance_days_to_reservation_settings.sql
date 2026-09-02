alter table public.reservation_settings
  add column if not exists maximum_advance_days integer not null default 30
  check (maximum_advance_days between 0 and 365);

comment on column public.reservation_settings.maximum_advance_days is
  'Maximum number of calendar days ahead from today that public reservations can be made.';

create or replace function public.get_restaurant_booking_window(
  p_restaurant_public_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select settings.maximum_advance_days
  from public.restaurants as restaurant
  join public.reservation_settings as settings
    on settings.restaurant_id = restaurant.id
  where restaurant.public_id = p_restaurant_public_id;
$$;

create or replace function public.enforce_reservation_booking_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maximum_advance_days integer;
  v_service_date date;
  v_today date;
begin
  select settings.maximum_advance_days
  into v_maximum_advance_days
  from public.reservation_settings as settings
  where settings.restaurant_id = new.restaurant_id;

  if v_maximum_advance_days is null then
    return new;
  end if;

  v_service_date := (new.starts_at at time zone 'America/Cancun')::date;
  v_today := (current_timestamp at time zone 'America/Cancun')::date;

  if v_service_date > v_today + v_maximum_advance_days then
    raise exception 'Las reservas solo están disponibles hasta % días a partir de hoy.', v_maximum_advance_days
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_reservation_booking_window on public.reservations;
create trigger enforce_reservation_booking_window
  before insert or update of starts_at on public.reservations
  for each row
  execute function public.enforce_reservation_booking_window();

revoke all on function public.get_restaurant_booking_window(uuid) from public;
revoke all on function public.enforce_reservation_booking_window() from public;
grant execute on function public.get_restaurant_booking_window(uuid) to anon, authenticated;
