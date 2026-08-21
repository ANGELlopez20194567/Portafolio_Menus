# Floating quote card

Componente reutilizable para todas las demos del portafolio. Permanece visible durante el scroll, se puede arrastrar y minimizar.

```html
<script type="module" src="../../packages/floating-quote-card/quote-card.js"></script>
<quote-card
  title="Classic Menu"
  description="Descripción comercial"
  includes="Categorías,Precios,Diseño responsive"
  ideal-for="Restaurantes con una carta breve y visual"
  href="#cotizar">
</quote-card>
```

## Contenido obligatorio para nuevas demos

Cada tarjeta debe declarar `label`, `title`, `description`, `includes`, `ideal-for`, `cta` y `href`.

- `description`: explica de forma breve el valor del plan o menú.
- `includes`: lista separada por comas de las funciones o entregables del plan.
- `ideal-for`: describe los tipos de restaurante para los que resulta adecuado.

El atributo anterior `features` sigue funcionando como alternativa de compatibilidad, pero las nuevas demos deben usar `includes`.
