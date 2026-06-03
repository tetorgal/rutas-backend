import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import * as qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';
import { PrismaService } from '../prisma/prisma.service';

type QrCodeTerminal = {
  generate: (text: string, opts?: { small?: boolean }) => void;
};

type VendedorRecord = {
  lid: string;
  nombreReal: string;
  activo: boolean;
};

type PrismaAccess = {
  vendedor: {
    findUnique: (args: {
      where: { lid: string };
    }) => Promise<VendedorRecord | null>;
  };
  solicitudAcceso: {
    upsert: (args: {
      where: { lid: string };
      update: { fecha: Date; nombreWa?: string | null };
      create: { lid: string; nombreWa?: string | null };
    }) => Promise<{ lid: string }>;
  };
};

const toText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const qrTerminal = qrcodeTerminal as QrCodeTerminal;

@Injectable()
export class WhatsappService implements OnModuleInit {
  public estadoConexion: 'DESCONECTADO' | 'ESPERANDO_QR' | 'CONECTADO' =
    'DESCONECTADO';
  public qrActual: string | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.iniciarBot();
  }

  private async iniciarBot() {
    const allowOwnMessages =
      (process.env.WHATSAPP_ALLOW_OWN_MESSAGES || '').toLowerCase() === 'true';

    const prisma = this.prisma as unknown as PrismaAccess;

    // 1. Manejo de Sesión (guarda tu login para no escanear el QR cada vez)
    const { state, saveCreds } =
      await useMultiFileAuthState('auth_info_baileys');

    // 2. Inicializar el socket directo a WhatsApp
    const sock = makeWASocket({
      auth: state,
      emitOwnEvents: true,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
    });

    // 3. Evento: Escuchar actualizaciones de conexión (Aquí mostramos el QR)
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('Escanea el siguiente QR con tu WhatsApp:');
        this.estadoConexion = 'ESPERANDO_QR';
        this.qrActual = qr;
        qrTerminal.generate(qr, { small: true });
      }

      if (connection == 'open') {
        this.estadoConexion = 'CONECTADO';
        this.qrActual = null;
        console.log('Bot de whatsapp conectado');
      }

      if (connection === 'close') {
        const lastError = lastDisconnect?.error;
        const statusCode =
          lastError && typeof lastError === 'object' && 'output' in lastError
            ? (lastError as { output?: { statusCode?: number } }).output
                ?.statusCode
            : undefined;

        this.estadoConexion = 'DESCONECTADO';
        this.qrActual = null;
        const reset = statusCode !== DisconnectReason.loggedOut;
        console.log('Conexión cerrada. ¿Reconectar?', reset);
        if (reset) {
          void this.iniciarBot(); // Intenta reconectar si no cerraste sesión manualmente
        }
      }
    });

    // Guarda las credenciales cada vez que cambien (cuando inicies sesión)
    sock.ev.on('creds.update', () => {
      void saveCreds();
    });

    // 4. Evento: Escuchar los mensajes entrantes
    sock.ev.on('messages.upsert', (m) => {
      void (async () => {
        const msg = m.messages?.[0];
        if (!msg) return;
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe;

        if (fromMe && !allowOwnMessages) return;
        if (
          !remoteJid ||
          remoteJid.includes('@g.us') ||
          remoteJid.includes('@newsletter') ||
          remoteJid.includes('@status') ||
          remoteJid.includes('status') ||
          remoteJid.includes('@broadcast')
        )
          return;
        const lidRemitente = remoteJid.split('@')[0];
        // let vendedorAutorizado: VendedorRecord | null = null;

        if (!fromMe) {
          const vendedor = await prisma.vendedor.findUnique({
            where: { lid: lidRemitente },
          });

          if (!vendedor || !vendedor.activo) {
            console.log('⛔ LID no autorizado. Enviando a sala de espera.', {
              remoteJid,
              lidRemitente,
            });

            await prisma.solicitudAcceso.upsert({
              where: { lid: lidRemitente },
              update: { fecha: new Date(), nombreWa: msg.pushName },
              create: { lid: lidRemitente, nombreWa: msg.pushName },
            });

            // await sock.sendMessage(remoteJid, {
            //   text: '👋 Hola. Este dispositivo no está registrado en el sistema. Le he notificado a tu supervisor. Por favor, pídele que apruebe tu acceso.',
            // });

            return;
          }

          // vendedorAutorizado = vendedor;
        }

        if (!msg?.message) return;

        const extendedText = msg.message.extendedTextMessage;
        const extendedTextAny = extendedText as
          | { canonicalUrl?: unknown; matchedText?: unknown }
          | undefined;
        const canonicalUrl = toText(extendedTextAny?.canonicalUrl);
        const matchedText = toText(extendedTextAny?.matchedText);
        const textoMensaje =
          toText(msg.message.conversation) ||
          toText(extendedText?.text) ||
          canonicalUrl ||
          matchedText ||
          '';

        // Ampliamos el filtro para cachar varios tipos de links de Google Maps
        const tieneLinkGoogleMaps =
          textoMensaje.includes('maps.app.goo.gl') ||
          textoMensaje.includes('goo.gl/maps') ||
          textoMensaje.includes('maps.google.com') ||
          textoMensaje.includes('google.com/maps');

        if (!tieneLinkGoogleMaps) return;

        console.log('📩 Upsert', {
          type: m.type,
          fromMe,
          remoteJid,
          hasMessage: Boolean(msg?.message),
          textoMensaje: textoMensaje.slice(0, 120),
        });

        if (msg?.message) {
          console.log('🧾 Payload keys', Object.keys(msg.message));
        }

        if (tieneLinkGoogleMaps) {
          console.log(`Mensaje recibido de: ${msg.pushName}`);

          if (!remoteJid) return;

          await sock.sendMessage(remoteJid, {
            text: '🤖 Analizando ubicación...',
          });

          const datosUbicacion = await this.obtenerCoordenadas(textoMensaje);
          if (datosUbicacion) {
            try {
              const lid = remoteJid.split('@')[0];
              const vendedorExiste = await this.prisma.vendedor.findUnique({
                where: { lid },
              });
              const nombreVendedor =
                vendedorExiste?.nombreReal || msg.pushName || 'Desconocido';
              // ---- GUARDAR EN BD ----
              const nuevoRegistro = await this.prisma.ubicacionReportada.create(
                {
                  data: {
                    nombre: datosUbicacion.nombre,
                    latitud: datosUbicacion.lat,
                    longitud: datosUbicacion.lng,
                    SAP: datosUbicacion.sap,
                    urlOriginal:
                      textoMensaje.match(/(https?:\/\/[^\s]+)/g)?.[0] || '',
                    vendedorLid: vendedorExiste ? lid : null,
                  },
                },
              );

              console.log('Prisma insert OK', {
                id: nuevoRegistro.id,
                nombre: nuevoRegistro.nombre,
              });

              console.log('Registro guardado en BD:', nuevoRegistro);

              await sock.sendMessage(remoteJid, {
                text: `Guardado correctamente!\n\n*Cliente:* ${nuevoRegistro.nombre}\n*SAP:* ${nuevoRegistro.SAP}\n*Vendedor:* ${nombreVendedor}\n*Coordenadas:* ${nuevoRegistro.latitud}, ${nuevoRegistro.longitud}`,
              });
            } catch (dbError) {
              console.error('Prisma insert FAIL', dbError);
              await sock.sendMessage(remoteJid, {
                text: 'Error interno al guardar la ubicación.',
              });
            }
          } else {
            await sock.sendMessage(remoteJid, {
              text: 'No pude extraer las coordenadas.',
            });
          }
        }
      })();
    });
  }
  private async obtenerCoordenadas(
    mensaje: string,
  ): Promise<{ nombre: string; lat: number; lng: number; sap: string } | null> {
    try {
      // 1. Extraer la URL del texto
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = mensaje.match(urlRegex);

      if (!urls) return null; // No hay URL en el mensaje

      const urlCorta = urls[0];

      // 2. Limpiar el nombre del cliente (todo lo que no es la URL)
      let nombreCliente = mensaje.replace(urlCorta, '').trim();

      // Intentar extraer el código SAP (ej: número de 5 a 12 dígitos)
      const sapMatch = nombreCliente.match(/\b\d{5,12}\b/);
      const sap = sapMatch ? sapMatch[0] : 'S/N';
      if (sapMatch) {
        nombreCliente = nombreCliente
          .replace(sapMatch[0], '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // 3. Hacer fetch a la URL corta para que Node siga la redirección
      const respuesta = await fetch(urlCorta);
      const urlFinal = respuesta.url; // Aquí está el enlace largo de Google Maps

      // 4. Extraer Latitud y Longitud con Regex (buscamos el patrón @lat,lng)
      const coordenadasRegex = /[@=](-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = urlFinal.match(coordenadasRegex);

      if (match) {
        return {
          nombre: nombreCliente || `Cliente ${sap}`,
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
          sap,
        };
      }

      return null; // Si no encontró coordenadas en la URL final
    } catch (error) {
      console.error('❌ Error al procesar el enlace:', error);
      return null;
    }
  }
}
