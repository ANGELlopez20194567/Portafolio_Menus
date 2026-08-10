# Portafolio de menús digitales

Colección de demos web para restaurantes. La portada está en `apps/landing`.

La guía SEO independiente está en [docs/SEO.md](docs/SEO.md).

## Dónde va cada cosa

| Tipo de contenido | Ubicación |
| --- | --- |
| Código de cada demo | `apps/<demo>` |
| Componentes, tipos y lógica reutilizable | `packages` |
| Imágenes, iconos, tipografías y multimedia | `assets/shared` o `assets/demos/<demo>` |
| Información humana: producto, arquitectura, despliegue y seguridad | `docs` |
| Reglas de herramientas y pruebas | `config` |
| Despliegue, base de datos y automatizaciones | `infrastructure` |
| Reglas de colaboración del repositorio | `AGENTS.md` |
| Variables locales de ejemplo | `.env.example` |

## SEO de la landing

La landing se encuentra en `apps/landing/index.html`. Las secciones SEO están integradas dentro del HTML para que los buscadores y las personas puedan entender la página sin depender del diseño visual.

| Elemento | Ubicación | Buen uso |
| --- | --- | --- |
| Idioma | Etiqueta `<html lang="es-MX">` | Indica el idioma y la región del contenido. Ajústalo solo si la página se redacta para otra audiencia. |
| Título SEO | `<title>` dentro de `<head>` | Resume la página con su tema principal y marca. Procura que sea específico y legible. |
| Descripción SEO | `<meta name="description">` dentro de `<head>` | Explica el beneficio de la página en una frase natural. Debe corresponder al contenido visible. |
| Instrucción de indexación | `<meta name="robots">` dentro de `<head>` | Mantén `index, follow` en páginas públicas que deban aparecer en buscadores. |
| Encabezado principal | `<h1 id="hero-title">` en la sección `#inicio` | Usa un único `h1` que explique el propósito de la página con la frase clave principal. |
| Navegación | `<nav aria-label="Navegación principal">` en el encabezado | Enlaza a secciones reales y usa textos descriptivos, como “Beneficios” o “Cómo funciona”. |
| Secciones de contenido | `#experiencias`, `#beneficios`, `#proceso` y `#contacto` | Cada sección tiene un `<h2>` que desarrolla una parte concreta de la propuesta. |
| Contenido independiente | Tarjetas y pasos con `<article>` | Úsalo para bloques que pueden entenderse de forma independiente, como cada tipo de menú o beneficio. |
| Preguntas frecuentes | Sección `.faq` con `<details>` | Responde preguntas reales de clientes con respuestas claras. Actualízala cuando aparezcan dudas recurrentes. |
| Texto alternativo | `aria-label` en elementos gráficos y enlaces | Describe el propósito cuando la información no está disponible como texto visible. |

## Palabras clave: cómo usarlas

La frase principal actual es **“menús digitales para restaurantes”**. También se emplean variaciones naturales como “carta digital”, “menú interactivo”, “menú de pedidos” y “menú con reservas”. Estas frases están en el título, la descripción, el `h1`, los encabezados y el texto de las secciones cuando aportan contexto.

Buenas prácticas:

- Elige una intención principal por página. En esta landing es ofrecer diseño de menús digitales para restaurantes.
- Escribe primero para el comensal o dueño del restaurante; incluye la palabra clave solo donde resulte natural.
- Usa variantes y términos relacionados para describir servicios concretos, no repitas siempre la misma frase.
- Mantén coherencia: el título, la meta descripción, el `h1` y el contenido deben hablar del mismo servicio.
- Para una página de un restaurante, añade datos específicos y verificables: tipo de cocina, ciudad, horarios, platillos o zona de entrega, según corresponda.

Evita estas prácticas:

- No llenes el texto, títulos o atributos con repeticiones como “menú digital, menú digital, menú digital”. Esto empeora la lectura y puede considerarse *keyword stuffing*.
- No uses palabras clave de servicios que no se ofrecen, ciudades donde no opera el negocio ni nombres de competidores.
- No uses el mismo título y descripción en todas las páginas; cada URL necesita una intención propia.
- No añadas una etiqueta `<meta name="keywords">`: los buscadores modernos no la usan para posicionar y no sustituye contenido útil.
- No saltes niveles de encabezado por estética. Después de un `h1`, utiliza `h2` para secciones y `h3` para sus elementos internos.

## Antes de publicar

- Reemplaza los textos de ejemplo por información real y comprobable del restaurante.
- Añade una URL canónica (`<link rel="canonical">`) cuando exista el dominio público definitivo.
- Comprueba que cada imagen futura tenga un atributo `alt` descriptivo y que no repita el texto cercano.
- Verifica rendimiento, vista móvil y enlaces antes de publicar.

No se versionan secretos, credenciales, datos personales reales ni archivos `.env` con valores.
