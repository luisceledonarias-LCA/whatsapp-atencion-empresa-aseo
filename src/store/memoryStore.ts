/**
 * Almacenamiento simple en disco para el MVP.
 *
 * Guarda cada foto recibida (para el reporte mensual) y un log de mensajes
 * clasificados. Para producción real (multi-empresa, múltiples supervisoras)
 * esto debería reemplazarse por una base de datos (Postgres, etc.), pero
 * para partir con una sola empresa esto es suficiente y no requiere
 * infraestructura adicional.
 */
import fs from "fs";
import path from "path";
import type { Categoria, TipoContenido } from "../types.js";

const DATA_DIR = path.resolve("data");
const FOTOS_DIR = path.join(DATA_DIR, "fotos");
const LOG_PATH = path.join(DATA_DIR, "mensajes.jsonl");

fs.mkdirSync(FOTOS_DIR, { recursive: true });

export interface RegistroMensaje {
  timestamp: number;
  de: string;
  nombrePerfil?: string;
  tipo: string;
  texto?: string;
  categoria: Categoria;
  tipoContenido: TipoContenido;
  escalado: boolean;
  fotoArchivo?: string;
}

export function registrarMensaje(registro: RegistroMensaje): void {
  fs.appendFileSync(LOG_PATH, JSON.stringify(registro) + "\n", "utf-8");
}

/** Guarda una foto de evidencia y devuelve el nombre de archivo usado. */
export function guardarFoto(buffer: Buffer, de: string, mimeType: string): string {
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const nombre = `${de}_${Date.now()}.${extension}`;
  fs.writeFileSync(path.join(FOTOS_DIR, nombre), buffer);
  return nombre;
}

export function leerMensajesDelMes(anio: number, mes: number): RegistroMensaje[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lineas = fs.readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
  return lineas
    .map((l) => JSON.parse(l) as RegistroMensaje)
    .filter((r) => {
      const d = new Date(r.timestamp);
      return d.getFullYear() === anio && d.getMonth() + 1 === mes;
    });
}

export function rutaFoto(nombreArchivo: string): string {
  return path.join(FOTOS_DIR, nombreArchivo);
}
