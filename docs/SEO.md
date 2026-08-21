# Guía SEO de la landing

Esta guía explica las etiquetas y secciones SEO de la landing de Mesa Digital.

## Ubicación

La página está en `apps/landing/index.html`.

| Elemento | Dónde se encuentra | Uso correcto |
| --- | --- | --- |
| Idioma | `<html lang="es-MX">` | Indica el idioma y la región de la página. |
| Título | `<title>` dentro de `<head>` | Describe el servicio y la marca en un texto único para cada página. |
| Descripción | `<meta name="description">` dentro de `<head>` | Resume el beneficio principal de forma natural y coherente con el contenido. |
| Robots | `<meta name="robots">` dentro de `<head>` | Usa `index, follow` únicamente en páginas públicas que deban aparecer en buscadores. |
| Título principal | `<h1 id="menu-title">` dentro de `.menu-header` | Debe haber solo un `h1` y explicar el objetivo de la página. |
| Sección de categorías | `.menu-grid` | Presenta las cinco soluciones vigentes bajo el título principal. |
| Bloques de contenido | `<article class="menu-card">` | Cada categoría tiene un nombre único, una descripción y su lista de funciones. |

## Palabras clave

La palabra clave principal de esta landing es **“menús digitales para restaurantes”**. Las categorías de producto se nombran **Classic Menu**, **Menú informativo**, **Menú interactivo**, **Menú de pedidos** y **Menú con reservas**. Sus variaciones naturales en español incluyen “carta digital”, “menú informativo”, “menú interactivo”, “menú de pedidos” y “menú con reservaciones”.

Úsalas en el título, la metadescripción, el `h1`, algunos `h2` y el texto visible solo cuando describan de forma natural el servicio. Todas las partes de la página deben hablar del mismo tema.

No repitas una frase de forma artificial, no menciones servicios o ciudades que no se ofrecen y no uses `<meta name="keywords">`. Esa etiqueta no ayuda al posicionamiento en buscadores modernos.

## Antes de publicar

- Sustituye los textos de ejemplo por información real y comprobable.
- Añade una etiqueta canónica cuando exista el dominio final.
- Añade `alt` descriptivo a imágenes de contenido.
- Revisa la página en móvil, enlaces y velocidad de carga.
