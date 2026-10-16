// Convierte el contenido exportado de backfocus.cl (WordPress) en contenido limpio para el sitio.
// Entrada: _importado/sitio.json y _importado/imagenes/  ·  Salida: contenido/textos.json y contenido/img/
// Uso (solo una vez, o cuando se vuelva a exportar desde WordPress): node herramientas/importar.mjs
import fs from "node:fs";
import path from "node:path";

const base = path.join(import.meta.dirname, "..");
const origen = path.join(base, "_importado");
const wp = JSON.parse(fs.readFileSync(path.join(origen, "sitio.json"), "utf8"));
fs.mkdirSync(path.join(base, "contenido", "img"), { recursive: true });

const entidades = { "&#8230;": "…", "&#8220;": "“", "&#8221;": "”", "&#8216;": "‘", "&#8217;": "’", "&#8211;": "–", "&#8212;": "—", "&#171;": "«", "&#187;": "»", "&nbsp;": " ", "&#038;": "&", "&amp;": "&", "&quot;": '"', "&#8243;": "″" };
const decodificar = (s) => s.replace(/&#?\w+;/g, (e) => entidades[e] ?? e);
const sinEtiquetas = (s) => decodificar(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
// Deja solo negritas, cursivas, enlaces y saltos de línea
const limpiarEnLinea = (s) =>
  decodificar(
    s
      .replace(/<(\/?)(strong|b)\b[^>]*>/g, "<$1strong>")
      .replace(/<(\/?)(em|i)\b[^>]*>/g, "<$1em>")
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>/g, '<a href="$1">')
      .replace(/<br\s*\/?>/g, "<br>")
      .replace(/<(?!\/?(strong|em|a|br)\b)[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();

const nombreLocal = (url) => url.split("/uploads/")[1].replace(/-\d+x\d+(\.\w+)$/, "$1").replace(/\//g, "_");
const imagenesUsadas = new Set();
const usar = (url) => {
  const n = nombreLocal(url);
  if (!fs.existsSync(path.join(origen, "imagenes", n))) throw new Error("Falta la imagen " + n);
  imagenesUsadas.add(n);
  return n;
};

const categorias = Object.fromEntries(wp.cats.map((c) => [c.id, c.name]));
const medios = Object.fromEntries(wp.media.map((m) => [m.id, m]));

function convertir(html) {
  // Fichas en orden: estilos (para detectar pies de foto en cursiva), títulos, párrafos e imágenes
  const fichas = [...html.matchAll(/<style>([\s\S]*?)<\/style>|<(h[1-6])\b[^>]*>([\s\S]*?)<\/\2>|<p\b([^>]*)>([\s\S]*?)<\/p>|<img\b([^>]*)>/g)];
  const bloques = [];
  let estiloAnterior = "";
  for (const f of fichas) {
    if (f[1] !== undefined) { estiloAnterior = f[1]; continue; }
    const estilo = estiloAnterior;
    estiloAnterior = "";
    if (f[2]) {
      const texto = sinEtiquetas(f[3]);
      if (texto) bloques.push({ tipo: "titulo", nivel: Number(f[2][1]), texto });
    } else if (f[5] !== undefined) {
      const contenido = limpiarEnLinea(f[5]);
      const texto = sinEtiquetas(f[5]);
      if (!texto) continue;
      if (/has-text-color/.test(f[4])) bloques.push({ tipo: "destacado", texto: texto.replace(/^…\s*/, "…") });
      else if (/font-style:\s*italic/.test(estilo) && texto.length < 260) bloques.push({ tipo: "pie", html: contenido });
      else if (/^<strong>[\s\S]*<\/strong>$/.test(contenido) && !/<\/strong>[\s\S]+<strong>/.test(contenido)) bloques.push({ tipo: "pregunta", texto });
      else bloques.push({ tipo: "parrafo", html: contenido });
    } else if (f[6]) {
      const at = (n) => (f[6].match(new RegExp(`\\b${n}="([^"]*)"`)) || [])[1];
      const src = at("src");
      if (!src || !src.includes("/wp-content/uploads/")) continue;
      bloques.push({ tipo: "imagen", src: usar(src), alt: decodificar(at("alt") || ""), ancho: Number(at("width")) || null, alto: Number(at("height")) || null });
    }
  }
  // Une cada pie de foto con la imagen que tiene justo antes
  const salida = [];
  for (const b of bloques) {
    const previo = salida.at(-1);
    if (b.tipo === "pie" && previo?.tipo === "imagen" && !previo.pie) previo.pie = b.html;
    else if (b.tipo === "pie") salida.push({ tipo: "parrafo", html: `<em>${b.html}</em>` });
    else if (b.tipo === "imagen" && previo?.tipo === "imagen" && previo.src === b.src) continue; // misma foto dos veces seguidas
    else salida.push(b);
  }
  return salida;
}

const textos = wp.posts.map((p) => {
  const bloques = convertir(p.content.rendered);
  // Todo lo anterior a la firma («Por…», «De…», «Texto y fotos por…») es cabecera: título y bajada
  const textoDe = (b) => b.texto ?? sinEtiquetas(b.html ?? "");
  const iFirma = bloques.findIndex((b) => (b.tipo === "parrafo" || b.tipo === "destacado") && /^(Por|De|Texto y fotos por)\s/.test(textoDe(b)));
  const cabecera = iFirma >= 0 ? bloques.slice(0, iFirma) : [];
  const firma = iFirma >= 0 ? textoDe(bloques[iFirma]) : "";
  const cuerpo = iFirma >= 0 ? bloques.slice(iFirma + 1) : bloques;
  const portada = medios[p.featured_media];
  return {
    slug: p.slug,
    titulo: sinEtiquetas(p.title.rendered),
    fecha: p.date,
    categorias: p.categories.map((c) => categorias[c]).filter(Boolean),
    resumen: sinEtiquetas(p.excerpt.rendered).replace(/\s*\[…\]$/, "…"),
    cabecera: cabecera.filter((b) => b.tipo === "titulo" || b.tipo === "parrafo").map(textoDe),
    firma,
    portada: portada ? { src: usar(portada.source_url), alt: decodificar(portada.alt_text || ""), ancho: portada.media_details?.width, alto: portada.media_details?.height } : null,
    bloques: cuerpo,
  };
});

for (const n of imagenesUsadas) fs.copyFileSync(path.join(origen, "imagenes", n), path.join(base, "contenido", "img", n));
fs.writeFileSync(path.join(base, "contenido", "textos.json"), JSON.stringify(textos, null, 2));

for (const t of textos) {
  const cuenta = (tipo) => t.bloques.filter((b) => b.tipo === tipo).length;
  console.log(`${t.slug}: ${t.bloques.length} bloques · ${cuenta("imagen")} img · ${cuenta("destacado")} destacados · ${cuenta("pregunta")} preguntas · firma «${t.firma}» · cabecera ${JSON.stringify(t.cabecera)}`);
}
console.log(`${imagenesUsadas.size} imágenes copiadas a contenido/img`);
