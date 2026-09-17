import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa tu archivo .env (usa .env.example como referencia).`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  whatsapp: {
    token: required("WHATSAPP_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: required("WHATSAPP_VERIFY_TOKEN"),
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
  },
  supervisoraNumber: required("SUPERVISORA_WHATSAPP_NUMBER"),
};
