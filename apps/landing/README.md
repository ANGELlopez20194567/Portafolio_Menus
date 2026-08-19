# Landing de RayelTech

Portada pública del portafolio de experiencias digitales para restaurantes.

## Diseño actual

Portafolio editorial de RayelTech con panel de presentación fijo y una galería vertical independiente. La galería usa seis imágenes generadas para el proyecto, navegación con `scroll-snap` y un contador sincronizado mediante `IntersectionObserver`.

En móvil, el encabezado se comprime y permanece visible mientras la galería conserva el desplazamiento vertical por tarjetas. Las anotaciones de Figma “Izquierda columna” y “Derecha columna” no forman parte de la interfaz.

La galería también incluye controles anterior/siguiente, enlaces clicables, una invitación contextual para puntero y navegación con teclado. La primera tarjeta conecta con el ejemplo terminado de Classic Menu en `apps/classic`.

## Escala responsive

En escritorio, la composición usa como referencia el lienzo original de 1920 × 900. La cuadrícula reparte el espacio por porcentaje y una unidad `rem` proporcional al lado limitante escala conjuntamente textos, separaciones, radios e iconos. Así se conserva la relación visual tanto en monitores como en pantallas de laptop. Por debajo de 720 px se restablece una base de 16 px y se aplica la composición móvil independiente.
