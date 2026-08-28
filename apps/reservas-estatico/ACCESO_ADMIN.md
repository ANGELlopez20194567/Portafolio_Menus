# Acceso al panel administrativo

El panel se abre desde `admin.html`.

## Usuario

- Correo: usa el correo del propietario registrado en **Supabase Auth**.
- Contraseña: se configura y se restablece en **Supabase Auth**; no se guarda en este repositorio.

## Si no recuerdas la contraseña

1. Abre el proyecto **Reservas de restaurantes** en Supabase.
2. Entra en **Authentication** y localiza al usuario propietario del restaurante.
3. Restablece la contraseña del usuario o crea una nueva contraseña temporal.
4. Usa esa contraseña en `admin.html`.

No escribas la contraseña real en este archivo, en `.env.example`, en JavaScript ni en
HTML. Si necesitas anotarla para uso personal, guárdala en un gestor de contraseñas o en
un archivo local excluido de Git.
