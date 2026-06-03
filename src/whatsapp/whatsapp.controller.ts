import { Controller, Get } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  obtenerEstado() {
    return {
      estado: this.whatsappService.estadoConexion as
        | keyof 'CONECTADO'
        | 'DESCONECTADO'
        | 'ESPERANDO_QR',
      qr: this.whatsappService.qrActual as string | null,
    };
  }
}
