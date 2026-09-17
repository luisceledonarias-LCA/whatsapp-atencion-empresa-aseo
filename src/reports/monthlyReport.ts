/**
 * Genera un reporte HTML mensual con las fotos de aseos realizados,
 * agrupadas por trabajadora. Uso:
 *
 *   npm run report:mensual -- 2026 9
 *
 * (año y mes; si no se indican, usa el mes calendario anterior al actual).
 *
 * Este script es un punto de partida: se puede programar para correr
 * automáticamente el día 1 de cada mes (cron) y enviar el resultado por
 * correo o WhatsApp a la supervisora.
 */
import fs from "fs";
import path from "path";
import { leerMensajesDelMes, rutaFoto } from "../store/memoryStore.js";

function mesAnterior(): { anio: number; mes: number } {
  const hoy = new Date();
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

function main() {
  const [, , argAnio, argMes] = process.argv;
  const { anio, mes } = argAnio && argMes ? { anio: Number(argAnio), mes: Number(argMes) } : mesAnterior();

  const mensajes = leerMensajesDelMes(anio, mes).filter((m) => m.fotoArchivo);
  const porTrabajadora = new Map<string, typeof mensajes>();
  for (const m of mensajes) {
    const lista = porTrabajadora.get(m.de) ?? [];
    lista.push(m);
    porTrabajadora.set(m.de, lista);
  }

  const secciones = Array.from(porTrabajadora.entries())
    .map(([de, fotos]) => {
      const nombre = fotos[0]?.nombrePerfil ?? de;
      const tarjetas = fotos
        .map((f) => {
          const dataUri = `data:image/jpeg;base64,${fs.readFileSync(rutaFoto(f.fotoArchivo!)).toString("base64")}`;
          const fecha = new Date(f.timestamp).toLocaleString("es-CL");
          return `<figure><img src="${dataUri}" alt="Foto de aseo"><figcaption>${fecha}</figcaption></figure>`;
        })
        .join("\n");
      return `<section><h2>${nombre} (${fotos.length} fotos)</h2><div class="grid">${tarjetas}</div></section>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="UTF-8">
<title>Reporte mensual de aseos — ${mes}/${anio}</title>
<style>
  body{font-family:system-ui,sans-serif; max-width:960px; margin:0 auto; padding:24px; color:#1a1a1a;}
  h1{margin-bottom:4px;} .sub{color:#666; margin-bottom:32px;}
  section{margin-bottom:36px;} h2{border-bottom:2px solid #2F4E8C; padding-bottom:6px;}
  .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; margin-top:12px;}
  figure{margin:0; border:1px solid #ddd; border-radius:8px; overflow:hidden;}
  figure img{width:100%; display:block;}
  figcaption{padding:6px 8px; font-size:.8rem; color:#555;}
</style></head>
<body>
  <h1>Reporte mensual de aseos realizados</h1>
  <p class="sub">${mes}/${anio} — ${mensajes.length} fotos recibidas de ${porTrabajadora.size} trabajadoras</p>
  ${secciones || "<p>No se recibieron fotos este mes.</p>"}
</body></html>`;

  const outDir = path.resolve("data", "reportes");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `reporte-${anio}-${String(mes).padStart(2, "0")}.html`);
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`Reporte generado en: ${outPath}`);
}

main();
