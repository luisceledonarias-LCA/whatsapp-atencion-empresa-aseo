export type TipoMensaje = "texto" | "audio" | "imagen" | "otro";

export interface MensajeEntrante {
  /** ID del mensaje de WhatsApp, para trazabilidad y para marcarlo como leído. */
  id: string;
  /** Número del remitente (la trabajadora), formato internacional sin "+". */
  de: string;
  /** Nombre de perfil de WhatsApp del remitente, si viene disponible. */
  nombrePerfil?: string;
  tipo: TipoMensaje;
  /** Texto ya normalizado: el texto tal cual, o la transcripción si era audio. */
  texto?: string;
  /** Presente si tipo === "imagen". */
  media?: {
    mediaId: string;
    mimeType: string;
  };
  timestamp: number;
}

export type Categoria = "urgente" | "importante" | "normal";
export type TipoContenido = "procedimiento" | "horario_o_personal" | "evidencia_foto" | "urgencia" | "otro";

export interface ClasificacionMensaje {
  categoria: Categoria;
  tipo_contenido: TipoContenido;
  /** Respuesta que el bot puede enviar directo a la trabajadora. null si debe esperar a la supervisora. */
  respuesta_automatica: string | null;
  /** Si es true, se le avisa a la supervisora con un resumen. */
  escalar_a_supervisora: boolean;
  /** Resumen corto para el aviso a la supervisora (solo si escalar_a_supervisora es true). */
  resumen_para_supervisora: string | null;
}
