# Formulario de contacto Rayel Tech

Página HTML estática y responsive para solicitar nombre, teléfono, correo y un mensaje opcional. Reutiliza la paleta y tipografías de `rayeltech.lat` e incorpora accesos a los menús Classic, Informative, Interactive y Reservations.

Al enviar, el formulario llama a la Edge Function `send-contact-message` de Supabase. La función entrega el correo a `info@rayeltech.lat` mediante Resend, sin abrir el cliente de correo ni redirigir al visitante.

## Uso

Abra `index.html` en un navegador o sírvalo desde cualquier hosting estático.

La interfaz está diseñada a una altura de `100dvh`, sin desplazamiento de página, y compacta automáticamente los controles en pantallas bajas.

## Entrega automática

No se incluyen credenciales privadas en el cliente. GitHub Pages genera `config.local.js` con la URL y publishable key pública; `RESEND_API_KEY_ENVIO` permanece únicamente en los secretos de Supabase.

Antes de publicar, despliegue la Edge Function `send-contact-message` y compruebe que `RESEND_API_KEY_ENVIO` esté disponible en Supabase. El remitente configurado es `Formulario <contacto@send.rayeltech.lat>`.
