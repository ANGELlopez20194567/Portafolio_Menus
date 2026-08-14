# Borrador de pruebas

Este directorio es un espacio aislado para probar ideas de diseño, componentes y estructura antes de integrarlos en un menú definitivo.

No se debe usar como demo final ni como base de producción. Cuando una prueba esté lista, mueve o replica solo las partes necesarias en el proyecto correspondiente dentro de `apps/`.

## Prueba actual

Portafolio editorial de RayelTech con panel de presentación fijo y una galería vertical independiente. La galería usa seis imágenes generadas para el proyecto, navegación con `scroll-snap` y un contador sincronizado mediante `IntersectionObserver`.

En móvil, el encabezado se comprime y permanece visible mientras la galería conserva el desplazamiento vertical por tarjetas. Las anotaciones de Figma “Izquierda columna” y “Derecha columna” no forman parte de la interfaz.

La galería también incluye controles anterior/siguiente, enlaces clicables, una invitación contextual para puntero y navegación con teclado. El panel de presentación incorpora un acceso a cotización y enlaces sociales.
