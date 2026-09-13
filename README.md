# WhatsApp Scheduler 🚀

Sistema completo de programación y automatización de mensajes de WhatsApp con persistencia de sesión en la nube vía **MongoDB Atlas**, cola secuencial anti-baneo y preparado para despliegues 24/7 en **Render**.

---

## 🌟 Características Principales

- **Conexión Baileys Resiliente:** Integración con `@whiskeysockets/baileys` configurada con logger en silencio y reconexión automática en desconexiones temporales.
- **Persistencia de Sesión en MongoDB (`useMongoAuthState`):** Las credenciales (`creds`) y llaves criptográficas (`keys`) se almacenan directamente en una colección de MongoDB (`SessionModel`) usando `BufferJSON.replacer` y `BufferJSON.reviver`. Ideal para plataformas con disco efímero como **Render**, Heroku o Railway.
- **Lógica y Cola Anti-Ban:**
  - Cola secuencial asíncrona en memoria para evitar ráfagas masivas concurrentes.
  - Intervalos aleatorios humanizados entre **8 y 20 segundos** entre mensajes consecutivos.
  - Normalización automática de números telefónicos a formato internacional JID (`[numero]@s.whatsapp.net`).
- **Programador Automatizado (Cron Job):**
  - Tarea periódica de `node-cron` que evalúa cada minuto (`* * * * *`) mensajes pendientes en la base de datos.
  - Transición atómica de estados: `PENDIENTE` ➔ `PROCESANDO` ➔ `ENVIADO` o `ERROR` (con registro detallado del fallo).
- **Dashboard Web Moderno (SPA):**
  - Panel responsive sin dependencias externas pesadas.
  - Tarjeta de conexión en tiempo real con indicador dinámico y renderizado del **código QR en pantalla** (polling cada 4 segundos).
  - Formulario intuitivo de programación con selector de fecha/hora y contador de caracteres.
  - Tabla de historial y cola de mensajes con badges de estado y botón de cancelación/eliminación.
- **Keep-Alive para Render:**
  - Endpoint `GET /ping` que responde `PONG` para vincular con monitores como UptimeRobot o BetterStack y evitar que el contenedor gratuito entre en suspensión.

---

## 🛠️ Requisitos Previos

- **Node.js:** Versión `>= 18.0.0`
- **MongoDB Atlas:** Un cluster gratuito o de producción (URI de conexión `mongodb+srv://...`)
- **Cuenta de WhatsApp activa:** En tu teléfono móvil para escanear el código QR.

---

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd whatsapp-scheduler
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

   Edita `.env` con tu cadena de conexión a MongoDB Atlas:
   ```env
   MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.abcde.mongodb.net/whatsapp_scheduler?retryWrites=true&w=majority
   PORT=3000
   ```

4. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   O en modo desarrollo con reinicio automático:
   ```bash
   npm run dev
   ```

5. **Abrir el Panel de Control:**
   Accede a `http://localhost:3000` en tu navegador.
   - Si no hay sesión previa, se generará un código QR en pantalla.
   - En tu teléfono, abre WhatsApp > **Dispositivos vinculados** > **Vincular un dispositivo** y escanea el código.
   - La tarjeta cambiará inmediatamente a **"WhatsApp Conectado"**.

---

## 🚀 Despliegue en Render

1. **Subir el código a GitHub/GitLab:**
   Asegúrate de haber hecho commit de todos los archivos (`server.js`, `package.json`, `.npmrc`, `public/`, etc.).
   *(El archivo `.gitignore` ya excluye `.env` y `node_modules`)*.

2. **Crear un nuevo Web Service en Render:**
   - Ve al panel de [Render](https://render.com/) y haz clic en **New +** > **Web Service**.
   - Conecta tu repositorio de GitHub.
   - Configura los parámetros:
     - **Name:** `whatsapp-scheduler`
     - **Region:** Elige la más cercana a tus usuarios o a tu cluster de Mongo Atlas.
     - **Branch:** `main` (o `master`)
     - **Runtime:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free o Starter.

3. **Configurar Variables de Entorno en Render:**
   En la sección **Environment Variables** del servicio, añade:
   - `MONGO_URI`: `mongodb+srv://...` (tu cadena de conexión con permisos de lectura/escritura y acceso de red 0.0.0.0/0 habilitado en Mongo Atlas).
   - *(Opcional)* `PORT`: `3000` (Render asigna `PORT` automáticamente si se omite).

4. **Desplegar y Vincular:**
   - Haz clic en **Create Web Service**.
   - Espera a que los logs indiquen `[Servidor] Servidor ejecutándose exitosamente`.
   - Abre la URL pública que te proporciona Render (ej: `https://whatsapp-scheduler-xxxx.onrender.com`).
   - Escanea el código QR directamente desde el navegador para vincular tu WhatsApp.

---

## ⏱️ Mantener el Servicio Activo 24/7 (UptimeRobot)

El plan gratuito de Render suspende los contenedores tras 15 minutos de inactividad entrante. Para evitar esto y asegurar que el cron job de mensajes se ejecute siempre a tiempo:

1. Ve a [UptimeRobot](https://uptimerobot.com/) (es gratis).
2. Haz clic en **Add New Monitor**.
3. Configura:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `WhatsApp Scheduler Ping`
   - **URL (or IP):** `https://tu-app-en-render.onrender.com/ping`
   - **Monitoring Interval:** `Every 5 minutes` (o 10 minutos).
4. Guarda el monitor. El endpoint `/ping` responderá con código `200 OK` y el texto `PONG`, manteniendo el contenedor activo de forma continua.

---

## 📡 Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/ping` | Endpoint de salud y Keep-Alive (responde `200 PONG`). |
| `GET` | `/api/status` | Devuelve `{ connected: boolean, qr: string \| null }`. |
| `GET` | `/api/messages` | Retorna los últimos 100 mensajes registrados en la base de datos. |
| `POST` | `/api/messages` | Recibe `{ phone, message, scheduledAt }` y crea un mensaje programado (`status: 'PENDIENTE'`). |
| `DELETE` | `/api/messages/:id` | Cancela y elimina un mensaje programado por su ID. |

---

## 🛡️ Estructura del Proyecto

```text
whatsapp-scheduler/
├── .env.example          # Plantilla de variables de entorno
├── .gitignore            # Exclusión de archivos sensibles y temporales
├── .npmrc                # Configuración de compatibilidad para paquetes git (libsignal)
├── package.json          # Metadatos, dependencias (Node >= 18.0.0) y scripts
├── server.js             # Servidor Express, Baileys, MongoDB Auth, Cola Anti-ban y Cron
├── public/
│   └── index.html        # Dashboard SPA responsivo con Vanilla JS y CSS moderno
└── README.md             # Documentación técnica completa
```
