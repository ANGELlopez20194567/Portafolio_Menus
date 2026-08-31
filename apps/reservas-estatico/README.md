# SAKURA · Menú, reservaciones, HTML, CSS, JS y Supabase

Aplicación estática sin framework. Supabase Auth protege exclusivamente el panel del dueño; no utiliza ni comparte cuentas de ChatGPT.

- `index.html`: portada y carta pública de SAKURA, sin cargar la conexión a Supabase.
- `reservar.html`: calendario, consulta, confirmación y comprobante de la reserva.
- `legales.html`: aviso de privacidad integral y términos de reservación.
- `legal.css`: presentación responsive de la información legal.
- `sakura.css`: identidad visual pública, carta y adaptación responsive.
- `../../packages/back-link/back-link.css`: componente compartido para volver al portafolio RayelTech desde las páginas públicas.
- `reservation-quote-card.js`: configuración compartida de la tarjeta comercial que aparece en todas las vistas del Reservation System y reutiliza `../../packages/floating-quote-card/quote-card.js`.
- `admin.html`: interfaz administrativa.
- `styles.css`: estilos compartidos y responsive.
- `comensal.js`: disponibilidad, reserva, consulta y tarjeta PNG.
- `assets/feudal-landscape.png`: arte panorámico original usado en la vista pública y la tarjeta descargable.
- `admin.js`: acceso del administrador único y CRUD conectado a Supabase.
- `supabase.js`: conexión y llamadas a Supabase.

## Configurar Supabase

1. Copia los valores de `config.example.js` en `config.local.js`.
2. Completa `publishableKey` con la publishable key activa; nunca uses una secret key ni `service_role`.
3. Conserva el `restaurantId` incluido en `config.example.js`; corresponde al único restaurante de demostración.

`config.local.js` está excluido de Git para evitar versionar claves o configuración local. La publishable key puede usarse en el navegador; la protección de datos privados depende de las políticas RLS ya activas.

## Administrador de demostración

Existe una sola cuenta administrativa, confirmada previamente en Supabase y asignada a `Restaurante MESA`.

Consulta [`ACCESO_ADMIN.md`](ACCESO_ADMIN.md) para ver el correo de acceso y el procedimiento
seguro para restablecer la contraseña.

- No existe registro de administradores en la interfaz.
- El correo está precargado en `admin.html`.
- La contraseña no se guarda en el repositorio.
- Los usuarios distintos al administrador establecido no pueden crear restaurantes desde la API pública.

El restaurante contiene inicialmente:

- configuración de reservas;
- sección `Interior`;
- mesa `M1` para 4 personas;
- servicio de 13:00 a 22:00, de martes a domingo.

Secciones, mesas, horarios, ajustes y estados de reservas se leen y escriben directamente en ese restaurante de Supabase.

## Funciones del panel administrativo

- El resumen muestra las reservas del día y conteos globales de reservas pasadas y futuras.
- Al seleccionar una reserva en Resumen o Reservas se abre una ficha ampliada con contacto, horario, sección, mesa, código, estado y solicitudes especiales.
- El selector de fechas de Reservas marca con color los días del mes que contienen reservas no canceladas y muestra cuántas hay.
- Secciones y mesas se administran en paneles separados dentro del módulo Mesas.
- Cada día permite agregar horarios, marcarse como cerrado y volver a abrirse sin perder sus periodos anteriores. Los periodos también se pueden activar, archivar o borrar; borrar solicita confirmación y puede ser rechazado si la base de datos necesita conservar una relación existente.
- Horarios incluye un creador de cierres excepcionales por fecha, con catálogo de celebraciones mexicanas, motivo personalizado y mensaje visible para el comensal únicamente en ese día.
- Cada regla de reserva incluye una ayuda contextual que explica su efecto en la disponibilidad pública.

## Ejecutar

Sirve esta carpeta con cualquier servidor estático, por ejemplo:

```powershell
npx serve .
```

Abrir los archivos directamente con `file://` no es recomendable porque algunos navegadores restringen scripts y solicitudes externas.

## Publicar en GitHub Pages

El workflow `.github/workflows/reservas-pages.yml` publica las carpetas públicas `apps`,
`assets` y `packages` del portafolio, e inyecta la configuración de esta aplicación sin
versionarla.
Antes de ejecutarlo, crea estas variables del repositorio en **Settings → Secrets and
variables → Actions → Variables**:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `RESTAURANT_ID`

Después selecciona **GitHub Actions** como origen en **Settings → Pages → Build and
deployment → Source**. El workflow genera `config.local.js` dentro del artefacto público;
el archivo local continúa excluido de Git. No uses una secret key ni `service_role`.

La aplicación conserva su ruta dentro del portafolio:
`/Portafolio_Menus/apps/reservas-estatico/`.

## Acceso público y privado

La selección pública comienza en un calendario mensual. Los controles de comensales,
ambiente y horarios se habilitan únicamente después de elegir una fecha válida. Los
días sin periodos de servicio activos aparecen como cerrados y no se pueden seleccionar.
El calendario conserva seis semanas visibles (42 celdas) para que la tarjeta no cambie
de dimensiones al navegar entre meses. La interfaz pública usa una dirección editorial
inspirada en impresión japonesa y una paleta de índigo, marfil y bermellón.

La entrada pública y el flujo de reserva viven en documentos HTML independientes. La
carta ofrece accesos a `reservar.html` en el encabezado, la portada y dentro del menú.
La identidad utiliza azul índigo, marfil, bermellón y textos japoneses en hiragana y
katakana para evitar que los elementos decorativos se confundan con chino. También usa
el arte original `assets/sakura-cloudscape.png`. El mismo arte forma
parte de la tarjeta PNG que el comensal puede descargar después de confirmar.

Antes de publicar `legales.html`, se deben reemplazar los campos entre corchetes con la
razón social, domicilio, correo de privacidad, teléfono y políticas reales del restaurante.
La plantilla requiere validación jurídica para el establecimiento y su operación concreta.

La interfaz del comensal utiliza las RPC públicas existentes:

- `get_restaurant_booking_config`
- `get_available_reservation_slots`
- `create_reservation`
- `get_reservation_receipt`

La consulta pública del comprobante solicita únicamente el código aleatorio que aparece
en la tarjeta descargable. El token secreto se reserva para operaciones sensibles como
confirmar o cancelar una reserva.

La interfaz administrativa usa sesiones de Supabase Auth y políticas RLS. Cada usuario sólo puede leer y modificar el restaurante cuyo `owner_user_id` corresponde a su `auth.uid()`.

La sesión de Supabase se conserva en el navegador. No se guardan reservas, mesas, tokens
ni ajustes en `localStorage` o `sessionStorage`; únicamente puede conservarse el `public_id`
no sensible para abrir la interfaz del comensal en el mismo navegador.
