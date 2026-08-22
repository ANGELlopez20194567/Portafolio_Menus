# Portfolio shell

Base CSS compartida por `apps/landing` y `apps/borrador`.

Cada aplicación carga `portfolio-shell.css` antes de su propio `styles.css`. Las diferencias visuales o de comportamiento deben permanecer en el CSS de la aplicación, mientras que los cambios estructurales comunes se realizan en este paquete.

La variable `--counter-font` permite cambiar la tipografía del contador sin duplicar la regla completa.
