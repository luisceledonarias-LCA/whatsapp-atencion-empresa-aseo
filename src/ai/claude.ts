import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

export const claude = new Anthropic({ apiKey: config.anthropic.apiKey });

/** Modelo usado para todo el agente. Cambiar aquí si se quiere ajustar costo/calidad. */
export const MODELO = "claude-opus-5";
