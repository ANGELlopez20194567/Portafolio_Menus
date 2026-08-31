create or replace function public.claim_reservation_confirmation(
  p_reservation_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_delivery_id bigint;
  v_result jsonb;
begin
  with candidate as (
    select delivery.id
    from public.notification_deliveries as delivery
    inner join public.reservations as reservation
      on reservation.id = delivery.reservation_id
     and reservation.restaurant_id = delivery.restaurant_id
    where reservation.public_code = upper(trim(p_reservation_code))
      and delivery.channel = 'email'
      and delivery.template = 'reservation_confirmation'
      and delivery.attempts < 3
      and (
        delivery.status in ('pending', 'failed')
        or (
          delivery.status = 'processing'
          and delivery.updated_at < statement_timestamp() - interval '10 minutes'
        )
      )
    order by delivery.created_at, delivery.id
    limit 1
    for update of delivery skip locked
  )
  update public.notification_deliveries as delivery
  set status = 'processing',
      attempts = delivery.attempts + 1,
      last_error = null
  from candidate
  where delivery.id = candidate.id
  returning delivery.id into v_delivery_id;

  if v_delivery_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'delivery_id', delivery.id,
    'recipient', delivery.recipient,
    'template', delivery.template,
    'reservation_code', reservation.public_code,
    'guest_name', reservation.guest_name,
    'party_size', reservation.party_size,
    'starts_at', reservation.starts_at,
    'restaurant_name', restaurant.name,
    'timezone', restaurant.timezone,
    'section_name', section.name,
    'public_email', restaurant.public_email,
    'public_phone', restaurant.public_phone
  )
  into v_result
  from public.notification_deliveries as delivery
  inner join public.reservations as reservation
    on reservation.id = delivery.reservation_id
   and reservation.restaurant_id = delivery.restaurant_id
  inner join public.restaurants as restaurant
    on restaurant.id = delivery.restaurant_id
  left join public.sections as section
    on section.id = coalesce(reservation.assigned_section_id, reservation.preferred_section_id)
   and section.restaurant_id = reservation.restaurant_id
  where delivery.id = v_delivery_id;

  return v_result;
end;
$function$;

create or replace function public.complete_reservation_email_delivery(
  p_delivery_id bigint,
  p_sent boolean,
  p_provider_message_id text default null,
  p_error text default null
)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  update public.notification_deliveries as delivery
  set status = case when p_sent then 'sent' else 'failed' end,
      provider_message_id = case when p_sent then p_provider_message_id else null end,
      last_error = case when p_sent then null else left(coalesce(p_error, 'Unknown delivery error'), 1000) end,
      sent_at = case when p_sent then statement_timestamp() else null end
  where delivery.id = p_delivery_id
    and delivery.channel = 'email'
    and delivery.template = 'reservation_confirmation'
    and delivery.status = 'processing'
  returning true;
$function$;

revoke all on function public.claim_reservation_confirmation(text) from public, anon, authenticated;
revoke all on function public.complete_reservation_email_delivery(bigint, boolean, text, text) from public, anon, authenticated;

grant execute on function public.claim_reservation_confirmation(text) to service_role;
grant execute on function public.complete_reservation_email_delivery(bigint, boolean, text, text) to service_role;

grant select on table public.restaurants to service_role;
grant select on table public.sections to service_role;
grant select on table public.reservations to service_role;
grant select, update on table public.notification_deliveries to service_role;

comment on function public.claim_reservation_confirmation(text) is
  'Reclama atómicamente una confirmación por código para el worker privado de correo.';

comment on function public.complete_reservation_email_delivery(bigint, boolean, text, text) is
  'Registra el resultado del envío de una confirmación previamente reclamada.';
