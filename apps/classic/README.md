# Classic Menu

Ejemplo de carta digital italiana enfocada en lectura inmediata, sin pantalla de portada, con jerarquía clara de categorías, fotografías editoriales, precios y navegación responsive.

## Uso

Sirve el repositorio desde su raíz con cualquier servidor estático y abre `/apps/classic/`. La tarjeta comercial se importa desde `packages/floating-quote-card` para mantener su diseño y comportamiento compartidos con futuras demos. Incluye el alcance del plan y el tipo de restaurante recomendado mediante los atributos `includes` e `ideal-for`.

## Personalización

- Los platillos están organizados en `script.js`.
- Las fotografías de categoría viven en `assets/` y se asignan desde `categoryImages` en `script.js`.
- Colores, tipografías y responsive están en `styles.css`.
- El logo tipográfico “Italian Restaurant” está construido con HTML/CSS y no depende de una imagen externa.
