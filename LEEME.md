# Sitio web de BackFocus

Sitio estático del fanzine BackFocus: portada del número, los textos completos con sus fotos, secciones, equipo y contacto. Mantiene las mismas direcciones que backfocus.cl (`/la-sospecha-permanente/`, `/about/`, `/contacto/`, `/category/ensayos/`…), así que los enlaces ya compartidos siguen funcionando.

## Cómo está armado

- `contenido/sitio.json`: datos del zine. Aquí van el **correo**, el **Instagram**, el **precio** y **dónde comprar** (hoy vacíos), el equipo, el número y los datos de cada texto (título, bajada, autor, sección y página del impreso).
- `contenido/textos.json`: los textos completos, importados desde WordPress.
- `contenido/img/`: las fotos.
- `plantilla/estilos.css`: el diseño.
- `plantilla/menu.css`: la cabecera y el menú (en celular, menú de hamburguesa a pantalla completa). Se usa en todo el sitio y en el workshop.
- `herramientas/construir.mjs`: genera el sitio en `sitio/`.
- Formulario de contacto: lo envía FormSubmit (formsubmit.co) al correo `contacto.formulario` de `sitio.json`. La primera vez hay que activarlo desde el correo que manda FormSubmit.
- `paginas/workshop/`: la landing del Workshop de Fotografía de Protestas (diseño propio). Se publica tal cual en `/workshop/`.
- `herramientas/importar.mjs`: vuelve a convertir una exportación de WordPress (`_importado/`) en `contenido/`.

## Ver el sitio en tu computador

```
node herramientas/construir.mjs
node herramientas/servidor.mjs
```

Luego abre http://localhost:5180

## Publicar en Render

Render lee `render.yaml`: ejecuta `node herramientas/construir.mjs` y publica la carpeta `sitio/`. Cada vez que subas cambios a GitHub, Render vuelve a publicar solo.
