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

const qrTerminal = qrcodeTerminal as QrCodeTerminal;

@Injectable()
export class WhatsappService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}
  async onModuleInit() {
    await this.iniciarBot();
  }

  private async iniciarBot() {
    const allowedNumbers = new Set(
      (process.env.WHATSAPP_ALLOWED_NUMBERS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const allowOwnMessages =
      (process.env.WHATSAPP_ALLOW_OWN_MESSAGES || '').toLowerCase() === 'true';

    // 1. Manejo de Sesión (guarda tu login para no escanear el QR cada vez)
    const { state, saveCreds } =
      await useMultiFileAuthState('auth_info_baileys');

    // 2. Inicializar el socket directo a WhatsApp
    const sock = makeWASocket({
      auth: state,
      emitOwnEvents: true,
      printQRInTerminal: false, // Lo apagamos porque usaremos qrcode-terminal que se ve mejor
      logger: pino({ level: 'silent' }), // Apaga los logs internos para no ensuciar tu consola
    });

    // 3. Evento: Escuchar actualizaciones de conexión (Aquí mostramos el QR)
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('Scan el siguiente QR con tu WhatsApp:');
        qrTerminal.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const lastError = lastDisconnect?.error as
          | { output?: { statusCode?: number } }
          | undefined;
        const reset =
          lastError?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexión cerrada. ¿Reconectar?', reset);
        if (reset) {
          void this.iniciarBot(); // Intenta reconectar si no cerraste sesión manualmente
        }
      } else if (connection === 'open') {
        console.log(
          '✅ Bot de WhatsApp (Baileys) iniciado y conectado correctamente',
        );
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
        const remoteJid = msg?.key?.remoteJid;
        const fromMe = msg?.key?.fromMe;
        const numero = remoteJid?.split('@')[0] || '';

        if (fromMe && !allowOwnMessages) return;
        if (!remoteJid || remoteJid.includes('@g.us')) return;
        if (allowedNumbers.size > 0 && !allowedNumbers.has(numero)) {
          return;
        }

        if (!msg?.message) return;

        const extendedText = msg.message.extendedTextMessage;
        const extendedTextAny = extendedText as
          | { canonicalUrl?: string; matchedText?: string }
          | undefined;
        const textoMensaje =
          msg.message.conversation ||
          extendedText?.text ||
          extendedTextAny?.canonicalUrl ||
          extendedTextAny?.matchedText ||
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
          console.log(`📍 Mensaje recibido de: ${msg.pushName}`);

          if (!remoteJid) return;

          await sock.sendMessage(remoteJid, {
            text: '🤖 Analizando ubicación...',
          });

          const datosUbicacion = await this.obtenerCoordenadas(textoMensaje);
          if (datosUbicacion) {
            try {
              // ---- GUARDAR EN POSTGRESQL ----
              const nuevoRegistro = await this.prisma.ubicacionReportada.create(
                {
                  data: {
                    nombre: datosUbicacion.nombre,
                    latitud: datosUbicacion.lat,
                    longitud: datosUbicacion.lng,
                    urlOriginal:
                      textoMensaje.match(/(https?:\/\/[^\s]+)/g)?.[0] || '',
                    telefonoVendedor: remoteJid.split('@')[0],
                    nombreVendedor: msg.pushName || 'Desconocido',
                  },
                },
              );

              console.log('✅ Prisma insert OK', {
                id: nuevoRegistro.id,
                nombre: nuevoRegistro.nombre,
              });

              console.log('💾 Registro guardado en BD:', nuevoRegistro);

              await sock.sendMessage(remoteJid, {
                text: `✅ Guardado correctamente!\n\n*Cliente:* ${nuevoRegistro.nombre}\n*Vendedor:* ${nuevoRegistro.nombreVendedor}\n*Coordenadas:* ${nuevoRegistro.latitud}, ${nuevoRegistro.longitud}`,
              });
            } catch (dbError) {
              console.error('❌ Prisma insert FAIL', dbError);
              await sock.sendMessage(remoteJid, {
                text: '❌ Error interno al guardar la ubicación.',
              });
            }
          } else {
            await sock.sendMessage(remoteJid, {
              text: '❌ No pude extraer las coordenadas.',
            });
          }
        }
      })();
    });
  }
  private async obtenerCoordenadas(
    mensaje: string,
  ): Promise<{ nombre: string; lat: number; lng: number } | null> {
    try {
      // 1. Extraer la URL del texto usando una expresión regular
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = mensaje.match(urlRegex);

      if (!urls) return null; // No hay URL en el mensaje

      const urlCorta = urls[0];

      // 2. Limpiar el nombre del cliente (todo lo que no es la URL)
      const nombreCliente = mensaje.replace(urlCorta, '').trim();

      // 3. Hacer fetch a la URL corta para que Node siga la redirección
      const respuesta = await fetch(urlCorta);
      const urlFinal = respuesta.url; // Aquí está el enlace largo de Google Maps

      // 4. Extraer Latitud y Longitud con Regex (buscamos el patrón @lat,lng)
      const coordenadasRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = urlFinal.match(coordenadasRegex);

      if (match) {
        return {
          nombre: nombreCliente || 'Cliente sin nombre',
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
        };
      }

      return null; // Si no encontró coordenadas en la URL final
    } catch (error) {
      console.error('❌ Error al procesar el enlace:', error);
      return null;
    }
  }
}
