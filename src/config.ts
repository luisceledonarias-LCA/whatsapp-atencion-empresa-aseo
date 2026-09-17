import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa tu archivo .env (usa .env.example como referencia).`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Las credenciales de WhatsApp son opcionales al arrancar: así se puede
  // usar el simulador (/) solo con la clave de Claude, antes de tener el
  // número de WhatsApp Business conectado. Quedan validadas recién al
  // intentar usarlas (ver whatsapp/client.ts).
  whatsapp: {
    token: optional("WHATSAPP_TOKEN"),
    phoneNumberId: optional("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: optional("WHATSAPP_VERIFY_TOKEN"),
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
  },
  supervisoraNumber: optional("SUPERVISORA_WHATSAPP_NUMBER"),
};
