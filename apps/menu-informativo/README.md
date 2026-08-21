# Menú informativo — Xuxú

Demo independiente de **Menú informativo** para Xuxú, un restaurante conceptual de cocina yucateca 100% vegetal. Cumple el alcance vigente: carta con descripciones y precios, relato del restaurante, ubicación, horarios y contacto.

## Uso

Sirve el repositorio desde la raíz y abre `/apps/menu-informativo/`. No requiere dependencias ni información privada.

## Personalización

- El contenido de la carta está en `index.html`.
- El carrusel de categorías y la navegación móvil se controlan en `script.js`.
- La identidad visual e ilustración CSS están en `styles.css`; el carrusel y sus ajustes responsive viven en `carousel.css`.
- La tarjeta flotante de alcance reutiliza `packages/floating-quote-card`.
- La portada usa `apps/landing/assets/xuxu-style-editorial.png`, una pieza abstracta basada en el sistema visual de Xuxú.
- El enlace de regreso comparte estilos con Classic Menu desde `packages/back-link/back-link.css`.
- Dirección, horarios y correo son datos ficticios de demostración; deben sustituirse antes de publicar.
