// Genera el sitio estático en /sitio a partir de /contenido y /plantilla. Sin dependencias.
// Uso: node herramientas/construir.mjs
// Las direcciones son las mismas de backfocus.cl (/<texto>/, /about/, /contacto/, /category/<sección>/).
import fs from "node:fs";
import path from "node:path";

const base = path.join(import.meta.dirname, "..");
const S = JSON.parse(fs.readFileSync(path.join(base, "contenido", "sitio.json"), "utf8"));
const importados = JSON.parse(fs.readFileSync(path.join(base, "contenido", "textos.json"), "utf8"));
const salida = path.join(base, "sitio");
const N = S.numeros[0];

fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(path.join(salida, "img"), { recursive: true });
for (const f of fs.readdirSync(path.join(base, "contenido", "img"))) fs.copyFileSync(path.join(base, "contenido", "img", f), path.join(salida, "img", f));
const menuCss = fs.readFileSync(path.join(base, "plantilla", "menu.css"), "utf8");
fs.writeFileSync(path.join(salida, "estilos.css"), fs.readFileSync(path.join(base, "plantilla", "estilos.css"), "utf8") + "\n" + menuCss);
// Páginas con diseño propio, copiadas tal cual: paginas/workshop/ → /workshop/
if (fs.existsSync(path.join(base, "paginas"))) fs.cpSync(path.join(base, "paginas"), salida, { recursive: true });

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Textos en el orden del impreso, con los datos editoriales de sitio.json
const textos = Object.entries(S.textos)
  .map(([slug, meta]) => ({ ...importados.find((t) => t.slug === slug), ...meta, slug, url: `/${slug}/` }))
  // Sin portada en WordPress (la editorial): se usa la primera foto del texto
  .map((t) => ({ ...t, portada: t.portada ?? t.bloques.find((b) => b.tipo === "imagen") ?? null }))
  .sort((a, b) => a.pagina - b.pagina);
const seccionDe = (t) => S.secciones[t.seccion];

// ---------- Piezas comunes ----------
const menu = [["/", "Inicio"], ["/textos/", "Textos"], ["/numero-01/", "Número 01"], ["/workshop/", "Workshop"], ["/about/", "Nosotros"], ["/contacto/", "Contacto"]];

// Cabecera con el menú del sitio (también se inserta en las páginas de /paginas).
// En celular el menú se pliega tras un botón de hamburguesa; sin JavaScript queda visible como lista.
const scriptMenu = `<script>
(() => {
  const raiz = document.documentElement;
  raiz.classList.add("bf-js");
  const boton = document.querySelector(".menu-boton");
  const menu = document.getElementById("menu-principal");
  if (!boton || !menu) return;
  const poner = (abierto) => {
    raiz.classList.toggle("menu-abierto", abierto);
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  };
  boton.addEventListener("click", () => poner(!raiz.classList.contains("menu-abierto")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) poner(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && raiz.classList.contains("menu-abierto")) { poner(false); boton.focus(); } });
  matchMedia("(min-width: 761px)").addEventListener("change", () => poner(false));
})();
</script>`;
const cabecera = (ruta) => `<header class="cabecera">
  <div class="envoltura">
    <a class="marca" href="/">${esc(S.nombre)}<small>${esc(S.bajada)}</small></a>
    <button class="menu-boton" type="button" aria-expanded="false" aria-controls="menu-principal" aria-label="Abrir menú"><span></span><span></span></button>
    <nav class="menu" id="menu-principal" aria-label="Principal">
      ${menu.map(([href, nombre]) => `<a href="${href}"${ruta === href ? ' aria-current="page"' : ""}>${nombre}</a>`).join("\n      ")}
    </nav>
  </div>
</header>
${scriptMenu}`;

function documento({ titulo, descripcion, ruta, imagen, cuerpo, script = "" }) {
  const tituloCompleto = ruta === "/" ? `${S.nombre} · ${S.bajada}` : `${titulo} · ${S.nombre}`;
  const og = imagen ? `${S.dominio}/img/${imagen}` : `${S.dominio}/img/${N.portada}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${S.dominio}${ruta}">
<meta property="og:type" content="${ruta === "/" ? "website" : "article"}">
<meta property="og:site_name" content="${esc(S.nombre)} Zine">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${S.dominio}${ruta}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#131313">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@300;400;700;900&display=swap">
<link rel="stylesheet" href="/estilos.css">
</head>
<body>
<a class="saltar" href="#contenido">Saltar al contenido</a>
${cabecera(ruta)}
<main id="contenido">
${cuerpo}
</main>
<footer class="pie">
  <div class="envoltura">
    <div>
      <a class="marca" href="/">${esc(S.nombre)}</a>
      <p>${esc(S.descripcion)}</p>
    </div>
    <div>
      <h2>Secciones</h2>
      <ul>${Object.values(S.secciones).map((s) => `<li><a href="/category/${s.slug}/">${esc(s.plural)}</a></li>`).join("")}</ul>
    </div>
    <div>
      <h2>Zine</h2>
      <ul>
        <li><a href="/numero-01/">Número 01 · ${esc(N.fecha)}</a></li>
        <li><a href="/workshop/">Workshop</a></li>
        <li><a href="/about/">Nosotros</a></li>
        <li><a href="/contacto/">Contacto</a></li>
        ${S.contacto.instagram ? `<li><a href="https://instagram.com/${esc(S.contacto.instagram.replace(/^@/, ""))}" rel="me">Instagram</a></li>` : ""}
      </ul>
    </div>
    <p class="legal">© ${new Date().getFullYear()} ${esc(S.nombre)} Zine. Hecho en Pucón y Santiago de Chile. Los textos y fotografías pertenecen a sus autores.</p>
  </div>
</footer>
${script}
</body>
</html>
`;
}

function escribir(ruta, html) {
  const destino = path.join(salida, ruta, ruta.endsWith(".html") ? "" : "index.html");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}

const img = (b, extra = "") =>
  `<img src="/img/${esc(b.src)}" alt="${esc(b.alt)}"${b.ancho ? ` width="${b.ancho}" height="${b.alto}"` : ""} loading="lazy" decoding="async"${extra}>`;
const figura = (b, cls = "") => `<figure${cls ? ` class="${cls}"` : ""}>${img(b)}${b.pie ? `<figcaption>${b.pie}</figcaption>` : ""}</figure>`;
const etiqueta = (t) => `<a class="etiqueta" href="/category/${seccionDe(t).slug}/">${esc(t.seccion)}</a>`;
const pagImpresa = (t) => `<span class="pagina-impresa">${esc(S.nombre)} #${N.numero} · pág. ${t.pagina}</span>`;

const tarjeta = (t, nivel = 3) => `
      <article class="tarjeta">
        <a class="foto" href="${t.url}" tabindex="-1" aria-hidden="true">${t.portada ? img({ ...t.portada, alt: "" }) : ""}</a>
        <div class="meta">${etiqueta(t)} ${pagImpresa(t)}</div>
        <h${nivel}><a href="${t.url}">${esc(t.titulo)}</a></h${nivel}>
        <p class="bajada">${esc(t.bajada)}</p>
        <p class="autor">${t.seccion === "Entrevista" ? "Por" : "De"} ${esc(t.autor)}</p>
      </article>`;

const indice = () => `
        <nav class="indice" aria-label="Contenidos del número ${N.numero}">
          <h2>Contenidos</h2>
          <ol>
            ${textos.map((t) => `<li><a href="${t.url}"><span class="pag">${t.pagina}</span><span><span class="nom">${esc(t.titulo)}</span><span class="por">${esc(t.seccion)} · ${esc(t.autor)}</span></span></a></li>`).join("\n            ")}
          </ol>
        </nav>`;

// ---------- Inicio ----------
const editorial = textos.find((t) => t.seccion === "Editorial");
const sospecha = textos.find((t) => t.slug === "la-sospecha-permanente");
escribir("/", documento({
  titulo: `${S.nombre} · ${S.bajada}`,
  descripcion: S.descripcion,
  ruta: "/",
  cuerpo: `
<section class="numero-portada">
  <div class="envoltura">
    <a href="/numero-01/"><img class="objeto" src="/img/${N.portada}" alt="Portada de ${esc(S.nombre)} #${N.numero}: una gaviota en vuelo, en blanco y negro, con la lista de invitados y textos." width="1217" height="1585"></a>
    <div>
      <p class="antetitulo">Número ${N.numero} · ${esc(N.fecha)} · ${N.paginas} páginas</p>
      <h1>${esc(editorial.titulo)}</h1>
      <p class="entrada">${esc(S.descripcion)}</p>
      <div class="acciones">
        <a class="boton lleno" href="${editorial.url}">Leer el editorial</a>
        <a class="boton" href="/numero-01/#conseguir">Conseguir el #${N.numero}</a>
      </div>
      ${indice()}
    </div>
  </div>
</section>

<section class="aviso-workshop" aria-label="Workshop">
  <div class="envoltura">
    <a href="/workshop/">
      <span class="etiqueta">Workshop gratuito</span>
      <span class="aw-titulo">Fotografía de protestas y marchas</span>
      <span class="aw-datos">Miércoles 25 y sábado 28 de noviembre · USACH, Santiago · En colaboración con el Departamento de las Culturas y las Artes, USACH</span>
      <span class="aw-ir">Ver programa e inscripciones →</span>
    </a>
  </div>
</section>

<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h2>Textos del número ${N.numero}</h2><p>Ensayos, artículos y una entrevista. Todos se pueden leer completos aquí.</p></div>
    <div class="rejilla">${textos.map((t) => tarjeta(t)).join("")}
    </div>
  </div>
</section>

<section class="banda" aria-label="Cita">
  <div class="envoltura">
    <blockquote>Tal vez la pregunta ya no sea si una imagen fue creada por una inteligencia artificial, sino por qué una fotografía real comenzó a parecernos artificial.</blockquote>
    <p>${esc(sospecha.autor)}, en <a href="${sospecha.url}">${esc(sospecha.titulo)}</a></p>
  </div>
</section>

<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h2>Qué es BackFocus</h2><p><a href="/about/">Conoce al equipo</a></p></div>
    <div class="que-es">
      <p class="grande">${esc(S.descripcion)}</p>
      <div>
        <p>${esc(S.descripcion2)}</p>
        <p>${esc(S.descripcion3)}</p>
      </div>
    </div>
  </div>
</section>`,
}));

// ---------- Artículos ----------
function cuerpoArticulo(bloques) {
  const partes = [];
  let primerParrafo = true;
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i];
    if (b.tipo === "imagen") {
      // Fotos seguidas forman una galería
      const grupo = [b];
      while (bloques[i + 1]?.tipo === "imagen") grupo.push(bloques[++i]);
      if (grupo.length === 1) partes.push(figura(b));
      else partes.push(`<div class="galeria">${grupo.map((g) => figura(g, g.ancho && g.ancho > g.alto * 1.15 ? "ancha" : "")).join("")}</div>`);
    } else if (b.tipo === "parrafo") {
      // Los saltos de línea dentro de un párrafo de WordPress pasan a ser párrafos
      const trozos = b.html.split(/<br>/).map((x) => x.trim()).filter(Boolean);
      trozos.forEach((x, k) => partes.push(`<p${primerParrafo && k === 0 ? ' class="inicial"' : ""}>${x}</p>`));
      primerParrafo = false;
    } else if (b.tipo === "pregunta") partes.push(`<p class="pregunta">${esc(b.texto)}</p>`);
    else if (b.tipo === "destacado") partes.push(`<blockquote class="destacado"><p>${esc(b.texto)}</p></blockquote>`);
    else if (b.tipo === "titulo") partes.push(`<h2>${esc(b.texto)}</h2>`);
  }
  return partes.join("\n  ");
}

const copiarScript = `<script>
  document.querySelector(".copiar")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(location.href); b.textContent = "Enlace copiado"; }
    catch { b.textContent = location.href; }
  });
</script>`;

textos.forEach((t, i) => {
  const bloques = [...t.bloques];
  // La primera foto del texto abre el artículo; si no hay, se usa la portada
  const principal = bloques[0]?.tipo === "imagen" ? bloques.shift() : t.portada;
  const anterior = textos[i - 1];
  const siguiente = textos[i + 1] ?? textos[0];
  escribir(t.url, documento({
    titulo: t.titulo,
    descripcion: `${t.bajada}. ${t.seccion} de ${t.autor} en ${S.nombre} #${N.numero}.`,
    ruta: t.url,
    imagen: t.portada?.src,
    script: copiarScript,
    cuerpo: `
<article>
  <header class="articulo-cabecera">
    <div class="envoltura">
      <div class="meta">${etiqueta(t)} ${pagImpresa(t)}</div>
      <h1>${esc(t.titulo)}</h1>
      <p class="bajada">${esc(t.bajada)}</p>
      <p class="firma">${esc(t.firma || `Por ${t.autor}`)}</p>
    </div>
  </header>
  ${principal ? `<figure class="foto-principal">${img(principal).replace(' loading="lazy"', ' fetchpriority="high"')}${principal.pie ? `<figcaption>${principal.pie}</figcaption>` : ""}</figure>` : ""}
  <div class="cuerpo">
  ${cuerpoArticulo(bloques)}
  </div>
  <footer class="articulo-pie">
    <div class="nota-impresa">
      <p>Este texto se publicó en ${esc(S.nombre)} #${N.numero}, ${esc(N.fecha)}, desde la página ${t.pagina}. <a href="/numero-01/#conseguir">Consigue el impreso</a>.</p>
      <button class="copiar" type="button">Copiar enlace</button>
    </div>
    <nav class="siguientes" aria-label="Más textos">
      ${anterior ? `<a href="${anterior.url}"><span class="dir">← Anterior</span><span class="nom">${esc(anterior.titulo)}</span></a>` : "<span></span>"}
      <a href="${siguiente.url}"><span class="dir">Siguiente →</span><span class="nom">${esc(siguiente.titulo)}</span></a>
    </nav>
  </footer>
</article>`,
  }));
});

// ---------- Listados: todos los textos y cada sección ----------
function listado(ruta, titulo, lista, intro, actual) {
  escribir(ruta, documento({
    titulo,
    descripcion: intro,
    ruta,
    cuerpo: `
<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h1>${esc(titulo)}</h1><p>${esc(intro)}</p></div>
    <nav class="filtros" aria-label="Secciones">
      <a href="/textos/"${actual === "todos" ? ' aria-current="page"' : ""}>Todos</a>
      ${Object.entries(S.secciones).map(([, s]) => `<a href="/category/${s.slug}/"${actual === s.slug ? ' aria-current="page"' : ""}>${esc(s.plural)}</a>`).join("\n      ")}
    </nav>
    <div class="rejilla" style="margin-top:2.5rem">${lista.map((t) => tarjeta(t, 2)).join("")}
    </div>
  </div>
</section>`,
  }));
}
listado("/textos/", "Textos", textos, `Todos los textos de ${S.nombre} #${N.numero}, en el orden del impreso.`, "todos");
for (const [nombre, s] of Object.entries(S.secciones)) {
  const lista = textos.filter((t) => t.seccion === nombre);
  listado(`/category/${s.slug}/`, s.plural, lista, `${lista.length} ${lista.length === 1 ? "texto" : "textos"} en ${s.plural.toLowerCase()}.`, s.slug);
}
// En WordPress existía la categoría «BackFocus» para los textos del equipo
listado("/category/backfocus/", "Textos del equipo", textos.filter((t) => !t.invitado), "Los textos escritos por el equipo de BackFocus.", "");

// ---------- Número 01 ----------
const conseguir = N.precio || N.dondeComprar
  ? `${N.precio ? `<p class="caja" style="font-size:var(--t-xl);font-weight:900">${esc(N.precio)}</p>` : ""}${N.dondeComprar ? `<p style="margin-top:.8rem">${esc(N.dondeComprar)}</p>` : ""}`
  : `<p>Escríbenos para conseguir tu ejemplar impreso. <a href="/contacto/">Ir a contacto</a>.</p>`;
escribir("/numero-01/", documento({
  titulo: `Número ${N.numero}`,
  descripcion: `${S.nombre} #${N.numero}, ${N.fecha}. ${N.paginas} páginas sobre fotografía, imagen y nuevas tecnologías.`,
  ruta: "/numero-01/",
  cuerpo: `
<section class="seccion numero-detalle">
  <div class="envoltura">
    <div>
      <div class="seccion-titulo"><h1>Número ${N.numero}</h1><p>${esc(N.fecha)} · ${N.paginas} páginas</p></div>
      <div class="tapas">
        <figure><img class="objeto" src="/img/${N.portada}" alt="Portada de ${esc(S.nombre)} #${N.numero}." width="1217" height="1585"></figure>
        <figure><img class="objeto" src="/img/${N.contraportada}" alt="Contraportada de ${esc(S.nombre)} #${N.numero}." width="1217" height="1585" loading="lazy"></figure>
      </div>
      <p class="pagina-impresa" style="margin-top:1rem">${esc(N.creditoPortada)}</p>
      ${indice()}
    </div>
    <div class="ficha">
      <div class="cajas-oscuras">
        <h3>Invitados:</h3>
        <div class="cajas">${N.invitados.map((n) => `<span class="caja">${esc(n)}</span>`).join("")}</div>
      </div>
      <div id="conseguir">
        <h2>Consigue el impreso</h2>
        ${conseguir}
      </div>
      <div>
        <h2>Agradecimientos</h2>
        <p>${esc(N.agradecimientos)}</p>
      </div>
      <div>
        <h2>Colofón</h2>
        <p>${esc(N.colofon)}</p>
      </div>
    </div>
  </div>
</section>`,
}));

// ---------- Nosotros (/about/) y contacto ----------
escribir("/about/", documento({
  titulo: "Nosotros",
  descripcion: S.descripcion,
  ruta: "/about/",
  cuerpo: `
<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h1>Nosotros</h1><p>${esc(S.bajada)}</p></div>
    <div class="que-es">
      <p class="grande">${esc(S.descripcion)}</p>
      <div><p>${esc(S.descripcion2)}</p><p>${esc(S.descripcion3)}</p></div>
    </div>
  </div>
</section>
<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h2>Equipo</h2></div>
    <div class="equipo">
      ${S.equipo.map((p) => `<div class="persona">${p.foto ? `<img class="retrato" src="/img/${esc(p.foto)}" alt="Retrato de ${esc(p.nombre)}" width="96" height="128" loading="lazy" style="object-position:${esc(p.encuadre || "50% 30%")}">` : ""}<h3>${esc(p.nombre)}</h3><p>${esc(p.bio)}</p></div>`).join("\n      ")}
    </div>
  </div>
</section>`,
}));

const datos = [
  S.contacto.correo && ["Correo", `<a href="mailto:${esc(S.contacto.correo)}">${esc(S.contacto.correo)}</a>`],
  S.contacto.instagram && ["Instagram", `<a href="https://instagram.com/${esc(S.contacto.instagram.replace(/^@/, ""))}">@${esc(S.contacto.instagram.replace(/^@/, ""))}</a>`],
].filter(Boolean);
escribir("/contacto/", documento({
  titulo: "Contacto",
  descripcion: S.contacto.texto,
  ruta: "/contacto/",
  cuerpo: `
<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h1>Contacto</h1></div>
  </div>
  <div class="texto-simple">
    <p class="grande" style="font:300 var(--t-l)/1.35 var(--display);color:var(--tinta)">${esc(S.contacto.texto)}</p>
    ${datos.length ? `<dl class="contacto-datos">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : `<p>Muy pronto publicaremos aquí nuestro correo y nuestra cuenta de Instagram.</p>`}
  </div>
</section>`,
}));

// ---------- 404, favicon, robots y sitemap ----------
escribir("/404.html", documento({
  titulo: "Página no encontrada",
  descripcion: "Esta página no existe.",
  ruta: "/404.html",
  cuerpo: `
<section class="seccion">
  <div class="envoltura">
    <div class="seccion-titulo"><h1>Esta página no existe</h1></div>
    <p>Puede que el enlace esté mal escrito o que el texto se haya movido. <a href="/textos/">Ver todos los textos</a>.</p>
  </div>
</section>`,
}));
fs.writeFileSync(path.join(salida, "favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#161616"/><text x="32" y="46" font-family="Roboto Slab, Georgia, serif" font-weight="900" font-size="40" text-anchor="middle" fill="#e6e6e4">B</text></svg>`);
fs.writeFileSync(path.join(salida, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${S.dominio}/sitemap.xml\n`);
const rutas = ["/", "/textos/", "/numero-01/", "/workshop/", "/about/", "/contacto/", ...textos.map((t) => t.url), ...Object.values(S.secciones).map((s) => `/category/${s.slug}/`)];
fs.writeFileSync(path.join(salida, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutas.map((r) => `  <url><loc>${S.dominio}${r}</loc></url>`).join("\n")}\n</urlset>\n`);

const faltan = [!S.contacto.correo && "correo", !S.contacto.instagram && "instagram", !N.precio && "precio", !N.dondeComprar && "dónde comprar"].filter(Boolean);
console.log(`Sitio generado en /sitio: ${rutas.length} páginas.${faltan.length ? ` Faltan datos en contenido/sitio.json: ${faltan.join(", ")}.` : ""}`);

// ---------- Menú del sitio en las páginas con diseño propio ----------
// Cada página de /paginas marca dónde va el menú con <!-- menu-backfocus -->. Como esas páginas no cargan
// estilos.css, el menú lleva sus propios estilos, siempre en claro.
const estiloMenu = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@300;900&display=swap">
<style>
/* Colores y tipografías del menú dentro de la página del workshop (siempre en claro) */
.bf-sitio{--papel:#f4f4f2;--tinta:#161616;--linea:#bdbdba;--display:"Roboto Slab",Rockwell,Georgia,serif;--texto:"Helvetica Neue",Helvetica,Arial,sans-serif;--t-xs:.8125rem;--t-s:.9375rem;--ancho:1240px;--gutter-izq:max(16px,env(safe-area-inset-left,0px));--gutter-der:max(16px,env(safe-area-inset-right,0px));font-family:var(--texto);filter:none!important;position:relative;z-index:60}
.bf-sitio .marca small{font-family:var(--texto)}
/* En el workshop el menú va dentro de .bf-sitio: es ese contenedor el que queda pegado arriba en celular */
@media (max-width:760px){.bf-sitio{position:sticky;top:env(safe-area-inset-top,0px)}.bf-sitio .cabecera{position:relative}}
${menuCss}
</style>`;
for (const carpeta of fs.existsSync(path.join(base, "paginas")) ? fs.readdirSync(path.join(base, "paginas")) : []) {
  const archivo = path.join(salida, carpeta, "index.html");
  if (!fs.existsSync(archivo)) continue;
  const html = fs.readFileSync(archivo, "utf8");
  if (!html.includes("<!-- menu-backfocus -->")) { console.warn(`Aviso: paginas/${carpeta}/index.html no tiene <!-- menu-backfocus -->`); continue; }
  fs.writeFileSync(archivo, html.replace("<!-- menu-backfocus -->", `${estiloMenu}
<div class="bf-sitio">${cabecera(`/${carpeta}/`)}</div>`));
}
