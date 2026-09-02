-- El código público de 16 caracteres autoriza la cancelación solicitada desde el
-- comprobante. Se conserva la sobrecarga anterior con token para compatibilidad.
create or replace function public.cancel_reservation(
  p_reservation_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation_id public.reservations.id%type;
  v_status text;
  v_code text := upper(trim(p_reservation_code));
begin
  if v_code = '' then
    raise exception 'El código de reserva es obligatorio.' using errcode = '22023';
  end if;

  select reservation.id, reservation.status
  into v_reservation_id, v_status
  from public.reservations as reservation
  where reservation.public_code = v_code;

  if not found then
    raise exception 'Reserva no encontrada.' using errcode = 'P0002';
  end if;

  if v_status = 'cancelled' then
    return jsonb_build_object('status', 'cancelled', 'already_cancelled', true);
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = current_timestamp
  where id = v_reservation_id;

  -- La ocupación física es la fuente de disponibilidad; desactivarla libera las
  -- mesas para que la RPC de horarios vuelva a evaluarlas con las reglas vigentes.
  update public.table_occupancies
  set active = false
  where reservation_id = v_reservation_id
    and active = true;

  return jsonb_build_object('status', 'cancelled', 'already_cancelled', false);
end;
$$;

revoke all on function public.cancel_reservation(text) from public;
grant execute on function public.cancel_reservation(text) to anon, authenticated;
