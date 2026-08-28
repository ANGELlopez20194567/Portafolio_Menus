# Base de datos de reservas

Esquema desplegado en el proyecto Supabase **Reservas de restaurantes**. El proyecto
usa PostgreSQL 17 y el esquema de aplicación vive en `public`; los helpers internos
viven en `private` y no forman parte de la Data API.

## Migraciones remotas

- `20260825211210_create_reservation_core_schema`: tablas, restricciones, índices y protección
  contra traslapes de mesas.
- `20260825211327_secure_reservation_schema`: RLS, permisos del dueño, auditoría y cola de correos.
- `20260825211532_add_reservation_api`: RPC públicos de configuración, disponibilidad, creación,
  confirmación, consulta de comprobante y cancelación.
- `20260825211953_add_reservation_foreign_key_indexes`: índices de soporte para todas las llaves
  foráneas compuestas usadas por joins y eliminaciones.
- `20260826000507_lookup_reservation_by_code_only`: consulta pública del comprobante usando
  únicamente el código aleatorio impreso en la tarjeta y códigos nuevos de 16 caracteres.
- `20260827224251_expose_open_weekdays_in_booking_config`: incorpora los días semanales con
  periodos activos a la configuración pública para bloquear fechas cerradas en el calendario.
- `20260827225052_expose_special_closures_in_booking_config`: publica únicamente la fecha y el
  motivo de los cierres excepcionales futuros dentro de la ventana de reservas.

Las migraciones fueron aplicadas mediante el conector oficial de Supabase y quedan
registradas en `supabase_migrations.schema_migrations`.

## Modelo

| Área | Tablas |
| --- | --- |
| Restaurante | `restaurants`, `reservation_settings` |
| Plano | `sections`, `dining_tables` |
| Mesas combinadas | `table_combinations`, `table_combination_members` |
| Horarios | `service_periods`, `special_dates`, `special_date_periods` |
| Reglas | `turn_time_rules`, `flow_limits` |
| Operación | `reservations`, `table_occupancies` |
| Auditoría y salidas | `reservation_status_history`, `reservation_artifacts`, `notification_deliveries` |

`restaurants.owner_user_id` es único: una cuenta propietaria solo puede tener un
restaurante. Las secciones representan áreas del mismo establecimiento, no sucursales.

`table_occupancies` es la fuente única para la ocupación física. Una restricción de
exclusión GiST impide que dos rangos activos se traslapen para la misma mesa. Reservar
una combinación crea una ocupación por cada mesa integrante.

## Acceso

Las tablas tienen RLS habilitado. Un usuario autenticado solo puede administrar filas
del restaurante cuyo `owner_user_id` coincide con `auth.uid()`. El rol anónimo no tiene
`SELECT`, `INSERT`, `UPDATE` ni `DELETE` directo sobre reservas o datos personales.

El cliente público accede únicamente a estas funciones:

| RPC | Uso |
| --- | --- |
| `get_restaurant_booking_config` | Nombre, zona horaria, límites, días abiertos, cierres especiales y secciones públicas |
| `get_available_reservation_slots` | Horarios que tienen una mesa o combinación disponible |
| `create_reservation` | Reserva o hold atómico con asignación automática |
| `confirm_reservation` | Confirma un hold vigente mediante código y token |
| `get_reservation_receipt` | Consulta limitada mediante el código aleatorio de la tarjeta |
| `cancel_reservation` | Cancelación dentro de la política configurada |

Estos RPC usan `SECURITY DEFINER` de forma intencional porque `anon` no puede leer ni
escribir las tablas subyacentes. Cada función fija `search_path`, valida sus parámetros
y solo devuelve campos permitidos. El comprobante se consulta únicamente con el código
público aleatorio. Los endpoints que cambian el estado, como confirmación y cancelación,
continúan exigiendo el código más el token secreto.

El token secreto para operaciones sensibles solo se entrega al crear la reserva. La base
guarda únicamente su hash SHA-256. No se debe poner el token completo en logs ni analítica.

### Ejemplo de disponibilidad

```ts
const { data, error } = await supabase.rpc('get_available_reservation_slots', {
  p_restaurant_public_id: restaurantId,
  p_service_date: '2026-09-10',
  p_party_size: 4,
  p_section_public_id: null,
})
```

### Ejemplo de creación

```ts
const { data, error } = await supabase.rpc('create_reservation', {
  p_restaurant_public_id: restaurantId,
  p_starts_at: selectedStartsAt,
  p_party_size: 4,
  p_guest_name: guestName,
  p_guest_email: guestEmail,
  p_privacy_notice_version: '2026-08-25',
  p_privacy_consent: true,
  p_guest_phone: guestPhone || null,
  p_section_public_id: selectedSectionId || null,
  p_special_requests: notes || null,
  p_confirm_immediately: true,
})
```

La respuesta incluye `reservation_code` y `lookup_token`. Deben conservarse juntos
para mostrar el comprobante o cancelar, pero el token no debe incluirse en una URL
indexable.

## Flujo de disponibilidad

1. Se resuelve el horario semanal o la excepción de la fecha.
2. Se generan inicios según `slot_interval_minutes`.
3. Se aplica la duración más específica por servicio, fecha, sección y tamaño del grupo.
4. Se suma el buffer de limpieza.
5. Se evalúan mesas individuales y combinaciones completas.
6. Se eliminan recursos con ocupaciones traslapadas.
7. Se aplican anticipación, tamaño máximo y límites de llegadas/comensales.
8. Al reservar se toma un advisory lock por restaurante y fecha y se repite la
   validación dentro de la misma transacción.

## Operación pendiente de aplicación

- Un proceso backend debe consumir `notification_deliveries` y marcar cada envío como
  `sent` o `failed`. Las credenciales del proveedor de correo van en secretos, nunca en
  el repositorio.
- La imagen de confirmación se guardará en Storage privado y su ruta se registrará en
  `reservation_artifacts`.
- Antes de abrir el formulario públicamente se debe colocar rate limiting y CAPTCHA en
  una Edge Function. La base evita conflictos, pero no sustituye la protección anti-spam.
- Las eliminaciones de reservas se representan con el estado `cancelled`; no se borran
  físicamente para conservar auditoría.

## Verificación realizada

La prueba transaccional remota creó un restaurante, sección, mesa y horario ficticios;
generó disponibilidad, realizó una reserva, comprobó el bloqueo de una segunda reserva
en el mismo horario, leyó el comprobante, verificó la cola de correo y canceló la
reserva. La transacción terminó con `ROLLBACK`, por lo que no dejó datos de prueba.
También se simuló una sesión `authenticated` con JWT y se comprobó que RLS permite al
propietario ver exactamente su restaurante y sus secciones; esa prueba también se revirtió.

Para la integración estática, complete `apps/reservas-estatico/config.local.js` con la
URL, la publishable key y el `public_id` del restaurante. Ese archivo está ignorado por
Git. Nunca use `service_role` en el navegador.
