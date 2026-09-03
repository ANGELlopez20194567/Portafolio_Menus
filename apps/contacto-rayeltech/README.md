# Formulario de contacto Rayel Tech

Página HTML estática y responsive para solicitar nombre, teléfono, correo y un mensaje opcional. Reutiliza la paleta y tipografías de `rayeltech.lat` e incorpora accesos a los menús Classic, Informative, Interactive y Reservations.

Al enviar, el formulario se entrega directamente a `info@rayeltech.lat` a través de FormSubmit, sin abrir el cliente de correo del visitante. La primera vez, FormSubmit envía un correo de activación a esa cuenta; confirme la activación para habilitar la entrega.

## Uso

Abra `index.html` en un navegador o sírvalo desde cualquier hosting estático.

La interfaz está diseñada a una altura de `100dvh`, sin desplazamiento de página, y compacta automáticamente los controles en pantallas bajas.

## Entrega automática

No se incluyen credenciales en el cliente. Si en el futuro se requiere control total del envío, conecte el formulario a un endpoint propio o a un proveedor transaccional desde el servidor.
