# Borrador de pruebas

Este directorio es un espacio aislado para probar ideas de diseño, componentes y estructura antes de integrarlos en un menú definitivo.

No se debe usar como demo final ni como base de producción. Cuando una prueba esté lista, mueve o replica solo las partes necesarias en el proyecto correspondiente dentro de `apps/`.

## Prueba actual

Portafolio editorial de RayelTech con panel de presentación fijo y una galería vertical independiente. La galería usa seis imágenes generadas para el proyecto, navegación con `scroll-snap` y un contador sincronizado mediante `IntersectionObserver`.

En móvil, el encabezado se comprime y permanece visible mientras la galería conserva el desplazamiento vertical por tarjetas. Las anotaciones de Figma “Izquierda columna” y “Derecha columna” no forman parte de la interfaz.

La galería también incluye controles anterior/siguiente, enlaces clicables, una invitación contextual para puntero y navegación con teclado. El panel de presentación incorpora un acceso a cotización y enlaces sociales.

## Escala responsive

En escritorio, la composición usa como referencia el lienzo original de 1920 × 900. La cuadrícula reparte el espacio por porcentaje y una unidad `rem` proporcional al lado limitante escala conjuntamente textos, separaciones, radios e iconos. Así se conserva la relación visual tanto en monitores como en pantallas de laptop. Por debajo de 720 px se restablece una base de 16 px y se aplica la composición móvil independiente.
