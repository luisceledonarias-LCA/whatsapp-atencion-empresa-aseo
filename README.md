# Agente de WhatsApp — Triage de mensajes internos

Agente que recibe los mensajes de WhatsApp que le llegan a una supervisora de
una empresa de aseo (de parte de sus trabajadoras), los clasifica con Claude
en **urgente / importante / normal**, responde automáticamente lo rutinario y
escala a la supervisora todo lo que requiere una persona.

## Qué hace

Por cada mensaje entrante (texto, nota de voz o imagen):

1. Si es audio, lo transcribe a texto.
2. Se clasifica con Claude en una categoría (`urgente` / `importante` /
   `normal`) y un tipo de contenido:
   - **`procedimiento`** → el bot responde directo usando la base de
     conocimiento (`src/ai/knowledgeBase.ts`).
   - **`horario_o_personal`** (turnos, permisos, temas personales) → el bot
     **nunca** responde el contenido; siempre se escala a la supervisora.
   - **`evidencia_foto`** → foto de un aseo realizado. Se guarda para el
     reporte mensual y se confirma recepción automáticamente.
   - **`urgencia`** → se avisa de inmediato a la supervisora.
   - **`otro`** → se escala como importante, salvo que sea un saludo simple.
3. Si corresponde, se envía la respuesta automática a la trabajadora.
4. Si corresponde, se le envía un resumen a la supervisora por WhatsApp.

Una vez al mes, `npm run report:mensual` genera un reporte HTML con todas las
fotos de aseos recibidas, agrupadas por trabajadora.

## Antes de partir: credenciales necesarias

### 1. WhatsApp Business Cloud API (Meta)

1. Crea una app en [developers.facebook.com](https://developers.facebook.com/apps)
   de tipo "Business", y agrégale el producto **WhatsApp**.
2. En **WhatsApp → API Setup** vas a encontrar:
   - Un **token de acceso temporal** (para probar; luego hay que generar uno
     permanente en Meta Business Suite).
   - El **Phone Number ID** del número de prueba (o de tu número dedicado, una
     vez que lo conectes ahí — esto se hace desde Meta Business Suite,
     agregando el número de WhatsApp Business que ya tiene tu señora).
3. Define tú mismo un `WHATSAPP_VERIFY_TOKEN` (cualquier texto secreto que
   inventes) — lo vas a poner tanto en tu `.env` como en la configuración del
   webhook en Meta.

### 2. Claude (Anthropic)

Una API key desde [console.anthropic.com](https://console.anthropic.com).

### 3. Transcripción de audio (OpenAI Whisper)

Claude no transcribe audio, así que las notas de voz se transcriben con la
API de OpenAI. Necesitas una API key desde
[platform.openai.com](https://platform.openai.com) y ponerla como
`OPENAI_API_KEY` (ver `.env.example`). Si prefieres otro proveedor de
voz-a-texto, reemplaza el contenido de `src/ai/transcribe.ts`.

## Puesta en marcha local

```bash
npm install
cp .env.example .env
# completa .env con tus credenciales reales
npm run dev
```

Para que Meta pueda llegar a tu servidor local durante las pruebas, expón el
puerto con [ngrok](https://ngrok.com/) (`ngrok http 3000`) y usa esa URL +
`/webhook` como "Callback URL" al configurar el webhook en Meta, junto con tu
`WHATSAPP_VERIFY_TOKEN`.

## Estructura del proyecto

```
src/
  server.ts              Servidor Express: recibe el webhook y orquesta todo
  config.ts               Variables de entorno
  types.ts                 Tipos compartidos
  whatsapp/
    client.ts              Enviar mensajes, descargar audio/imágenes
    webhookParser.ts        Parseo del payload de Meta
  ai/
    claude.ts               Cliente de Anthropic
    classify.ts              Clasificación del mensaje (categoría + respuesta)
    transcribe.ts             Transcripción de notas de voz
    knowledgeBase.ts          Procedimientos de la empresa (EDITAR con los reales)
  store/
    memoryStore.ts           Guardado de mensajes/fotos en disco (MVP)
  reports/
    monthlyReport.ts          Genera el reporte mensual de fotos
```

## Qué falta antes de usarlo en producción real

Este es un MVP funcional pero pensado para una sola empresa. Antes de un uso
serio conviene:

- **Base de datos real** (Postgres) en vez de archivos en disco
  (`src/store/memoryStore.ts`) — necesario también si en el futuro se quiere
  ofrecer esto a más de una empresa (multi-tenant).
- **Base de conocimiento editable** sin tocar código (hoy está hardcodeada en
  `src/ai/knowledgeBase.ts`).
- **Número de WhatsApp permanente**: el token temporal de Meta expira; hay
  que generar un token de sistema permanente en Meta Business Suite.
- **Reporte mensual automático**: hoy se corre a mano
  (`npm run report:mensual`); se puede programar con un cron y enviarlo por
  correo o WhatsApp.
- **Panel de administración** para que la supervisora vea el historial y
  edite la base de conocimiento sin necesitar a un programador.
- **Hosting**: este servidor debe quedar corriendo 24/7 en algún lado
  (Render, Railway, Fly.io, un VPS, etc.), no en tu computador.
