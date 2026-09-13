require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const {
  default: makeWASocket,
  DisconnectReason,
  BufferJSON,
  initAuthCreds,
  proto,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');

// ==========================================
// 1. CONFIGURACIÓN Y VALIDACIONES
// ==========================================
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('\x1b[31m[ERROR CRÍTICO]\x1b[0m MONGO_URI no está definida en las variables de entorno.');
  console.error('Por favor, configure MONGO_URI en su archivo .env o en el panel de Render.');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. MODELOS DE MONGODB
// ==========================================
const SessionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    data: { type: String, required: true }
  },
  { timestamps: true }
);
const SessionModel = mongoose.model('Session', SessionSchema);

const MessageSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    message: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ERROR'],
      default: 'PENDIENTE'
    },
    sentAt: { type: Date },
    error: { type: String }
  },
  { timestamps: true }
);
const MessageModel = mongoose.model('Message', MessageSchema);

// ==========================================
// 3. ESTADO GLOBAL DE WHATSAPP Y COLA
// ==========================================
const whatsappState = {
  connected: false,
  qr: null,
  sock: null,
  isReconnecting: false
};

const messageQueue = [];
let isProcessingQueue = false;

// ==========================================
// 4. ADAPTADOR AUTH DE BAILEYS EN MONGODB
// ==========================================
async function useMongoAuthState() {
  const writeData = async (data, key) => {
    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await SessionModel.findByIdAndUpdate(
        key,
        { data: serialized },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`[MongoAuth] Error guardando clave ${key}:`, err.message);
    }
  };

  const readData = async (key) => {
    try {
      const doc = await SessionModel.findById(key);
      if (!doc || !doc.data) return null;
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch (err) {
      console.error(`[MongoAuth] Error leyendo clave ${key}:`, err.message);
      return null;
    }
  };

  const removeData = async (key) => {
    try {
      await SessionModel.findByIdAndDelete(key);
    } catch (err) {
      console.error(`[MongoAuth] Error eliminando clave ${key}:`, err.message);
    }
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              const key = `${type}-${id}`;
              let value = await readData(key);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    }
  };
}

// ==========================================
// 5. GESTIÓN DEL SOCKET DE WHATSAPP
// ==========================================
async function connectWhatsApp() {
  if (whatsappState.isReconnecting) return;
  whatsappState.isReconnecting = true;

  try {
    const { state, saveCreds } = await useMongoAuthState();
    const logger = pino({ level: 'silent' });

    // CRÍTICO: makeCacheableSignalKeyStore mantiene las claves en caché de memoria
    // evitando desincronizaciones criptográficas que provocan "Waiting for this message"
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      logger,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true
    });

    whatsappState.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          whatsappState.qr = await QRCode.toDataURL(qr);
          whatsappState.connected = false;
          console.log('[WhatsApp] Nuevo código QR generado para escaneo.');
        } catch (err) {
          console.error('[WhatsApp] Error convirtiendo QR a Base64:', err.message);
        }
      }

      if (connection === 'open') {
        whatsappState.connected = true;
        whatsappState.qr = null;
        whatsappState.isReconnecting = false;
        console.log('\x1b[32m[WhatsApp] Conexión establecida con éxito!\x1b[0m');
      }

      if (connection === 'close') {
        whatsappState.connected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`[WhatsApp] Conexión cerrada. Código: ${statusCode}, loggedOut: ${isLoggedOut}`);

        if (isLoggedOut) {
          console.log('[WhatsApp] Sesión desvinculada por el usuario. Limpiando credenciales en MongoDB...');
          try {
            await SessionModel.deleteMany({});
            whatsappState.qr = null;
          } catch (err) {
            console.error('[WhatsApp] Error limpiando sesión en MongoDB:', err.message);
          }
          whatsappState.isReconnecting = false;
          setTimeout(connectWhatsApp, 2000);
        } else {
          whatsappState.isReconnecting = false;
          console.log('[WhatsApp] Desconexión temporal. Reintentando conexión en 5 segundos...');
          setTimeout(connectWhatsApp, 5000);
        }
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Error durante la inicialización del socket:', error);
    whatsappState.isReconnecting = false;
    setTimeout(connectWhatsApp, 5000);
  }
}

// ==========================================
// 6. COLA SECUENCIAL Y LÓGICA ANTI-BAN
// ==========================================
function normalizePhone(phone) {
  const cleanPhone = phone.toString().replace(/\D/g, '');
  return `${cleanPhone}@s.whatsapp.net`;
}

function getRandomDelay(min = 8000, max = 20000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue.shift();

    try {
      if (!whatsappState.connected || !whatsappState.sock) {
        throw new Error('WhatsApp no está conectado');
      }

      const cleanPhone = item.phone.toString().replace(/\D/g, '');
      let targetJid = `${cleanPhone}@s.whatsapp.net`;

      // 1. Resolver el JID canónico registrado en WhatsApp
      try {
        const [result] = await whatsappState.sock.onWhatsApp(targetJid);
        if (result && result.exists) {
          targetJid = result.jid;
        }
      } catch (checkErr) {
        console.warn(`[WhatsApp] No se pudo comprobar existencia de ${cleanPhone}:`, checkErr.message);
      }

      console.log(`[Cola] Preparando handshake para ${cleanPhone} (JID: ${targetJid})...`);

      // 2. Handshake y suscripción de presencia para calentar el canal E2EE
      // Esto elimina el problema "Waiting for this message. This may take a while"
      try {
        await whatsappState.sock.presenceSubscribe(targetJid);
        await sleep(500);
        await whatsappState.sock.sendPresenceUpdate('composing', targetJid);
        await sleep(1500);
        await whatsappState.sock.sendPresenceUpdate('paused', targetJid);
      } catch (presenceErr) {
        // No bloqueante
      }

      // 3. Envío del mensaje
      await whatsappState.sock.sendMessage(targetJid, { text: item.message });

      await MessageModel.findByIdAndUpdate(item._id, {
        status: 'ENVIADO',
        sentAt: new Date(),
        error: null
      });

      console.log(`\x1b[32m[Cola] Mensaje ID ${item._id} enviado con éxito a ${item.phone}\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m[Cola] Error al enviar mensaje ID ${item._id} a ${item.phone}:\x1b[0m`, err.message);

      await MessageModel.findByIdAndUpdate(item._id, {
        status: 'ERROR',
        error: err.message
      });
    }

    if (messageQueue.length > 0) {
      const delayMs = getRandomDelay(8000, 20000);
      console.log(`[Anti-Ban] Pausando envío por ${(delayMs / 1000).toFixed(1)} segundos para proteger la cuenta...`);
      await sleep(delayMs);
    }
  }

  isProcessingQueue = false;
}

// ==========================================
// 7. PROGRAMADOR DE TAREAS (CRON JOB)
// ==========================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    const dueMessages = await MessageModel.find({
      status: 'PENDIENTE',
      scheduledAt: { $lte: now }
    });

    if (dueMessages.length === 0) {
      return;
    }

    console.log(`[Cron] Se encontraron ${dueMessages.length} mensaje(s) listos para enviar.`);

    for (const msg of dueMessages) {
      await MessageModel.findByIdAndUpdate(msg._id, { status: 'PROCESANDO' });
      messageQueue.push(msg);
    }

    processQueue();
  } catch (err) {
    console.error('[Cron] Error en la ejecución del cron programador:', err.message);
  }
});

// ==========================================
// 8. RUTAS DE LA API
// ==========================================
app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

app.get('/api/status', (req, res) => {
  res.json({
    connected: whatsappState.connected,
    qr: whatsappState.qr
  });
});

app.post('/api/messages', async (req, res) => {
  try {
    const { phone, message, scheduledAt } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'El número de teléfono es obligatorio.' });
    }

    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'El número de teléfono es inválido o demasiado corto.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío.' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ error: 'Debe especificar una fecha y hora programada.' });
    }

    // scheduledAt viene en formato ISO estándar desde el frontend con su UTC correcto
    const scheduleDate = new Date(scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido.' });
    }

    const newMessage = await MessageModel.create({
      phone: cleanPhone,
      message: message.trim(),
      scheduledAt: scheduleDate,
      status: 'PENDIENTE'
    });

    // Si la fecha programada es inmediata o menor al instante actual, procesar de inmediato
    if (scheduleDate <= new Date()) {
      await MessageModel.findByIdAndUpdate(newMessage._id, { status: 'PROCESANDO' });
      newMessage.status = 'PROCESANDO';
      messageQueue.push(newMessage);
      processQueue();
    }

    res.status(201).json({
      success: true,
      message: 'Mensaje programado exitosamente.',
      data: newMessage
    });
  } catch (err) {
    console.error('[API] Error al crear mensaje programado:', err.message);
    res.status(500).json({ error: 'Error interno al guardar el mensaje programado.' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await MessageModel.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    console.error('[API] Error al obtener mensajes:', err.message);
    res.status(500).json({ error: 'Error al consultar el historial de mensajes.' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const queueIndex = messageQueue.findIndex((item) => item._id.toString() === id);
    if (queueIndex !== -1) {
      messageQueue.splice(queueIndex, 1);
    }

    const deleted = await MessageModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'El mensaje especificado no fue encontrado.' });
    }

    res.json({
      success: true,
      message: 'Mensaje cancelado y eliminado con éxito.'
    });
  } catch (err) {
    console.error('[API] Error al eliminar mensaje:', err.message);
    res.status(500).json({ error: 'Error interno al cancelar el mensaje.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 9. ARRANQUE DEL SERVIDOR Y BASE DE DATOS
// ==========================================
async function startServer() {
  if (!MONGO_URI) {
    console.warn('\x1b[33m[AVISO] Servidor web iniciado pero WhatsApp permanecerá en pausa hasta configurar MONGO_URI.\x1b[0m');
    app.listen(PORT, () => {
      console.log(`[Servidor] Escuchando en http://localhost:${PORT}`);
    });
    return;
  }

  try {
    console.log('[MongoDB] Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('\x1b[32m[MongoDB] Conexión exitosa a la base de datos!\x1b[0m');

    connectWhatsApp();

    app.listen(PORT, () => {
      console.log(`\x1b[32m[Servidor] Servidor ejecutándose exitosamente en el puerto ${PORT}\x1b[0m`);
      console.log(`[Servidor] Panel de control: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('\x1b[31m[MongoDB] Error crítico de conexión a MongoDB:\x1b[0m', err.message);
    process.exit(1);
  }
}

startServer();
