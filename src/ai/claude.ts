import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

export const claude = new Anthropic({ apiKey: config.anthropic.apiKey });

/**
 * Modelo usado para clasificar los mensajes. Es una tarea acotada
 * (clasificación + respuesta corta), así que se usa Haiku 4.5: es ~5x más
 * barato que Opus 5 y debería rendir igual de bien para esto.
 *
 * Si notas errores de clasificación (sobre todo mensajes que deberían ser
 * "urgente" y no lo detecta bien), sube un escalón a "claude-sonnet-5"
 * antes de llegar a "claude-opus-5".
 */
export const MODELO = "claude-haiku-4-5";
